// =====================================================
// js/router.js
// หน้าที่: สลับหน้าจอ และจำว่าตอนนี้อยู่หน้าไหน
//
// ของเดิมดูว่าจะไปหน้าไหนจาก "ข้อความบนปุ่ม" (เช่น "Farm")
// ซึ่งพังทันทีถ้าเปลี่ยนข้อความเป็นภาษาไทย
// ตอนนี้เปลี่ยนมาอ่านจาก data-screen="..." ใน HTML แทน
// =====================================================

import { renderCharacters } from "./systems/characters.js";

let currentScreenId = "home-screen";

// ปุ่มเมนูล่างที่ควรไฮไลต์เมื่อเปิดหน้านั้น (อ้างอิง data-menu ใน HTML)
// ปุ่ม "ตัวละคร" กับ "ต่อสู้" ไปหน้าเดียวกัน จึงต้องแยกด้วย data-menu แทน data-screen
const MENU_FOR_SCREEN = {
  "home-screen": "home",
  "characters-screen": "characters",
  "farm-screen": "farm",
  "battle-screen": "battle"
};

// ระบบอื่นใช้ขวางการเปลี่ยนหน้าได้ (เช่น ระหว่างต่อสู้)
// guard(screenId) คืน false = ห้ามเปลี่ยนหน้า
let navigationGuard = null;

export function setNavigationGuard(guard) {
  navigationGuard = guard;
}

export function getCurrentScreen() {
  return currentScreenId;
}

export function showScreen(screenId, menuKey = MENU_FOR_SCREEN[screenId]) {
  const target = document.getElementById(screenId);

  if (!target) {
    console.error("ไม่พบหน้าจอชื่อ:", screenId);
    return;
  }

  if (navigationGuard && !navigationGuard(screenId)) {
    closeMorePanel();
    return;
  }

  document.querySelectorAll(".screen").forEach((screen) => {
    screen.classList.add("hidden");
  });
  target.classList.remove("hidden");

  currentScreenId = screenId;

  // หน้าตัวละครต้องวาดใหม่ทุกครั้ง เพื่อให้เลเวล/EXP ที่เปลี่ยนไปแสดงถูกต้อง
  if (screenId === "characters-screen") {
    renderCharacters();
  }

  highlightMenu(menuKey);
  closeMorePanel();
}

// ทำให้ปุ่มเมนูของหน้าที่เปิดอยู่ดูเด่นขึ้น (หน้าที่ไม่มีปุ่มในเมนูล่าง = ไม่ไฮไลต์)
function highlightMenu(menuKey) {
  document.querySelectorAll(".menu-button").forEach((button) => {
    button.classList.toggle("active", menuKey !== undefined && button.dataset.menu === menuKey);
  });
}

function openMorePanel() {
  document.getElementById("more-overlay").classList.remove("hidden");
}

function closeMorePanel() {
  document.getElementById("more-overlay").classList.add("hidden");
}

// ---------- ผูกปุ่มทั้งหมดเข้ากับระบบสลับหน้า ----------
export function initRouter() {
  // ปุ่มไหนก็ได้ที่มี data-screen หรือ data-goto จะพาไปหน้านั้น
  document.querySelectorAll("[data-screen], [data-goto]").forEach((button) => {
    button.addEventListener("click", () => {
      showScreen(button.dataset.screen || button.dataset.goto, button.dataset.menu);
    });
  });

  document.getElementById("more-btn").addEventListener("click", openMorePanel);
  document.getElementById("more-close-btn").addEventListener("click", closeMorePanel);

  // แตะพื้นที่มืดด้านนอกแผง = ปิดแผง
  document.getElementById("more-overlay").addEventListener("click", (event) => {
    if (event.target.id === "more-overlay") closeMorePanel();
  });

  showScreen("home-screen");
}
