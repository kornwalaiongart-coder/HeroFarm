// =====================================================
// data/maps.js
// แผนที่ในเกม — ขนาด, จุดเกิด, โซนมอนเตอร์, สิ่งกีดขวาง, ประตูวาร์ป
//
// ต้นไม้/หินสุ่มจาก obstacleSeed ทุกครั้งได้ตำแหน่งเดิม
// (ไม่ต้องเก็บตำแหน่งในเซฟ และทุกเครื่องเห็นแผนที่เหมือนกัน)
//
// theme:   สีพื้น/ต้นไม้/หิน (ดู THEMES ใน js/game/render.js)
// level:   เลเวลแนะนำ แสดงที่ประตูที่พามาแผนที่นี้
// portals: เดินเข้าไป = ย้ายไปแผนที่ "to" (ทุกประตูต้องมีประตูกลับฝั่งโน้น)
//
// เส้นทาง: ป่าเริ่มต้น → ป่าลึก → ถ้ำ → ทะเลทราย → ป่าผู้พิทักษ์ (บอส)
// =====================================================

export const MAPS = {
  beginner_forest: {
    id: "beginner_forest",
    name: "🌱 ป่าเริ่มต้น",
    level: 1,
    theme: "grass",
    width: 2000,
    height: 1500,

    // จุดเกิด/จุดฟื้นคืนชีพ มอนเตอร์เข้ามาในรัศมีนี้ไม่ได้
    spawn: { x: 220, y: 750 },
    safeRadius: 170,

    obstacleSeed: 42,
    trees: 45,
    rocks: 20,

    zones: [
      // โซนแรกติดจุดพัก — มือใหม่เลือดน้อยเดินกลับไปฟื้นได้ใกล้ๆ
      { monsterId: "slime", label: "🟢 ทุ่งสไลม์ Lv.1+", x: 640, y: 760, radius: 300, count: 6 },
      { monsterId: "slime", label: "🟢 ทุ่งสไลม์ Lv.1+", x: 1250, y: 1050, radius: 320, count: 6 }
    ],
    portals: [
      { to: "forest", x: 1930, y: 750 }
    ]
  },

  forest: {
    id: "forest",
    name: "🌲 ป่าลึก",
    level: 3,
    theme: "forest",
    width: 2000,
    height: 1500,
    spawn: { x: 220, y: 750 },
    safeRadius: 170,
    obstacleSeed: 7,
    trees: 70,
    rocks: 10,
    zones: [
      { monsterId: "wolf", label: "🐺 ดงหมาป่า Lv.3+", x: 800, y: 450, radius: 300, count: 6 },
      { monsterId: "goblin", label: "👹 ค่ายก๊อบลิน Lv.5+", x: 1350, y: 1050, radius: 300, count: 6 }
    ],
    portals: [
      { to: "beginner_forest", x: 70, y: 750 },
      { to: "cave", x: 1930, y: 750 }
    ]
  },

  cave: {
    id: "cave",
    name: "🕳️ ถ้ำมืด",
    level: 7,
    theme: "cave",
    width: 2000,
    height: 1500,
    spawn: { x: 220, y: 750 },
    safeRadius: 170,
    obstacleSeed: 13,
    trees: 0,
    rocks: 55,
    zones: [
      { monsterId: "bat", label: "🦇 รังค้างคาว Lv.7+", x: 900, y: 480, radius: 320, count: 7 },
      { monsterId: "bat", label: "🦇 รังค้างคาว Lv.7+", x: 1350, y: 1100, radius: 280, count: 6 }
    ],
    portals: [
      { to: "forest", x: 70, y: 750 },
      { to: "desert", x: 1930, y: 750 }
    ]
  },

  desert: {
    id: "desert",
    name: "🏜️ ทะเลทราย",
    level: 10,
    theme: "desert",
    width: 2000,
    height: 1500,
    spawn: { x: 220, y: 750 },
    safeRadius: 170,
    obstacleSeed: 21,
    trees: 0,
    rocks: 25,
    zones: [
      { monsterId: "scorpion", label: "🦂 เนินแมงป่อง Lv.10+", x: 900, y: 1000, radius: 300, count: 5 },
      { monsterId: "scorpion", label: "🦂 เนินแมงป่อง Lv.10+", x: 1400, y: 450, radius: 300, count: 5 }
    ],
    portals: [
      { to: "cave", x: 70, y: 750 },
      { to: "guardian_grove", x: 1930, y: 750 }
    ]
  },

  guardian_grove: {
    id: "guardian_grove",
    name: "🌳 ป่าผู้พิทักษ์ (บอส)",
    level: 15,
    theme: "forest",
    width: 1400,
    height: 1000,
    spawn: { x: 200, y: 500 },
    safeRadius: 150,
    obstacleSeed: 99,
    trees: 25,
    rocks: 6,
    zones: [
      { monsterId: "forest_guardian", label: "👑 ผู้พิทักษ์ป่า Lv.15 (บอส)", x: 950, y: 500, radius: 160, count: 1 }
    ],
    portals: [
      { to: "desert", x: 70, y: 500 }
    ]
  }
};

export const START_MAP_ID = "beginner_forest";
