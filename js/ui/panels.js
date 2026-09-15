// =====================================================
// js/ui/panels.js
// แผงเมนูที่เลื่อนขึ้นมาทับแผนที่: กระเป๋า / อุปกรณ์+ตีบวก / สมุดสะสม / ตั้งค่า
// ระหว่างเปิดแผง main.js จะหยุดเวลาในโลก (มอนเตอร์ไม่ตีระหว่างจัดของ)
//
// ปุ่มในแผงใช้ data-action แล้วดักคลิกที่ตัวแผงจุดเดียว
// จึงวาดแผงใหม่ได้บ่อยๆ โดยไม่ต้องผูก event ซ้ำ
// =====================================================

import { state } from "../state.js";
import { ITEMS, RARITIES, ITEM_TYPES, EQUIPMENT_SLOTS, getCollectionItems } from "../systems/itemDatabase.js";
import {
  countMaterial, findEquipment, isEquipped, equip, unequip, canEquip,
  sellMaterial, sellEquipment, getEquipmentSellPrice
} from "../systems/inventory.js";
import { getCollectionSummary, getItemSources, isDiscovered } from "../systems/collection.js";
import { getRewardStatuses, claimReward, countClaimableRewards } from "../systems/collectionRewards.js";
import { MAX_PLUS, getUpgradeCost, upgradeEquipment } from "../systems/upgrade.js";
import { getPlayerStats, getEquipmentStats } from "../systems/stats.js";
import { markDirty, saveGame, resetGame, getSaveStatusText } from "../save.js";
import { showToast } from "./hud.js";

const $ = (id) => document.getElementById(id);

const PANEL_TITLES = {
  inventory: "🎒 กระเป๋า",
  equipment: "🛡️ อุปกรณ์และตีบวก",
  collection: "📖 สมุดสะสม",
  settings: "⚙️ ตั้งค่า"
};

// ประเภทที่มีแท็บในกระเป๋าเสมอ (ประเภทอื่นจะโผล่เมื่อมีของ)
const MAIN_TYPES = ["weapon", "armor", "consumable", "material", "collectible"];

let currentPanel = null;
let selectedUid = null;
let resetArmedUntil = 0;
let hooks = {};
let inventoryTab = "all";   // "all" หรือ type ของไอเทม
let collectionTab = "all";
let inspected = null;       // ไอเทมที่กำลังดูรายละเอียด { itemId, uid } (uid = null ถ้าไม่ใช่อุปกรณ์)

export function isPanelOpen() {
  return currentPanel !== null;
}

export function openPanel(name) {
  if (name !== currentPanel) inspected = null;
  currentPanel = name;
  hooks.onOpen?.();
  $("panel-overlay").hidden = false;
  document.querySelectorAll(".menu-button[data-panel]").forEach((button) => {
    button.classList.toggle("active", button.dataset.panel === name);
  });
  renderPanel();
}

export function closePanel() {
  currentPanel = null;
  $("panel-overlay").hidden = true;
  document.querySelectorAll(".menu-button[data-panel]").forEach((button) => button.classList.remove("active"));
}

export function initPanels(options) {
  hooks = options;

  document.querySelectorAll(".menu-button[data-panel]").forEach((button) => {
    button.addEventListener("click", () => {
      if (currentPanel === button.dataset.panel) closePanel();
      else openPanel(button.dataset.panel);
    });
  });

  $("panel-close").addEventListener("click", closePanel);
  $("panel-overlay").addEventListener("click", (event) => {
    if (event.target.id === "panel-overlay") closePanel();
  });
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && currentPanel) closePanel();
  });

  $("panel-body").addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (button && !button.disabled) handleAction(button.dataset);
  });
}

// =====================================================
// ปุ่มต่างๆ ในแผง
// =====================================================
function handleAction({ action, uid, slot, itemId, qty, tab, rewardId }) {
  const itemUid = uid === undefined ? null : Number(uid);

  switch (action) {
    case "equip": {
      const result = equip(itemUid);
      if (result.reason === "level") showToast(`🔒 ต้อง Lv.${result.required} ถึงจะสวมได้ (ตอนนี้ Lv.${state.player.level})`);
      break;
    }

    case "claim-reward": {
      const result = claimReward(rewardId);
      if (result.ok) {
        showToast("🏆 รับรางวัล " + result.reward.name + ": " + rewardText(result.reward));
        saveGame();
      }
      refreshCollectionAlert();
      break;
    }

    case "unequip":
      unequip(slot);
      break;

    case "sell-equipment": {
      const gold = sellEquipment(itemUid);
      if (gold > 0) showToast("ขายแล้ว +" + gold + " 🪙");
      if (selectedUid === itemUid) selectedUid = null;
      break;
    }

    case "sell-material": {
      const amount = qty === "all" ? countMaterial(itemId) : 1;
      const gold = sellMaterial(itemId, amount);
      if (gold > 0) showToast("ขาย " + ITEMS[itemId].name + " ×" + amount + " +" + gold + " 🪙");
      break;
    }

    case "use-item":
      hooks.onUseItem?.(itemId);
      break;

    // ---- ปุ่มที่เปลี่ยนแค่หน้าจอ ไม่ต้องเซฟ ----
    case "inventory-tab":
      inventoryTab = tab;
      inspected = null;
      renderPanel();
      return;

    case "collection-tab":
      collectionTab = tab;
      inspected = null;
      renderPanel();
      return;

    case "inspect":
      // แตะชิ้นเดิมซ้ำ = ปิดรายละเอียด
      inspected = inspected?.itemId === itemId && inspected?.uid === itemUid ? null : { itemId, uid: itemUid };
      renderPanel();
      $("panel-body").scrollTop = 0;   // กล่องรายละเอียดอยู่ด้านบน
      return;

    case "close-inspect":
      inspected = null;
      renderPanel();
      return;

    case "select-upgrade":
      selectedUid = itemUid;
      openPanel("equipment");
      return;

    case "upgrade":
      showUpgradeResult(upgradeEquipment(itemUid));
      break;

    case "save-now":
      showToast(saveGame() ? "บันทึกแล้ว" : "บันทึกไม่สำเร็จ");
      break;

    case "reset":
      // กดสองครั้งภายใน 3 วินาทีเพื่อยืนยัน (ไม่ใช้ confirm() ของเบราว์เซอร์)
      if (Date.now() > resetArmedUntil) {
        resetArmedUntil = Date.now() + 3000;
        showToast("กด “เริ่มเกมใหม่” อีกครั้งเพื่อยืนยัน");
        break;
      }
      resetArmedUntil = 0;
      selectedUid = null;
      inspected = null;
      resetGame();
      closePanel();
      hooks.onReset?.();
      return;
  }

  markDirty();
  renderPanel();
}

function showUpgradeResult(result) {
  if (!result.ok) {
    const reasons = {
      gold: "ทองไม่พอ",
      stones: "หินตีบวกไม่พอ — ตีมอนเตอร์เพื่อหาเพิ่ม",
      maxed: "ตีบวกถึงระดับสูงสุดแล้ว",
      notFound: "ไม่พบอุปกรณ์ชิ้นนี้"
    };
    showToast(reasons[result.reason]);
    return;
  }

  showToast(result.success ? "✨ ตีบวกสำเร็จ! เป็น +" + result.plus : "💥 ตีบวกไม่สำเร็จ (อุปกรณ์ไม่แตก)");
}

// =====================================================
// วาดแผง
// =====================================================
export function renderPanel() {
  if (!currentPanel) return;

  $("panel-title").textContent = PANEL_TITLES[currentPanel];
  const renderers = {
    inventory: renderInventory,
    equipment: renderEquipment,
    collection: renderCollection,
    settings: renderSettings
  };
  $("panel-body").innerHTML = renderers[currentPanel]();
}

function itemName(item) {
  const def = ITEMS[item.itemId];
  const plus = item.plus > 0 ? ` +${item.plus}` : "";
  return `<span style="color:${RARITIES[def.rarity].color}">${def.name}${plus}</span>`;
}

function statText(item) {
  const bonus = getEquipmentStats(item);
  return [
    bonus.atk ? `⚔️ ${bonus.atk}` : "",
    bonus.def ? `🛡️ ${bonus.def}` : "",
    bonus.hp ? `❤️ ${bonus.hp}` : ""
  ].filter(Boolean).join(" · ");
}

function tabButton(action, value, label, current) {
  return `<button class="tab-chip ${value === current ? "active" : ""}" data-action="${action}" data-tab="${value}">${label}</button>`;
}

// ---------- กระเป๋า ----------
const EMPTY_TEXT = {
  weapon: "ยังไม่มีอาวุธ",
  armor: "ยังไม่มีเกราะ",
  consumable: "ยังไม่มีของใช้ — มอนเตอร์มีโอกาสดรอปยา",
  material: "ตีมอนเตอร์เพื่อเก็บวัตถุดิบ",
  collectible: "ยังไม่มีของสะสม — ลองตีมอนเตอร์หลายๆ แบบ"
};

function renderInventory() {
  // รวมของทุกชิ้นเป็นรายการเดียว แล้วแยกตามประเภทใน Item Database
  const equipment = [...state.inventory.equipment].sort(
    (a, b) => Number(isEquipped(b.uid)) - Number(isEquipped(a.uid)) || b.plus - a.plus
  );
  const entries = [
    ...equipment.map((item) => ({ def: ITEMS[item.itemId], html: equipmentRow(item) })),
    ...Object.entries(state.inventory.materials).map(([itemId, qty]) => ({ def: ITEMS[itemId], html: stackableRow(itemId, qty) }))
  ];

  const countByType = {};
  for (const { def } of entries) countByType[def.type] = (countByType[def.type] ?? 0) + 1;

  const tabTypes = Object.keys(ITEM_TYPES).filter((type) => MAIN_TYPES.includes(type) || countByType[type]);
  if (inventoryTab !== "all" && !tabTypes.includes(inventoryTab)) inventoryTab = "all";

  const tabs = [
    tabButton("inventory-tab", "all", `ทั้งหมด ${entries.length}`, inventoryTab),
    ...tabTypes.map((type) => tabButton(
      "inventory-tab", type, `${ITEM_TYPES[type].icon} ${ITEM_TYPES[type].name} ${countByType[type] ?? 0}`, inventoryTab
    ))
  ].join("");

  const sections = tabTypes
    .filter((type) => inventoryTab === "all" || inventoryTab === type)
    .map((type) => {
      const rows = entries.filter((entry) => entry.def.type === type).map((entry) => entry.html).join("");
      if (!rows && inventoryTab === "all") return "";   // หน้า "ทั้งหมด" ไม่ต้องโชว์หมวดที่ว่าง
      return `
        <h4 class="panel-section">${ITEM_TYPES[type].icon} ${ITEM_TYPES[type].name} (${countByType[type] ?? 0})</h4>
        ${rows || `<p class="empty-text">${EMPTY_TEXT[type] ?? "ยังไม่มีไอเทมประเภทนี้"}</p>`}`;
    }).join("");

  return `
    <div class="tab-row">${tabs}</div>
    ${renderItemDetail()}
    ${sections || '<p class="empty-text">กระเป๋าว่าง — ตีมอนเตอร์เพื่อเก็บของ</p>'}
    <p class="hint-text">แตะชื่อไอเทมเพื่อดูรายละเอียด</p>`;
}

function equipmentRow(item) {
  const def = ITEMS[item.itemId];
  const equipped = isEquipped(item.uid);
  const locked = !canEquip(item.itemId);

  let equipButton = `<button class="mini-button primary" data-action="equip" data-uid="${item.uid}">สวม</button>`;
  if (equipped) equipButton = `<button class="mini-button" data-action="unequip" data-slot="${def.slot}">ถอด</button>`;
  else if (locked) equipButton = `<button class="mini-button" disabled>🔒 Lv.${def.levelRequirement}</button>`;

  return `
      <div class="item-row">
        <span class="item-icon">${def.icon}</span>
        <div class="item-info" data-action="inspect" data-item-id="${def.id}" data-uid="${item.uid}">
          <p class="item-name">${itemName(item)} ${equipped ? '<span class="badge">สวมอยู่</span>' : ""}</p>
          <p class="item-meta">${[EQUIPMENT_SLOTS[def.slot] ?? ITEM_TYPES[def.type].name, statText(item), levelText(def)].filter(Boolean).join(" · ")}</p>
        </div>
        <div class="item-actions">
          ${equipButton}
          <button class="mini-button" data-action="select-upgrade" data-uid="${item.uid}">ตีบวก</button>
          ${equipped ? "" : `<button class="mini-button" data-action="sell-equipment" data-uid="${item.uid}">ขาย ${getEquipmentSellPrice(item)}🪙</button>`}
        </div>
      </div>`;
}

// แถวของไอเทมที่ซ้อนได้ — ของใช้มีปุ่ม "ใช้" / ของที่ขายไม่ได้ไม่มีปุ่มขาย / ถึง maxStack มีป้าย "เต็ม"
function stackableRow(itemId, qty) {
  const def = ITEMS[itemId];
  const usable = def.type === "consumable";
  const full = qty >= def.maxStack;
  const meta = [
    usable ? def.description : "",
    usable ? levelText(def) : "",
    def.isSellable ? `ขายชิ้นละ ${def.sellPrice} 🪙` : "ขายไม่ได้"
  ].filter(Boolean).join(" · ");

  return `
      <div class="item-row">
        <span class="item-icon">${def.icon}</span>
        <div class="item-info" data-action="inspect" data-item-id="${itemId}">
          <p class="item-name">
            <span style="color:${RARITIES[def.rarity].color}">${def.name}</span> ×${qty}
            ${full ? `<span class="badge full">เต็ม ${def.maxStack}</span>` : ""}
          </p>
          <p class="item-meta">${meta}</p>
        </div>
        <div class="item-actions">
          ${usable ? `<button class="mini-button primary" data-action="use-item" data-item-id="${itemId}">ใช้</button>` : ""}
          ${def.isSellable ? `
          <button class="mini-button" data-action="sell-material" data-item-id="${itemId}" data-qty="1">ขาย 1</button>
          <button class="mini-button" data-action="sell-material" data-item-id="${itemId}" data-qty="all">ขายหมด</button>` : ""}
        </div>
      </div>`;
}

// ---------- รายละเอียดไอเทม (ใช้ทั้งในกระเป๋าและสมุดสะสม) ----------
const STAT_LABELS = {
  attack: "⚔️ ATK", defense: "🛡️ DEF", hp: "❤️ HP",
  critical: "💥 คริ", attackSpeed: "⚡ ความเร็วตี", criticalResistance: "🧱 ต้านคริ"
};
const PERCENT_STATS = ["critical", "attackSpeed", "criticalResistance"];
const EFFECT_LABELS = { hp: "❤️ HP", mp: "🔷 MP", exp: "✨ EXP" };
const COLLECTIBLE_KIND_NAMES = { badge: "เหรียญตรา", trophy: "ถ้วยรางวัล", relic: "ของโบราณ" };

const formatStat = (key, value) => (PERCENT_STATS.includes(key) ? `${Math.round(value * 100)}%` : value);
const formatChance = (chance) => `${Math.round(chance * 1000) / 10}%`;

function effectText(effect) {
  if (effect.type === "buff") {
    return `บัฟ ${STAT_LABELS[effect.stat] ?? effect.stat} +${formatStat(effect.stat, effect.amount)} (${effect.duration} วิ)`;
  }
  return `${EFFECT_LABELS[effect.type]} +${effect.amount}`;
}

// detailed = true → "🐺 หมาป่า (🌲 ป่าลึก) 8%"  /  false → "🐺 หมาป่า" (สั้นๆ สำหรับการ์ด)
function sourceText(itemId, detailed = false) {
  const sources = getItemSources(itemId);
  if (sources.length === 0) return "ยังไม่มีที่ได้";

  const list = sources.map((source) => {
    if (source.kind === "starter") return "🎁 ของเริ่มต้น";
    if (source.kind === "reward") return `🏆 รางวัลสมุดสะสม (${source.name})`;
    return detailed
      ? `${source.icon} ${source.name} (${source.maps.join(", ")}) ${formatChance(source.chance)}`
      : `${source.icon} ${source.name}`;
  });
  return detailed ? list.join(" · ") : list.slice(0, 2).join(", ") + (list.length > 2 ? " …" : "");
}

function renderItemDetail() {
  if (!inspected) return "";

  const def = ITEMS[inspected.itemId];
  const owned = inspected.uid === null ? null : findEquipment(inspected.uid);

  // ของที่เพิ่งขาย/ใช้หมด หรือยังไม่ค้นพบ → ปิดรายละเอียด
  const stillValid = def && (currentPanel === "collection"
    ? isDiscovered(def.id)
    : inspected.uid === null ? countMaterial(def.id) > 0 : owned !== null);
  if (!stillValid) {
    inspected = null;
    return "";
  }

  const rarity = RARITIES[def.rarity];
  const lines = [];

  if (def.isEquippable) {
    const plus = owned?.plus ?? 0;
    const stats = Object.entries(def.stats)
      .filter(([, value]) => value !== 0)
      .map(([key, value]) => {
        const total = value + def.statsPerPlus[key] * plus;
        return `${STAT_LABELS[key]} ${PERCENT_STATS.includes(key) ? "+" + formatStat(key, total) : total}`;
      });
    lines.push(`<b>ค่าพลัง${plus > 0 ? ` (+${plus})` : ""}:</b> ${stats.join(" · ") || "-"}`);

    const perPlus = Object.entries(def.statsPerPlus)
      .filter(([, value]) => value !== 0)
      .map(([key, value]) => `${STAT_LABELS[key]} +${formatStat(key, value)}`);
    if (perPlus.length > 0) lines.push(`<b>ตีบวก +1:</b> ${perPlus.join(" · ")}`);

    if (PERCENT_STATS.some((key) => def.stats[key] !== 0)) {
      lines.push('<span class="muted">คริ / ความเร็วตี / ต้านคริ ยังไม่มีผลในการต่อสู้ตอนนี้</span>');
    }
  }
  if (def.effects.length > 0) lines.push(`<b>ผล:</b> ${def.effects.map(effectText).join(" · ")}`);
  if (def.material) lines.push(`<b>วัตถุดิบระดับ:</b> ${def.material.tier}`);
  if (def.collectible) lines.push(`<b>ของสะสม:</b> ${COLLECTIBLE_KIND_NAMES[def.collectible.kind] ?? def.collectible.kind}`);

  lines.push([
    `${ITEM_TYPES[def.type].icon} ${ITEM_TYPES[def.type].name}`,
    levelText(def),
    def.maxStack > 1 ? `ซ้อนได้ ${def.maxStack}` : "",
    def.isSellable ? `ขาย ${def.sellPrice} 🪙` : "ขายไม่ได้",
    def.isTradable ? "" : "เทรดไม่ได้"
  ].filter(Boolean).join(" · "));

  lines.push(`<b>ได้จาก:</b> ${sourceText(def.id, true)}`);

  return `
    <div class="item-detail">
      <div class="item-detail-head">
        <span class="detail-icon">${def.icon}</span>
        <div class="item-info">
          <p class="item-name" style="color:${rarity.color}">${def.name}</p>
          <p class="item-meta" style="color:${rarity.color}">${rarity.name}</p>
        </div>
        <button class="panel-close" data-action="close-inspect" aria-label="ปิดรายละเอียด">✕</button>
      </div>
      ${def.description ? `<p class="detail-desc">${def.description}</p>` : ""}
      ${lines.map((line) => `<p class="detail-line">${line}</p>`).join("")}
    </div>`;
}

// ---------- สมุดสะสม ----------
function renderCollection() {
  const summary = getCollectionSummary();
  const rewards = getRewardStatuses();
  const claimable = rewards.filter((reward) => reward.complete && !reward.claimed).length;
  const claimed = rewards.filter((reward) => reward.claimed).length;
  const percent = summary.total > 0 ? Math.floor((summary.found / summary.total) * 100) : 0;

  const validTabs = ["all", "rewards", ...summary.rows.map((row) => row.type)];
  if (!validTabs.includes(collectionTab)) collectionTab = "all";

  const tabs = [
    tabButton("collection-tab", "all", `ทั้งหมด ${summary.found}/${summary.total}`, collectionTab),
    ...summary.rows.map((row) => tabButton("collection-tab", row.type, `${row.icon} ${row.name} ${row.found}/${row.total}`, collectionTab)),
    tabButton("collection-tab", "rewards", `🏆 รางวัล ${claimed}/${rewards.length}${claimable > 0 ? " ❗" : ""}`, collectionTab)
  ].join("");

  const content = collectionTab === "rewards"
    ? `<h4 class="panel-section">🏆 รางวัลสะสมครบหมวด</h4>${rewards.map(rewardRow).join("")}`
    : summary.rows
      .filter((row) => collectionTab === "all" || row.type === collectionTab)
      .map((row) => `
        <h4 class="panel-section">${row.icon} ${row.name} ${row.found} / ${row.total}</h4>
        <div class="collection-grid">${getCollectionItems(row.type).map(collectionCard).join("")}</div>`)
      .join("");

  const claimShortcut = claimable > 0 && collectionTab !== "rewards"
    ? `<button class="mini-button primary" data-action="collection-tab" data-tab="rewards">🏆 มีรางวัลให้รับ ${claimable} รายการ</button>`
    : "";

  return `
    <div class="collection-summary">
      <p class="item-name">ค้นพบแล้ว ${summary.found} / ${summary.total} ชิ้น (${percent}%)</p>
      <div class="progress"><div class="progress-fill" style="width:${percent}%"></div></div>
      ${claimShortcut}
    </div>
    <div class="tab-row">${tabs}</div>
    ${renderItemDetail()}
    ${content}
    <p class="hint-text">${collectionTab === "rewards"
      ? "สะสมไอเทมในหมวดให้ครบ แล้วกดรับรางวัลที่นี่"
      : "❓ = ยังไม่เคยได้ · แตะไอเทมที่ค้นพบแล้วเพื่อดูรายละเอียด"}</p>`;
}

// ---------- รางวัลสมุดสะสม ----------
function rewardText(reward) {
  return [
    reward.gold ? `🪙 ${reward.gold.toLocaleString("en-US")}` : "",
    reward.gem ? `💎 ${reward.gem}` : "",
    reward.itemId ? `${ITEMS[reward.itemId].icon} ${ITEMS[reward.itemId].name}` : ""
  ].filter(Boolean).join(" · ");
}

function rewardRow(reward) {
  const category = reward.type === null ? { icon: "📖", name: "ทุกหมวด" } : ITEM_TYPES[reward.type];

  let button = `<button class="mini-button" disabled>${reward.found}/${reward.total}</button>`;
  if (reward.claimed) button = '<button class="mini-button" disabled>รับแล้ว ✓</button>';
  else if (reward.complete) button = `<button class="mini-button primary" data-action="claim-reward" data-reward-id="${reward.id}">รับรางวัล</button>`;

  return `
      <div class="item-row reward-row ${reward.claimed ? "claimed" : ""}">
        <span class="item-icon">${reward.itemId ? ITEMS[reward.itemId].icon : "🏆"}</span>
        <div class="item-info">
          <p class="item-name">${reward.name}</p>
          <p class="item-meta">สะสม ${category.icon} ${category.name} ให้ครบ (${reward.found}/${reward.total})</p>
          <p class="item-meta">รางวัล: ${rewardText(reward)}</p>
        </div>
        <div class="item-actions">${button}</div>
      </div>`;
}

// จุดแดงที่ปุ่ม 📖 เมื่อมีรางวัลที่สะสมครบแล้วแต่ยังไม่กดรับ
export function refreshCollectionAlert() {
  document.querySelector('.menu-button[data-panel="collection"]')
    ?.classList.toggle("has-alert", countClaimableRewards() > 0);
}

// "ต้อง Lv.X" — ถ้าเลเวลยังไม่ถึง แสดงเป็นตัวแดงพร้อมแม่กุญแจ
function levelText(def) {
  if (def.levelRequirement <= 1) return "";
  return state.player.level >= def.levelRequirement
    ? `ต้อง Lv.${def.levelRequirement}`
    : `<span class="locked-text">🔒 ต้อง Lv.${def.levelRequirement}</span>`;
}

function collectionCard(def) {
  if (!isDiscovered(def.id)) {
    return `
      <div class="collection-card missing" data-item-id="${def.id}">
        <span class="item-icon">❓</span>
        <span class="card-name">???</span>
        <small>${sourceText(def.id)}</small>
      </div>`;
  }
  return `
    <button class="collection-card" data-action="inspect" data-item-id="${def.id}">
      <span class="item-icon">${def.icon}</span>
      <span class="card-name" style="color:${RARITIES[def.rarity].color}">${def.name}</span>
    </button>`;
}

// ---------- อุปกรณ์ + ตีบวก ----------
function renderEquipment() {
  const stats = getPlayerStats();

  const slots = Object.entries(EQUIPMENT_SLOTS).map(([slot, label]) => {
    const item = state.equipped[slot] === null ? null : findEquipment(state.equipped[slot]);
    if (!item) {
      return `<div class="slot-card empty"><span class="item-icon">➕</span><p>${label}: ว่าง</p></div>`;
    }
    return `
      <div class="slot-card ${selectedUid === item.uid ? "selected" : ""}" data-action="select-upgrade" data-uid="${item.uid}">
        <span class="item-icon">${ITEMS[item.itemId].icon}</span>
        <p class="item-name">${itemName(item)}</p>
        <p class="item-meta">${statText(item)}</p>
      </div>`;
  }).join("");

  // ยังไม่ได้เลือกชิ้นไหน → เลือกอาวุธที่สวมอยู่ให้ก่อน
  if (selectedUid === null || !findEquipment(selectedUid)) {
    selectedUid = state.equipped.weapon ?? state.inventory.equipment[0]?.uid ?? null;
  }

  return `
    <div class="stat-grid">
      <div><span>❤️ HP</span><b>${stats.maxHp}</b></div>
      <div><span>⚔️ ATK</span><b>${stats.atk}</b></div>
      <div><span>🛡️ DEF</span><b>${stats.def}</b></div>
      <div><span>💥 คริ</span><b>${Math.round(stats.critChance * 100)}%</b></div>
    </div>
    <div class="slot-grid">${slots}</div>
    ${renderUpgradeBox()}`;
}

function renderUpgradeBox() {
  const item = selectedUid === null ? null : findEquipment(selectedUid);
  if (!item) return '<p class="empty-text">เลือกอุปกรณ์เพื่อตีบวก</p>';

  if (item.plus >= MAX_PLUS) {
    return `<div class="upgrade-box"><p class="item-name">${itemName(item)}</p><p class="empty-text">ตีบวกสูงสุดแล้ว 🏆</p></div>`;
  }

  const cost = getUpgradeCost(item);
  const next = { ...item, plus: item.plus + 1 };
  const stones = countMaterial("enhance_stone");
  const canAfford = state.player.gold >= cost.gold && stones >= cost.stones;

  return `
    <div class="upgrade-box">
      <p class="item-name">${ITEMS[item.itemId].icon} ${itemName(item)} → +${next.plus}</p>
      <p class="item-meta">${statText(item)}  ➜  <b>${statText(next)}</b></p>
      <div class="cost-row">
        <span class="${state.player.gold >= cost.gold ? "" : "short"}">🪙 ${cost.gold.toLocaleString("en-US")}</span>
        <span class="${stones >= cost.stones ? "" : "short"}">💠 ${stones}/${cost.stones}</span>
        <span>🎯 ${Math.round(cost.successRate * 100)}%</span>
      </div>
      <button class="big-button" data-action="upgrade" data-uid="${item.uid}" ${canAfford ? "" : "disabled"}>🔨 ตีบวก</button>
    </div>`;
}

// ---------- ตั้งค่า ----------
function renderSettings() {
  return `
    <p class="empty-text">${getSaveStatusText()} · เกมเซฟอัตโนมัติ</p>
    <button class="big-button" data-action="save-now">💾 บันทึกตอนนี้</button>
    <button class="big-button danger" data-action="reset">🗑️ เริ่มเกมใหม่</button>
    <div class="help-box">
      <p><b>คอม:</b> WASD / ลูกศร = เดิน · คลิกซ้าย / Space / J = โจมตี · Q = ใช้ยาฟื้น HP · Esc = ปิดเมนู</p>
      <p><b>มือถือ:</b> จอยซ้ายล่าง = เดิน · แตะแผนที่ = โจมตี (กดค้างได้) · ใช้ยาจากกระเป๋า</p>
    </div>`;
}
