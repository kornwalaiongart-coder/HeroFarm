// =====================================================
// js/systems/rng.js
// ตัวสุ่มตัวเลขแบบใส่ seed ได้ (mulberry32)
//
// ทำไมไม่ใช้ Math.random ตรงๆ:
// - ใส่ seed เดิม = ได้ผลสุ่มชุดเดิม → ทดสอบซ้ำและตามหาบั๊กได้
// - แผนที่สุ่มต้นไม้/หินจาก seed ทุกเครื่องจึงเห็นเหมือนกัน
// ทุกฟังก์ชันที่ต้องสุ่มจึงรับ rng เป็นพารามิเตอร์ (ค่าเริ่มต้น Math.random)
// =====================================================

export function createRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomRange(rng, min, max) {
  return min + rng() * (max - min);
}

// สุ่มจำนวนเต็มตั้งแต่ min ถึง max (รวมทั้งสองค่า)
export function randomInt(rng, min, max) {
  return Math.floor(min + rng() * (max - min + 1));
}
