// =====================================================
// data/maps.js
// แผนที่ในเกม — ขนาด, จุดเกิด, โซนมอนเตอร์, สิ่งกีดขวาง
//
// ต้นไม้/หินสุ่มจาก obstacleSeed ทุกครั้งได้ตำแหน่งเดิม
// (ไม่ต้องเก็บตำแหน่งในเซฟ และทุกเครื่องเห็นแผนที่เหมือนกัน)
// =====================================================

export const MAPS = {
  meadow: {
    id: "meadow",
    name: "ทุ่งหญ้าเริ่มต้น",
    width: 2000,
    height: 1500,
    groundColor: "#8fcf6a",
    groundAltColor: "#86c562",

    // จุดเกิด/จุดฟื้นคืนชีพ มอนเตอร์เข้ามาในรัศมีนี้ไม่ได้
    spawn: { x: 220, y: 750 },
    safeRadius: 170,

    obstacleSeed: 42,
    trees: 45,
    rocks: 20,

    // ยิ่งไกลจากจุดเกิด มอนเตอร์ยิ่งเก่ง
    zones: [
      { monsterId: "slime", label: "ทุ่งสไลม์ Lv.1+", x: 640, y: 760, radius: 300, count: 8 },
      { monsterId: "wolf", label: "ป่าหมาป่า Lv.4+", x: 1260, y: 420, radius: 300, count: 6 },
      { monsterId: "golem", label: "ลานหินโกเลม Lv.9+", x: 1660, y: 1120, radius: 250, count: 3 }
    ]
  }
};

export const START_MAP_ID = "meadow";
