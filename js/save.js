// =====================================================
// js/save.js
// หน้าที่: เก็บ state ลงเครื่องผู้เล่น (localStorage)
// เพื่อให้รีเฟรชหน้าเว็บแล้วข้อมูลไม่หาย
//
// localStorage เก็บได้แค่ "ข้อความ" เท่านั้น
// เราจึงต้องแปลง object → ข้อความ ด้วย JSON.stringify ตอนเซฟ
// และแปลงกลับด้วย JSON.parse ตอนโหลด
// =====================================================

import { state, replaceState, createNewState, CONFIG } from "./state.js";

const SAVE_KEY = "herofarm_save";

// ---------- บันทึก ----------
export function saveGame() {
  try {
    state.lastSavedAt = Date.now();
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    return true;
  } catch (error) {
    // เกิดได้ถ้าเบราว์เซอร์ปิด localStorage หรือพื้นที่เต็ม
    console.error("บันทึกไม่สำเร็จ:", error);
    return false;
  }
}

// ---------- โหลด ----------
// คืน true ถ้าเจอเซฟเดิม, false ถ้าเป็นผู้เล่นใหม่
export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;

    const loaded = JSON.parse(raw);

    // เซฟจากเกมเวอร์ชันเก่ากว่า อาจมีโครงสร้างไม่ครบ
    // Phase 11 จะทำระบบแปลงเซฟเก่าเต็มรูปแบบ ตอนนี้แค่เช็คเบื้องต้นก่อน
    if (!loaded || !loaded.player || !Array.isArray(loaded.characters)) {
      console.warn("ไฟล์เซฟผิดรูปแบบ เริ่มเกมใหม่แทน");
      return false;
    }

    // เติมค่าที่อาจขาดไป กันหน้าจอพังเพราะเจอ undefined
    const fresh = createNewState();
    loaded.player = { ...fresh.player, ...loaded.player };
    loaded.version = loaded.version ?? CONFIG.SAVE_VERSION;

    replaceState(loaded);
    return true;
  } catch (error) {
    console.error("โหลดเซฟไม่สำเร็จ:", error);
    return false;
  }
}

// ---------- ลบเซฟและเริ่มใหม่ ----------
export function resetGame() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch (error) {
    console.error("ลบเซฟไม่สำเร็จ:", error);
  }
  replaceState(createNewState());
  saveGame();
}

// ---------- ข้อความบอกเวลาที่เซฟล่าสุด ----------
export function getSaveStatusText() {
  if (!state.lastSavedAt) return "ยังไม่ได้บันทึก";

  const time = new Date(state.lastSavedAt);
  const hh = String(time.getHours()).padStart(2, "0");
  const mm = String(time.getMinutes()).padStart(2, "0");
  return `บันทึกล่าสุด ${hh}:${mm} น.`;
}
