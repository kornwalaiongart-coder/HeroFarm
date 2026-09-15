// =====================================================
// js/game/swingAnimation.js
// ท่าฟันอาวุธของผู้เล่น — คำนวณท่าอย่างเดียว ไม่วาด (render.js เอาไปใช้)
//
// เวลา (วินาที นับจากกดโจมตี):
//   0.00–0.11  ฟัน    : อาวุธเหวี่ยงจากด้านหลังเหนือไหล่ ข้ามหัวลงมาด้านหน้า (เร็วแล้วชะลอ)
//                       ตัวเอนไปข้างหน้า ก้าวไปทางที่หัน ตัวยุบ-ยืดตามแรงกระแทก
//   0.11–0.34  คืนท่า : อาวุธเลยไปนิดแล้วกลับลงข้างตัว ตัวกลับตั้งตรง รอยฟันค่อยๆ จาง
//
// หน่วยมุม = องศา หมุนตามเข็มนาฬิกา · 0 = ท่าถืออาวุธปกติตามภาพ
// ค่าทั้งหมดคิดแบบ "ด้านหน้า = ด้านขวา" — render.js กลับด้านให้เองถ้าอาวุธอยู่ซ้าย
// =====================================================

export const SWING_TIMING = {
  strike: 0.11,
  recover: 0.23
};

const WINDUP_ANGLE = 130;   // อาวุธยกไปด้านหลังเหนือไหล่
const STRIKE_ANGLE = 320;   // ฟันข้ามหัวลงมาเลยด้านหน้า
const REST_ANGLE = 360;     // กลับท่าถือปกติ (360° = 0°)

const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const easeInOutSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
const lerp = (from, to, t) => from + (to - from) * t;

// elapsed = วินาทีนับจากเริ่มฟัน
// คืน null ถ้าไม่ได้ฟันอยู่ หรือ
// { weaponAngle, lean (องศา + = เอนไปข้างหน้า), step (px + = ก้าวไปข้างหน้า),
//   squash (0–0.06 ยุบตัว), trail: { from, to, alpha } มุมของรอยฟัน }
export function getSwingPose(elapsed) {
  const { strike, recover } = SWING_TIMING;
  if (!(elapsed >= 0) || elapsed > strike + recover) return null;

  if (elapsed <= strike) {
    const t = easeOutCubic(elapsed / strike);
    const angle = lerp(WINDUP_ANGLE, STRIKE_ANGLE, t);
    return {
      weaponAngle: angle,
      lean: lerp(-4, 9, t),
      step: lerp(-2, 7, t),
      squash: Math.sin(t * Math.PI) * 0.06,
      trail: { from: WINDUP_ANGLE, to: angle, alpha: 0.6 }
    };
  }

  const t = easeInOutSine((elapsed - strike) / recover);
  return {
    weaponAngle: lerp(STRIKE_ANGLE, REST_ANGLE, t),
    lean: lerp(9, 0, t),
    step: lerp(7, 0, t),
    squash: 0,
    trail: { from: lerp(WINDUP_ANGLE, STRIKE_ANGLE, t * 0.8), to: STRIKE_ANGLE, alpha: 0.6 * (1 - t) }
  };
}
