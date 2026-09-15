// =====================================================
// js/systems/player.js
// สร้างตัวละคร: ชื่อ + เพศ + อุปกรณ์เริ่มต้น
// =====================================================

import { state } from "../state.js";
import { STARTER_EQUIPMENT } from "../../data/items.js";
import { addEquipment, equip } from "./inventory.js";

export const GENDERS = {
  male: { label: "ชาย", icon: "👦" },
  female: { label: "หญิง", icon: "👧" }
};

export const NAME_MIN = 2;
export const NAME_MAX = 12;

// คืนข้อความบอกว่าผิดตรงไหน หรือ null ถ้าชื่อใช้ได้
export function validateName(name) {
  const trimmed = name.trim();
  if (trimmed.length < NAME_MIN) return "ชื่อต้องยาวอย่างน้อย " + NAME_MIN + " ตัวอักษร";
  if (trimmed.length > NAME_MAX) return "ชื่อยาวได้ไม่เกิน " + NAME_MAX + " ตัวอักษร";
  return null;
}

export function createCharacter(name, gender) {
  if (validateName(name)) throw new Error("ชื่อไม่ถูกต้อง");
  if (!GENDERS[gender]) throw new Error("เพศไม่ถูกต้อง");

  state.profile = { name: name.trim(), gender, createdAt: Date.now() };

  // ผู้เล่นเดิมที่แปลงเซฟมาอาจมีอุปกรณ์อยู่แล้ว ให้ของเริ่มต้นเฉพาะคนที่ยังไม่มี
  if (state.inventory.equipment.length === 0) {
    for (const itemId of STARTER_EQUIPMENT) {
      equip(addEquipment(itemId).uid);
    }
  }
}
