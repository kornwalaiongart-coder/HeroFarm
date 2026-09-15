// =====================================================
// data/monsters.js
// แม่แบบมอนเตอร์ — ค่าพลัง, AI, รางวัล, ของดรอป
//
// หน่วยที่ใช้:  ระยะ = พิกเซลบนแผนที่   ความเร็ว = พิกเซล/วินาที
//              เวลา = วินาที          chance = 0–1
// =====================================================

export const MONSTERS = {
  slime: {
    name: "สไลม์ป่า",
    level: 1,
    color: "#6fcf97",
    radius: 16,
    maxHp: 40,
    atk: 6,
    def: 0,
    speed: 55,
    aggroRange: 120,     // ผู้เล่นเข้าใกล้ระยะนี้ → ไล่ตาม
    attackRange: 26,
    attackCooldown: 1.2,
    exp: 12,
    gold: [3, 6],
    respawnTime: 6,
    drops: [
      { itemId: "slime_jelly", chance: 0.6, qty: [1, 2] },
      { itemId: "enhance_stone", chance: 0.08 },
      { itemId: "wood_sword", chance: 0.03 },
      { itemId: "cloth_armor", chance: 0.03 }
    ]
  },

  wolf: {
    name: "หมาป่าเงา",
    level: 4,
    color: "#6c6f93",
    radius: 18,
    maxHp: 110,
    atk: 14,
    def: 3,
    speed: 95,
    aggroRange: 170,
    attackRange: 30,
    attackCooldown: 1.0,
    exp: 35,
    gold: [8, 15],
    respawnTime: 10,
    drops: [
      { itemId: "wolf_fang", chance: 0.5, qty: [1, 2] },
      { itemId: "enhance_stone", chance: 0.15 },
      { itemId: "iron_sword", chance: 0.04 },
      { itemId: "leather_armor", chance: 0.04 }
    ]
  },

  golem: {
    name: "โกเลมหิน",
    level: 9,
    color: "#a58b6f",
    radius: 26,
    maxHp: 320,
    atk: 26,
    def: 8,
    speed: 40,
    aggroRange: 150,
    attackRange: 40,
    attackCooldown: 1.8,
    exp: 110,
    gold: [30, 50],
    respawnTime: 20,
    drops: [
      { itemId: "golem_core", chance: 0.5 },
      { itemId: "enhance_stone", chance: 0.35, qty: [1, 2] },
      { itemId: "golem_hammer", chance: 0.03 },
      { itemId: "stone_armor", chance: 0.03 }
    ]
  }
};
