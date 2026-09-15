// =====================================================
// js/state.js
// "สมุดบันทึกกลาง" ของเกม — ข้อมูลที่ต้องเซฟทั้งหมดอยู่ที่นี่ที่เดียว
//
// กฎสำคัญ:
// - ตัวเลขที่เห็นบนหน้าจอเป็นแค่ "ภาพสะท้อน" ของ state
// - ข้อมูลที่คำนวณได้ (ค่าพลัง, ตำแหน่งมอนเตอร์) ไม่เก็บใน state
//   ค่าพลังอยู่ที่ systems/stats.js ส่วนโลกในเกมอยู่ที่ game/world.js
// =====================================================

import { START_MAP_ID } from "../data/maps.js";

// ---------- ค่าคงที่ของเกม ----------
export const CONFIG = {
  SAVE_VERSION: 3,        // เปลี่ยนโครงสร้างเซฟเมื่อไหร่ ต้องเพิ่มเลขนี้ + เขียน migration ใน save.js
  START_GOLD: 1250,
  START_GEM: 85,
  AUTOSAVE_MS: 10_000     // เซฟอัตโนมัติทุกกี่มิลลิวินาที (ถ้ามีอะไรเปลี่ยน)
};

// ---------- หน้าตาของเกมตอนเริ่มใหม่ ----------
export function createNewState() {
  return {
    version: CONFIG.SAVE_VERSION,

    // null = ยังไม่ได้สร้างตัวละคร → เกมจะเปิดหน้าสร้างตัวละคร
    // { name, gender: "male" | "female", createdAt }
    profile: null,

    player: {
      level: 1,
      exp: 0,
      gold: CONFIG.START_GOLD,
      gem: CONFIG.START_GEM
    },

    inventory: {
      materials: {},   // { itemId: จำนวน }
      equipment: []    // [{ uid, itemId, plus }]
    },

    equipped: {
      weapon: null,    // uid ของอุปกรณ์ที่สวม
      armor: null
    },

    // แผนที่ที่อยู่ล่าสุด — โหลดเกมแล้วกลับมาที่เดิม (เกิดที่จุดพักของแผนที่นั้น)
    mapId: START_MAP_ID,

    // สมุดสะสม
    //   discovered     = ไอเทมที่เคยได้ { itemId: เวลาที่ได้ครั้งแรก }
    //   claimedRewards = รางวัลที่กดรับแล้ว { rewardId: เวลาที่กดรับ }
    collection: { discovered: {}, claimedRewards: {} },

    // เลขประจำตัวอุปกรณ์ชิ้นถัดไป (อุปกรณ์ชนิดเดียวกันหลายชิ้นต้องแยกกันได้)
    nextUid: 1,

    lastSavedAt: null
  };
}

// state จริงที่เกมใช้งาน เริ่มจากเกมใหม่ก่อน แล้ว save.js จะโหลดทับถ้ามีเซฟเดิม
export let state = createNewState();

export function replaceState(newState) {
  state = newState;
}

// EXP ที่ผู้เล่นต้องใช้เพื่อขึ้นเลเวลถัดไป
export function getPlayerExpNeeded(level) {
  return Math.floor(100 * Math.pow(level, 1.5));
}

// =====================================================
// ฟังก์ชันแก้ไข state — ทุกระบบต้องเรียกผ่านฟังก์ชันเหล่านี้
// =====================================================

export function addGold(amount) {
  state.player.gold = Math.max(0, state.player.gold + amount);
}

export function addGem(amount) {
  state.player.gem = Math.max(0, state.player.gem + amount);
}

// คืนจำนวนเลเวลที่ขึ้น (0 = ไม่ขึ้น)
export function addPlayerExp(amount) {
  const player = state.player;
  player.exp += amount;

  let levelsGained = 0;
  while (player.exp >= getPlayerExpNeeded(player.level)) {
    player.exp -= getPlayerExpNeeded(player.level);
    player.level += 1;
    levelsGained += 1;
  }

  return levelsGained;
}
