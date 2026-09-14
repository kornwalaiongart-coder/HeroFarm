// =====================================================
// data/characters.js
// เก็บ "ข้อมูลดิบ" ของตัวละคร แยกออกจากโค้ดที่ทำงาน
// อยากแก้ชื่อ / พลังโจมตี / รูป → แก้ที่ไฟล์นี้ไฟล์เดียว
// =====================================================

export const STARTER_CHARACTERS = [
  {
    id: "knight_moon",
    name: "อัศวินแสงจันทร์",
    level: 5,
    exp: 0,
    maxHp: 40,
    atk: 8,
    image: "https://placehold.co/160x160/png?text=Knight"
  },
  {
    id: "archer_forest",
    name: "นักธนูป่าเขียว",
    level: 3,
    exp: 0,
    maxHp: 30,
    atk: 10,
    image: "https://placehold.co/160x160/png?text=Archer"
  },
  {
    id: "mage_flame",
    name: "จอมเวทเปลวไฟ",
    level: 7,
    exp: 0,
    maxHp: 25,
    atk: 14,
    image: "https://placehold.co/160x160/png?text=Mage"
  },
  {
    id: "priest_gold",
    name: "นักบวชแสงทอง",
    level: 4,
    exp: 0,
    maxHp: 45,
    atk: 6,
    image: "https://placehold.co/160x160/png?text=Priest"
  }
];
