// =====================================================
// data/characters.js
// "แม่แบบ" ของตัวละคร — ข้อมูลที่ไม่เปลี่ยนระหว่างเล่น
// อยากแก้ชื่อ / รูป / ค่าพลัง → แก้ที่ไฟล์นี้ไฟล์เดียว
//
// ค่าพลังจริงคำนวณจากสูตร:  ค่าฐาน + ค่าเติบโต × (เลเวล − 1)
// เซฟของผู้เล่นเก็บแค่ id / level / exp เท่านั้น
// ปรับสมดุลที่ไฟล์นี้แล้วจึงมีผลกับผู้เล่นที่มีเซฟอยู่แล้วทันที
// =====================================================

export const CHARACTER_DEFS = [
  {
    id: "knight_moon",
    name: "อัศวินแสงจันทร์",
    image: "https://placehold.co/160x160/png?text=Knight",
    baseHp: 24,
    hpPerLevel: 4,
    baseAtk: 4,
    atkPerLevel: 1
  },
  {
    id: "archer_forest",
    name: "นักธนูป่าเขียว",
    image: "https://placehold.co/160x160/png?text=Archer",
    baseHp: 24,
    hpPerLevel: 3,
    baseAtk: 6,
    atkPerLevel: 2
  },
  {
    id: "mage_flame",
    name: "จอมเวทเปลวไฟ",
    image: "https://placehold.co/160x160/png?text=Mage",
    baseHp: 13,
    hpPerLevel: 2,
    baseAtk: 8,
    atkPerLevel: 1
  },
  {
    id: "priest_gold",
    name: "นักบวชแสงทอง",
    image: "https://placehold.co/160x160/png?text=Priest",
    baseHp: 30,
    hpPerLevel: 5,
    baseAtk: 3,
    atkPerLevel: 1
  }
];

// ตัวละครที่ผู้เล่นใหม่ได้รับ พร้อมเลเวลเริ่มต้น
// (ค่าพลังที่เลเวลเหล่านี้เท่ากับของเดิมใน Phase 1 ทุกตัว)
export const STARTER_ROSTER = [
  { id: "knight_moon", level: 5 },
  { id: "archer_forest", level: 3 },
  { id: "mage_flame", level: 7 },
  { id: "priest_gold", level: 4 }
];
