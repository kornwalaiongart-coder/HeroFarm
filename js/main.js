// =====================================================
// js/main.js
// จุดเริ่มต้นของเกม — ไฟล์เดียวที่ index.html เรียก
// หน้าที่: สั่งให้แต่ละระบบเริ่มทำงานตามลำดับที่ถูกต้อง
//
// ลำดับสำคัญมาก: ต้องโหลดเซฟก่อน แล้วค่อยวาดหน้าจอ
// ไม่งั้นจะวาดข้อมูลเกมใหม่ทับข้อมูลเก่าของผู้เล่น
// =====================================================

import { updateEnergyFromTime } from "./state.js";
import { loadGame, saveGame, resetGame, getSaveStatusText } from "./save.js";
import { renderTopBar, showToast } from "./ui.js";
import { initRouter, showScreen } from "./router.js";
import { setBattleHandler } from "./systems/characters.js";
import { initBattle, startBattle } from "./systems/battle.js";

function startGame() {
  // 1) โหลดเซฟเดิม (ถ้ามี)
  const hasSave = loadGame();

  // 2) คำนวณพลังงานที่ฟื้นระหว่างที่ปิดเกมไป
  const energyGained = updateEnergyFromTime();

  // 3) ผูกปุ่มทั้งหมด
  initRouter();
  initBattle();
  setBattleHandler(startBattle);
  initSettingsButtons();

  // 4) วาดหน้าจอครั้งแรก
  renderTopBar();

  // 5) บันทึกทันที เพื่อให้ผู้เล่นใหม่มีไฟล์เซฟตั้งแต่วินาทีแรก
  saveGame();

  // 6) ทักทาย
  if (!hasSave) {
    showToast("ยินดีต้อนรับสู่ Hero Farm");
  } else if (energyGained > 0) {
    showToast("พลังงานฟื้นมา +" + energyGained + " ระหว่างที่คุณไม่อยู่");
  }
}

// ---------- ปุ่มในหน้าตั้งค่า ----------
function initSettingsButtons() {
  const statusText = document.getElementById("ui-save-status");

  document.getElementById("save-now-btn").addEventListener("click", () => {
    const ok = saveGame();
    statusText.textContent = ok ? getSaveStatusText() : "บันทึกไม่สำเร็จ";
    showToast(ok ? "บันทึกแล้ว" : "บันทึกไม่สำเร็จ");
  });

  document.getElementById("reset-game-btn").addEventListener("click", () => {
    const confirmed = confirm(
      "ลบข้อมูลทั้งหมดและเริ่มเกมใหม่?\nทอง เพชร เลเวล และตัวละครจะกลับไปเป็นค่าเริ่มต้น"
    );
    if (!confirmed) return;

    resetGame();
    renderTopBar();
    statusText.textContent = getSaveStatusText();
    showScreen("home-screen");
    showToast("เริ่มเกมใหม่แล้ว");
  });

  // อัปเดตข้อความสถานะทุกครั้งที่เปิดหน้าตั้งค่า
  document.querySelectorAll('[data-screen="settings-screen"]').forEach((button) => {
    button.addEventListener("click", () => {
      statusText.textContent = getSaveStatusText();
    });
  });
}

// ---------- นาฬิกาเดินทุกวินาที ----------
// ใช้ฟื้นพลังงานและอัปเดตเวลานับถอยหลังบนหน้าหลัก
function startGameClock() {
  setInterval(() => {
    const gained = updateEnergyFromTime();
    renderTopBar();
    if (gained > 0) saveGame();
  }, 1000);
}

// ---------- บันทึกอัตโนมัติทุก 30 วินาที ----------
function startAutoSave() {
  setInterval(saveGame, 30_000);

  // บันทึกอีกครั้งตอนปิดแท็บ กันข้อมูลหายนาทีสุดท้าย
  window.addEventListener("beforeunload", saveGame);
}

startGame();
startGameClock();
startAutoSave();
