// =====================================================
// js/ui.js
// หน้าที่เดียว: อ่านค่าจาก state แล้ววาดลงหน้าจอ
// ไฟล์นี้ "ไม่คิด" และ "ไม่ตัดสินใจ" อะไรทั้งสิ้น
// ใครอยากให้ตัวเลขบนจอเปลี่ยน → ต้องแก้ state แล้วเรียก renderTopBar()
// =====================================================

import { state, getPlayerExpNeeded, getEnergyCountdownMs } from "./state.js";

// ใส่ลูกน้ำคั่นหลักพัน เช่น 1250 → 1,250
function formatNumber(value) {
  return Math.floor(value).toLocaleString("en-US");
}

// ---------- วาดแถบด้านบนทั้งหมด ----------
export function renderTopBar() {
  const player = state.player;

  document.getElementById("ui-gold").textContent = formatNumber(player.gold);
  document.getElementById("ui-gem").textContent = formatNumber(player.gem);
  document.getElementById("ui-player-level").textContent = player.level;

  const expNeeded = getPlayerExpNeeded(player.level);
  const percent = Math.min(100, (player.exp / expNeeded) * 100);

  document.getElementById("ui-player-exp-fill").style.width = percent + "%";
  document.getElementById("ui-player-exp-text").textContent =
    formatNumber(player.exp) + " / " + formatNumber(expNeeded);

  document.getElementById("ui-energy").textContent =
    Math.floor(player.energy) + "/" + player.maxEnergy;

  renderEnergyHint();
}

// ---------- ข้อความบอกว่าพลังงานหน่วยถัดไปมาอีกกี่นาที ----------
function renderEnergyHint() {
  const hint = document.getElementById("ui-energy-hint");
  if (!hint) return;

  const player = state.player;

  if (player.energy >= player.maxEnergy) {
    hint.textContent = "พลังงานเต็มแล้ว พร้อมออกผจญภัย";
    return;
  }

  const ms = getEnergyCountdownMs();
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);

  hint.textContent =
    "พลังงานถัดไปในอีก " + minutes + ":" + String(seconds).padStart(2, "0") + " นาที";
}

// ---------- ข้อความแจ้งเตือนสั้นๆ ลอยขึ้นมาแล้วหายไป ----------
export function showToast(message) {
  const screen = document.querySelector(".game-screen");

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  screen.appendChild(toast);

  setTimeout(() => toast.remove(), 2000);
}
