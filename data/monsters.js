// =====================================================
// data/monsters.js
// แม่แบบมอนเตอร์ — ค่าพลัง, AI, รางวัล, ของดรอป
//
// หน่วยที่ใช้:  ระยะ = พิกเซลบนแผนที่   ความเร็ว = พิกเซล/วินาที
//              เวลา = วินาที          chance = 0–1
//
// icon = อีโมจิที่วาดบนแผนที่   boss = true → มีมงกุฎ + หลอดเลือดตลอด
// =====================================================

export const MONSTERS = {
  slime: {
    name: "สไลม์",
    icon: "🟢",
    level: 1,
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
      { itemId: "slime_gel", chance: 0.6, qty: [1, 2] },
      { itemId: "enhance_stone", chance: 0.08 },
      { itemId: "small_hp_potion", chance: 0.05 },
      { itemId: "wooden_sword", chance: 0.03 },
      { itemId: "cloth_armor", chance: 0.03 }
    ]
  },

  wolf: {
    name: "หมาป่า",
    icon: "🐺",
    level: 3,
    radius: 18,
    maxHp: 90,
    atk: 12,
    def: 2,
    speed: 95,
    aggroRange: 170,
    attackRange: 30,
    attackCooldown: 1.0,
    exp: 28,
    gold: [6, 12],
    respawnTime: 10,
    drops: [
      { itemId: "wolf_fang", chance: 0.5, qty: [1, 2] },
      { itemId: "enhance_stone", chance: 0.12 },
      { itemId: "small_hp_potion", chance: 0.08 },
      { itemId: "iron_sword", chance: 0.03 },
      { itemId: "leather_armor", chance: 0.03 }
    ]
  },

  goblin: {
    name: "ก๊อบลิน",
    icon: "👹",
    level: 5,
    radius: 18,
    maxHp: 150,
    atk: 18,
    def: 5,
    speed: 80,
    aggroRange: 160,
    attackRange: 30,
    attackCooldown: 1.1,
    exp: 50,
    gold: [10, 20],
    respawnTime: 12,
    drops: [
      { itemId: "goblin_ear", chance: 0.5 },
      { itemId: "enhance_stone", chance: 0.18 },
      { itemId: "small_hp_potion", chance: 0.1 },
      { itemId: "iron_sword", chance: 0.05 },
      { itemId: "leather_armor", chance: 0.05 }
    ]
  },

  bat: {
    name: "ค้างคาว",
    icon: "🦇",
    level: 7,
    radius: 15,
    maxHp: 170,
    atk: 19,
    def: 4,
    speed: 125,          // เร็ว วิ่งหนีไม่ค่อยพ้น
    aggroRange: 170,
    attackRange: 26,
    attackCooldown: 0.8,
    exp: 70,
    gold: [14, 24],
    respawnTime: 12,
    drops: [
      { itemId: "bat_wing", chance: 0.5, qty: [1, 2] },
      { itemId: "small_hp_potion", chance: 0.1 },
      { itemId: "large_hp_potion", chance: 0.03 },
      { itemId: "enhance_stone", chance: 0.25 }
    ]
  },

  scorpion: {
    name: "แมงป่อง",
    icon: "🦂",
    level: 10,
    radius: 22,
    maxHp: 380,
    atk: 32,
    def: 12,
    speed: 60,
    aggroRange: 160,
    attackRange: 36,
    attackCooldown: 1.5,
    exp: 140,
    gold: [35, 60],
    respawnTime: 18,
    drops: [
      { itemId: "scorpion_stinger", chance: 0.5 },
      { itemId: "large_hp_potion", chance: 0.08 },
      { itemId: "enhance_stone", chance: 0.35, qty: [1, 2] },
      { itemId: "desert_blade", chance: 0.03 },
      { itemId: "sand_armor", chance: 0.03 }
    ]
  },

  forest_guardian: {
    name: "ผู้พิทักษ์ป่า",
    icon: "🌳",
    boss: true,
    level: 15,
    radius: 42,
    maxHp: 2500,
    atk: 55,
    def: 20,
    speed: 50,
    aggroRange: 230,
    attackRange: 58,
    attackCooldown: 1.6,
    exp: 900,
    gold: [300, 500],
    respawnTime: 90,
    drops: [
      { itemId: "guardian_heart", chance: 1 },
      { itemId: "large_hp_potion", chance: 1, qty: [2, 3] },
      { itemId: "exp_potion", chance: 0.3 },
      { itemId: "enhance_stone", chance: 1, qty: [3, 5] },
      { itemId: "guardian_axe", chance: 0.15 },
      { itemId: "guardian_armor", chance: 0.15 }
    ]
  }
};
