// =====================================================
// js/main.js
// จุดเริ่มต้นของเกม — ไฟล์เดียวที่ index.html เรียก
//
// ลำดับ: โหลดเซฟ → (ยังไม่มีตัวละคร? เปิดหน้าสร้าง) → สร้างโลก → วนลูปเกม
// ลูปเกมทุกเฟรม: อ่านการควบคุม → อัปเดตโลก → จัดการ events → วาด
// =====================================================

import { state, CONFIG } from "./state.js";
import { loadGame, saveGame, saveIfDirty, markDirty } from "./save.js";
import { MAPS } from "../data/maps.js";
import { ITEMS } from "./systems/itemDatabase.js";
import { MONSTERS } from "../data/monsters.js";
import { createWorld, updateWorld } from "./game/world.js";
import { createRenderer } from "./game/render.js";
import { initInput, readInput, clearInput } from "./game/input.js";
import { renderHud, showToast } from "./ui/hud.js";
import { initPanels, isPanelOpen, renderPanel } from "./ui/panels.js";
import { showCreateScreen } from "./ui/create.js";
import { useItem, pickHealingPotion } from "./systems/consumables.js";
import { getPlayerStats } from "./systems/stats.js";

const $ = (id) => document.getElementById(id);

let world = null;
let renderer = null;
let lastFrameTime = null;

function start() {
  const hasSave = loadGame();

  renderer = createRenderer($("world-canvas"));
  window.addEventListener("resize", () => renderer.resize());

  initInput({
    joystickEl: $("joystick"),
    knobEl: $("joystick-knob"),
    attackArea: $("world-canvas")
  });

  initPanels({
    onOpen: clearInput,
    onReset: () => beginGame(false),
    onUseItem: useConsumable
  });

  beginGame(hasSave);
  requestAnimationFrame(loop);

  // เซฟรวบทุกรอบ (ถ้ามีอะไรเปลี่ยน) + ตอนสลับแอป/ปิดแท็บ
  setInterval(saveIfDirty, CONFIG.AUTOSAVE_MS);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") saveGame();
  });
  window.addEventListener("pagehide", saveGame);

  // Q = ใช้ยาฟื้น HP ขวดที่พอดีที่สุด (ไม่ทำงานตอนพิมพ์ชื่อ / เปิดเมนูอยู่)
  window.addEventListener("keydown", (event) => {
    if (event.code !== "KeyQ" || event.repeat || !world || isPanelOpen()) return;
    if (event.target instanceof HTMLInputElement) return;
    quickHeal();
  });
}

function beginGame(hasSave) {
  world = null;

  if (!state.profile) {
    showCreateScreen(() => {
      saveGame();
      enterWorld();
      showToast("ยินดีต้อนรับ " + state.profile.name + "! เดินไปทางขวาเพื่อตีสไลม์");
    });
    return;
  }

  enterWorld();
  if (hasSave) showToast("ยินดีต้อนรับกลับมา " + state.profile.name);
}

// fromMapId = เพิ่งเดินผ่านประตูมาจากแผนที่ไหน (เกิดข้างประตูฝั่งนั้น)
function enterWorld(fromMapId = null) {
  world = createWorld(state.mapId, Math.random, fromMapId);
  renderer.resize();
}

function travel(event) {
  state.mapId = event.to;
  enterWorld(event.from);
  saveGame();
  showToast("🌀 เข้าสู่ " + MAPS[event.to].name);
}

function loop(now) {
  const dt = lastFrameTime === null ? 0 : (now - lastFrameTime) / 1000;
  lastFrameTime = now;

  if (world) {
    // เปิดเมนูอยู่ = หยุดเวลา แต่ยังวาดฉากไว้ด้านหลัง
    if (!isPanelOpen()) {
      handleEvents(updateWorld(world, readInput(), dt));
    }
    renderer.draw(world, state.profile);
    renderHud(world);
  }

  requestAnimationFrame(loop);
}

function handleEvents(events) {
  let travelEvent = null;

  for (const event of events) {
    switch (event.type) {
      case "kill":
        markDirty();
        if (event.boss) {
          showToast("👑 ปราบ " + MONSTERS[event.monsterId].name + " สำเร็จ!");
          saveGame();
        }
        break;

      case "travel":
        travelEvent = event;
        break;

      case "pickup": {
        markDirty();
        const item = event.kind === "item" ? ITEMS[event.itemId] : null;
        // ได้ครั้งแรก → ลงสมุดสะสม / อุปกรณ์ → แจ้งเตือนเด่นๆ / วัตถุดิบธรรมดาดูแค่ตัวหนังสือลอยพอ
        if (item && event.isNew) {
          showToast("📖 ค้นพบไอเทมใหม่! " + item.icon + " " + item.name);
        } else if (item?.isEquippable) {
          showToast("🎉 ได้รับ " + item.icon + " " + item.name);
        }
        break;
      }

      case "levelUp":
        showToast("🌟 เลเวลอัพ! ตอนนี้ Lv." + state.player.level);
        saveGame();
        break;

      case "playerDied":
        showToast("💀 แพ้ " + MONSTERS[event.killedBy].name + " — กลับไปพักที่จุดเกิด");
        break;
    }
  }

  // ย้ายแผนที่ทำหลังสุด — event อื่นในเฟรมนี้เป็นของแผนที่เดิม
  if (travelEvent) travel(travelEvent);
}

// ---------- ใช้ไอเทม (ยา) ----------
const USE_FAIL_TEXT = {
  notConsumable: "ไอเทมนี้ใช้ไม่ได้",
  notOwned: "ไม่มีไอเทมนี้แล้ว",
  level: "เลเวลยังไม่ถึง",
  dead: "หมดสติอยู่ ใช้ไอเทมไม่ได้",
  fullHp: "HP เต็มอยู่แล้ว",
  noEffect: "ไอเทมนี้ยังใช้ไม่ได้"
};

// เรียกจากปุ่ม "ใช้" ในกระเป๋า และปุ่มลัด Q
function useConsumable(itemId) {
  if (!world) return;

  const result = useItem(itemId, world);
  if (!result.ok) {
    const levelText = result.reason === "level" ? ` (ต้อง Lv.${result.item.levelRequirement})` : "";
    showToast("⚠️ " + USE_FAIL_TEXT[result.reason] + levelText);
    return;
  }

  const gains = [];
  if (result.healed > 0) gains.push("+" + result.healed + " HP");
  if (result.exp > 0) gains.push("+" + result.exp + " EXP");
  showToast(result.item.icon + " ใช้ " + result.item.name + " " + gains.join(" "));
  markDirty();

  if (result.levelsGained > 0) {
    showToast("🌟 เลเวลอัพ! ตอนนี้ Lv." + state.player.level);
    saveGame();
  }
}

function quickHeal() {
  const potion = pickHealingPotion(getPlayerStats().maxHp - world.player.hp);
  if (!potion) {
    showToast("🧪 ไม่มียาฟื้น HP — มอนเตอร์มีโอกาสดรอปยา");
    return;
  }
  useConsumable(potion.id);
}

// ให้หน้าทดสอบ (tests/) และ DevTools ส่องสถานะเกมได้ — ไม่มีผลกับการเล่น
window.heroFarm = {
  get world() { return world; },
  get state() { return state; },
  renderPanel
};

start();
