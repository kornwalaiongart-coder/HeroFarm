// =====================================================
// js/ui/panels.js
// แผงเมนูที่เลื่อนขึ้นมาทับแผนที่: กระเป๋า / อุปกรณ์+ตีบวก / ตั้งค่า
// ระหว่างเปิดแผง main.js จะหยุดเวลาในโลก (มอนเตอร์ไม่ตีระหว่างจัดของ)
//
// ปุ่มในแผงใช้ data-action แล้วดักคลิกที่ตัวแผงจุดเดียว
// จึงวาดแผงใหม่ได้บ่อยๆ โดยไม่ต้องผูก event ซ้ำ
// =====================================================

import { state } from "../state.js";
import { ITEMS, RARITIES, EQUIPMENT_SLOTS } from "../systems/itemDatabase.js";
import {
  countMaterial, findEquipment, isEquipped, equip, unequip,
  sellMaterial, sellEquipment, getEquipmentSellPrice
} from "../systems/inventory.js";
import { MAX_PLUS, getUpgradeCost, upgradeEquipment } from "../systems/upgrade.js";
import { getPlayerStats, getEquipmentStats } from "../systems/stats.js";
import { markDirty, saveGame, resetGame, getSaveStatusText } from "../save.js";
import { showToast } from "./hud.js";

const $ = (id) => document.getElementById(id);

const PANEL_TITLES = {
  inventory: "🎒 กระเป๋า",
  equipment: "🛡️ อุปกรณ์และตีบวก",
  settings: "⚙️ ตั้งค่า"
};

let currentPanel = null;
let selectedUid = null;
let resetArmedUntil = 0;
let hooks = {};

export function isPanelOpen() {
  return currentPanel !== null;
}

export function openPanel(name) {
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
function handleAction({ action, uid, slot, itemId, qty }) {
  const itemUid = uid === undefined ? null : Number(uid);

  switch (action) {
    case "equip":
      equip(itemUid);
      break;

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
  const renderers = { inventory: renderInventory, equipment: renderEquipment, settings: renderSettings };
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

// ---------- กระเป๋า ----------
function renderInventory() {
  const equipment = [...state.inventory.equipment].sort(
    (a, b) => Number(isEquipped(b.uid)) - Number(isEquipped(a.uid)) || b.plus - a.plus
  );

  const equipmentRows = equipment.map((item) => {
    const def = ITEMS[item.itemId];
    const equipped = isEquipped(item.uid);
    return `
      <div class="item-row">
        <span class="item-icon">${def.icon}</span>
        <div class="item-info">
          <p class="item-name">${itemName(item)} ${equipped ? '<span class="badge">สวมอยู่</span>' : ""}</p>
          <p class="item-meta">${EQUIPMENT_SLOTS[def.slot]} · ${statText(item)}</p>
        </div>
        <div class="item-actions">
          ${equipped
            ? `<button class="mini-button" data-action="unequip" data-slot="${def.slot}">ถอด</button>`
            : `<button class="mini-button primary" data-action="equip" data-uid="${item.uid}">สวม</button>`}
          <button class="mini-button" data-action="select-upgrade" data-uid="${item.uid}">ตีบวก</button>
          ${equipped ? "" : `<button class="mini-button" data-action="sell-equipment" data-uid="${item.uid}">ขาย ${getEquipmentSellPrice(item)}🪙</button>`}
        </div>
      </div>`;
  }).join("");

  const materialRows = Object.entries(state.inventory.materials).map(([itemId, qty]) => {
    const def = ITEMS[itemId];
    return `
      <div class="item-row">
        <span class="item-icon">${def.icon}</span>
        <div class="item-info">
          <p class="item-name"><span style="color:${RARITIES[def.rarity].color}">${def.name}</span> ×${qty}</p>
          <p class="item-meta">ขายชิ้นละ ${def.sellPrice} 🪙</p>
        </div>
        <div class="item-actions">
          <button class="mini-button" data-action="sell-material" data-item-id="${itemId}" data-qty="1">ขาย 1</button>
          <button class="mini-button" data-action="sell-material" data-item-id="${itemId}" data-qty="all">ขายหมด</button>
        </div>
      </div>`;
  }).join("");

  return `
    <h4 class="panel-section">อุปกรณ์ (${equipment.length})</h4>
    ${equipmentRows || '<p class="empty-text">ยังไม่มีอุปกรณ์</p>'}
    <h4 class="panel-section">วัตถุดิบ</h4>
    ${materialRows || '<p class="empty-text">ตีมอนเตอร์เพื่อเก็บวัตถุดิบ</p>'}`;
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
      <p><b>คอม:</b> WASD / ลูกศร = เดิน · Space / J = โจมตี · Esc = ปิดเมนู</p>
      <p><b>มือถือ:</b> จอยซ้ายล่าง = เดิน · ปุ่มดาบขวาล่าง = โจมตี (กดค้างได้)</p>
    </div>`;
}
