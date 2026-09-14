// =====================================================
// js/state.js
// "สมุดบันทึกกลาง" ของเกม — ข้อมูลทุกอย่างอยู่ที่นี่ที่เดียว
// ทอง เพชร เลเวล พลังงาน ตัวละคร ทั้งหมดอ่าน/เขียนที่ไฟล์นี้
//
// กฎสำคัญ: ห้ามมีตัวเลขทองซ่อนอยู่ในไฟล์อื่น
// ตัวเลขที่เห็นบนหน้าจอเป็นแค่ "ภาพสะท้อน" ของ state เท่านั้น
// =====================================================

import { STARTER_CHARACTERS } from "../data/characters.js";

// ---------- ค่าคงที่ของเกม (ปรับสมดุลได้ที่นี่) ----------
export const CONFIG = {
  SAVE_VERSION: 1,

  ENERGY_MAX: 60,              // พลังงานสูงสุดตอนเริ่มเกม
  ENERGY_REGEN_MS: 5 * 60_000, // ฟื้น 1 หน่วยทุก 5 นาที
  ENERGY_PER_LEVEL: 5,         // เลเวลผู้เล่นขึ้น 1 → พลังงานสูงสุด +5

  BATTLE_ENERGY_COST: 5,       // ต่อสู้ 1 ครั้งใช้พลังงานเท่าไหร่

  START_GOLD: 1250,
  START_GEM: 85
};

// ---------- หน้าตาของเกมตอนเริ่มใหม่ ----------
export function createNewState() {
  return {
    version: CONFIG.SAVE_VERSION,

    player: {
      level: 1,
      exp: 0,
      gold: CONFIG.START_GOLD,
      gem: CONFIG.START_GEM,
      energy: CONFIG.ENERGY_MAX,
      maxEnergy: CONFIG.ENERGY_MAX,
      // เวลาล่าสุดที่คำนวณพลังงาน ใช้คิดพลังงานที่ฟื้นตอนไม่ได้เปิดเกม
      energyUpdatedAt: Date.now()
    },

    // structuredClone = ก๊อปข้อมูลแบบแยกขาดจากต้นฉบับ
    // เพื่อให้การเลเวลอัพในเกม ไม่ไปแก้ไฟล์ data/characters.js
    characters: structuredClone(STARTER_CHARACTERS),

    lastSavedAt: null
  };
}

// state จริงที่เกมใช้งาน เริ่มจากเกมใหม่ก่อน แล้ว save.js จะโหลดทับถ้ามีเซฟเดิม
export let state = createNewState();

export function replaceState(newState) {
  state = newState;
}


// =====================================================
// สูตรคำนวณ
// =====================================================

// EXP ที่ตัวละครต้องใช้เพื่อขึ้นเลเวลถัดไป (สูตรเดิมจาก game.js)
export function getExpNeeded(level) {
  return Math.floor(50 * Math.pow(level, 1.5));
}

// EXP ที่ผู้เล่นต้องใช้เพื่อขึ้นเลเวลถัดไป (ใช้เยอะกว่าตัวละคร)
export function getPlayerExpNeeded(level) {
  return Math.floor(100 * Math.pow(level, 1.5));
}


// =====================================================
// ฟังก์ชันแก้ไข state — ทุกระบบต้องเรียกผ่านฟังก์ชันเหล่านี้
// (ห้ามไปบวกลบตัวเลขตรงๆ จากไฟล์อื่น จะตามหาบั๊กยากมาก)
// =====================================================

export function addGold(amount) {
  state.player.gold += amount;
  if (state.player.gold < 0) state.player.gold = 0;
}

export function addGem(amount) {
  state.player.gem += amount;
  if (state.player.gem < 0) state.player.gem = 0;
}

// เช็คว่ามีพลังงานพอไหม
export function hasEnergy(amount) {
  return state.player.energy >= amount;
}

// ใช้พลังงาน — คืน true ถ้าใช้สำเร็จ, false ถ้าไม่พอ
export function spendEnergy(amount) {
  if (!hasEnergy(amount)) return false;
  state.player.energy -= amount;
  return true;
}

// เพิ่ม EXP ให้ผู้เล่น และเลเวลอัพถ้าถึงเกณฑ์
// คืนจำนวนเลเวลที่ขึ้น (0 = ไม่ขึ้น)
export function addPlayerExp(amount) {
  const player = state.player;
  player.exp += amount;

  let levelsGained = 0;

  while (player.exp >= getPlayerExpNeeded(player.level)) {
    player.exp -= getPlayerExpNeeded(player.level);
    player.level += 1;
    levelsGained += 1;

    // รางวัลเลเวลอัพ: พลังงานสูงสุดเพิ่ม และเติมพลังงานเต็ม
    player.maxEnergy += CONFIG.ENERGY_PER_LEVEL;
    player.energy = player.maxEnergy;
  }

  return levelsGained;
}

// =====================================================
// ระบบพลังงานฟื้นตามเวลา
// คิดจาก "เวลาที่ผ่านไปจริง" ไม่ใช่การนับถอยหลังในเกม
// แปลว่าปิดเบราว์เซอร์ไป 1 ชั่วโมงแล้วกลับมา พลังงานก็ฟื้นให้
// (นี่คือพื้นฐานเดียวกับที่ระบบฟาร์มออฟไลน์จะใช้ใน Phase 5)
// =====================================================
export function updateEnergyFromTime() {
  const player = state.player;
  const now = Date.now();

  // ถ้าพลังงานเต็มอยู่แล้ว แค่ขยับเวลาให้เป็นปัจจุบัน
  if (player.energy >= player.maxEnergy) {
    player.energy = player.maxEnergy;
    player.energyUpdatedAt = now;
    return 0;
  }

  const elapsed = now - player.energyUpdatedAt;
  const gained = Math.floor(elapsed / CONFIG.ENERGY_REGEN_MS);

  if (gained <= 0) return 0;

  player.energy = Math.min(player.maxEnergy, player.energy + gained);

  // เก็บเศษเวลาที่ยังไม่ครบรอบไว้ ไม่ให้เวลาหายฟรี
  player.energyUpdatedAt += gained * CONFIG.ENERGY_REGEN_MS;

  return gained;
}

// เวลาที่เหลือก่อนได้พลังงานหน่วยถัดไป (มิลลิวินาที)
export function getEnergyCountdownMs() {
  const player = state.player;
  if (player.energy >= player.maxEnergy) return 0;

  const elapsed = Date.now() - player.energyUpdatedAt;
  return Math.max(0, CONFIG.ENERGY_REGEN_MS - elapsed);
}
