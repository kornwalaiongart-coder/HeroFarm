// =====================================================
// js/save.js
// หน้าที่: เก็บ state ลงเครื่องผู้เล่น (localStorage)
// เพื่อให้รีเฟรชหน้าเว็บแล้วข้อมูลไม่หาย
//
// localStorage เก็บได้แค่ "ข้อความ" เท่านั้น
// เราจึงต้องแปลง object → ข้อความ ด้วย JSON.stringify ตอนเซฟ
// และแปลงกลับด้วย JSON.parse ตอนโหลด
//
// ขั้นตอนโหลด:  อ่าน → แปลงเวอร์ชัน (migrate) → ตรวจ/ซ่อมค่า (sanitize)
// =====================================================

import { state, replaceState, createNewState, CONFIG } from "./state.js";
import { getCharacterDef } from "./systems/characters.js";

const SAVE_KEY = "herofarm_save";
// สำเนาเซฟดิบก่อนแปลงเวอร์ชัน หรือก่อนทิ้งเซฟที่อ่านไม่ได้
// ถ้าแปลงผิดพลาด ยังกู้ข้อมูลผู้เล่นกลับมาได้
const BACKUP_KEY = "herofarm_save_backup";

// ---------- ตารางแปลงเซฟเก่า ----------
// key = เวอร์ชันต้นทาง ฟังก์ชันรับเซฟเวอร์ชันนั้น คืนเซฟเวอร์ชันถัดไป
// เปลี่ยนโครงสร้างเซฟเมื่อไหร่: เพิ่ม CONFIG.SAVE_VERSION แล้วเพิ่มขั้นตอนที่นี่
const MIGRATIONS = {
  // v1 → v2: เลิกเก็บชื่อ/รูป/ค่าพลังในเซฟ เหลือแค่ id, level, exp
  1: (save) => ({
    ...save,
    characters: save.characters.map(({ id, level, exp }) => ({ id, level, exp }))
  })
};

function migrate(save) {
  let current = save;
  let version = current.version ?? 1;

  while (version < CONFIG.SAVE_VERSION) {
    const step = MIGRATIONS[version];
    if (!step) throw new Error("ไม่มีขั้นตอนแปลงเซฟจากเวอร์ชัน " + version);

    version += 1;
    current = { ...step(current), version };
  }

  return current;
}

// ---------- ตรวจและซ่อมค่าในเซฟ ----------
// กันหน้าจอพังเพราะเจอ undefined / NaN / ตัวละครที่ถูกลบออกจากเกมไปแล้ว
function toNumber(value, fallback, min = 0) {
  return Number.isFinite(value) ? Math.max(min, value) : fallback;
}

function sanitize(save) {
  const fresh = createNewState();

  const player = { ...fresh.player, ...save.player };
  for (const key of Object.keys(fresh.player)) {
    player[key] = toNumber(player[key], fresh.player[key]);
  }
  player.level = Math.max(1, Math.floor(player.level));
  player.energy = Math.min(player.energy, player.maxEnergy);

  const characters = save.characters
    .filter((owned) => owned && getCharacterDef(owned.id))
    .map((owned) => ({
      id: owned.id,
      level: Math.floor(toNumber(owned.level, 1, 1)),
      exp: toNumber(owned.exp, 0)
    }));

  return { ...fresh, ...save, version: CONFIG.SAVE_VERSION, player, characters };
}

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

function backupRawSave(raw) {
  try {
    localStorage.setItem(BACKUP_KEY, raw);
  } catch (error) {
    console.error("สำรองเซฟไม่สำเร็จ:", error);
  }
}

// ---------- โหลด ----------
// คืน true ถ้าเจอเซฟเดิม, false ถ้าเป็นผู้เล่นใหม่ (หรือเซฟใช้ไม่ได้)
export function loadGame() {
  let raw = null;

  try {
    raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;

    const loaded = JSON.parse(raw);

    if (!loaded || typeof loaded.player !== "object" || !Array.isArray(loaded.characters)) {
      throw new Error("โครงสร้างเซฟไม่ถูกต้อง");
    }

    const version = loaded.version ?? 1;
    if (version > CONFIG.SAVE_VERSION) {
      throw new Error("เซฟมาจากเกมเวอร์ชันที่ใหม่กว่า (v" + version + ")");
    }
    if (version < CONFIG.SAVE_VERSION) backupRawSave(raw);

    replaceState(sanitize(migrate(loaded)));
    return true;
  } catch (error) {
    console.error("โหลดเซฟไม่สำเร็จ เริ่มเกมใหม่แทน (สำรองเซฟเดิมไว้ที่ " + BACKUP_KEY + "):", error);
    if (raw) backupRawSave(raw);
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
