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

export function getCurrentScreen() {
  return currentScreenId;
}

export function showScreen(screenId) {
  const target = document.getElementById(screenId);

  if (!target) {
    console.error("ไม่พบหน้าจอชื่อ:", screenId);
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

  highlightMenu(screenId);
  closeMorePanel();
}

// ทำให้ปุ่มเมนูของหน้าที่เปิดอยู่ดูเด่นขึ้น
function highlightMenu(screenId) {
  document.querySelectorAll(".menu-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.screen === screenId);
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
      showScreen(button.dataset.screen || button.dataset.goto);
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
