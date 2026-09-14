// =====================================================
// data/enemies.js
// ข้อมูลศัตรู — ยังเป็นชุดเดิมจาก game.js
// เพิ่ม goldReward เข้ามา เพื่อให้ทองบนแถบบนขยับได้เวลาทดสอบ
// =====================================================

export const ENEMY_LIST = [
  {
    id: "slime",
    name: "สไลม์ป่า",
    maxHp: 30,
    atk: 4,
    expReward: 15,
    goldReward: 20,
    image: "https://placehold.co/160x160/png?text=Slime"
  },
  {
    id: "wolf",
    name: "หมาป่าเงา",
    maxHp: 45,
    atk: 6,
    expReward: 25,
    goldReward: 35,
    image: "https://placehold.co/160x160/png?text=Wolf"
  },
  {
    id: "golem",
    name: "โกเลมหิน",
    maxHp: 70, // อึดแต่ตีเบา — เดิม 60/8 ทำให้ตัวละครทุกตัวแพ้ 100%
    atk: 4,
    expReward: 40,
    goldReward: 60,
    image: "https://placehold.co/160x160/png?text=Golem"
  }
];
