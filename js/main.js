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
import { ITEMS } from "../data/items.js";
import { MONSTERS } from "../data/monsters.js";
import { createWorld, updateWorld } from "./game/world.js";
import { createRenderer } from "./game/render.js";
import { initInput, readInput, clearInput } from "./game/input.js";
import { renderHud, showToast } from "./ui/hud.js";
import { initPanels, isPanelOpen, renderPanel } from "./ui/panels.js";
import { showCreateScreen } from "./ui/create.js";

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
    onReset: () => beginGame(false)
  });

  beginGame(hasSave);
  requestAnimationFrame(loop);

  // เซฟรวบทุกรอบ (ถ้ามีอะไรเปลี่ยน) + ตอนสลับแอป/ปิดแท็บ
  setInterval(saveIfDirty, CONFIG.AUTOSAVE_MS);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") saveGame();
  });
  window.addEventListener("pagehide", saveGame);
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

      case "pickup":
        markDirty();
        // ของหายากแจ้งเตือนเด่นๆ วัตถุดิบธรรมดาดูแค่ตัวหนังสือลอยพอ
        if (event.kind === "item" && ITEMS[event.itemId].type === "equipment") {
          showToast("🎉 ได้รับ " + ITEMS[event.itemId].icon + " " + ITEMS[event.itemId].name);
        }
        break;

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

// ให้หน้าทดสอบ (tests/) และ DevTools ส่องสถานะเกมได้ — ไม่มีผลกับการเล่น
window.heroFarm = {
  get world() { return world; },
  get state() { return state; },
  renderPanel
};

start();
