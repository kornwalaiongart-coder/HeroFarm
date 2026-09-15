// =====================================================
// js/game/characterSprites.js
// ภาพตัวละครจาก assets/characters/*.svg → รูปพร้อมวาดบน canvas
//
// SVG แยกชั้นอุปกรณ์ด้วย <g data-slot="..."> — ไฟล์นี้ซ่อน/แสดงชั้นตามอุปกรณ์ที่สวมอยู่
// แล้วแปลงเป็นรูปเก็บไว้ (cache) ครั้งเดียวต่อชุดอุปกรณ์ ไม่ต้องแปลงใหม่ทุกเฟรม
// =====================================================

const SPRITE_FILES = {
  male: "assets/characters/hero_male.svg",
  female: "assets/characters/hero_female.svg"
};

// ตำแหน่งสำคัญในไฟล์ SVG (viewBox 0 0 400 820) — ใช้จัดวางรูปบนแผนที่
export const SPRITE_LAYOUT = { width: 400, height: 820, centerX: 200, topY: 36, feetY: 773 };

// ช่องอุปกรณ์ในเกม (state.equipped) → ชั้น data-slot ในไฟล์ SVG
// ไม่ได้สวม = ซ่อนชั้นนั้น · ชั้นอื่น (ผม ชุด ถุงมือ รองเท้า ผ้าคลุม) แสดงเสมอ เพราะยังไม่มีไอเทมช่องนั้น
const EQUIPMENT_LAYERS = {
  weapon: "weapon",
  armor: "armor"
};

// ความสูงของรูปที่แปลงไว้ (px) — ใหญ่กว่าตอนวาดบนแผนที่ เพื่อให้คมบนจอความละเอียดสูง
const RASTER_HEIGHT = 200;

const svgTexts = {};        // gender → ข้อความ SVG
const sprites = new Map();  // "gender|weapon,armor" → { canvas | null }
let loadPromise = null;

// โหลดไฟล์ SVG ทั้งหมด (เรียกซ้ำได้ โหลดจริงครั้งเดียว)
// basePath = ตำแหน่งโฟลเดอร์เกมเทียบกับหน้าที่เปิดอยู่ เช่น "../" สำหรับหน้าใน tests/
export function loadCharacterSprites(basePath = "") {
  loadPromise ??= Promise.all(
    Object.entries(SPRITE_FILES).map(async ([gender, file]) => {
      const response = await fetch(basePath + file);
      if (!response.ok) throw new Error(`โหลด ${file} ไม่ได้ (${response.status})`);
      svgTexts[gender] = await response.text();
    })
  ).catch((error) => {
    console.error("โหลดภาพตัวละครไม่สำเร็จ — ใช้ตัวละครแบบวาดง่ายแทน:", error);
  });
  return loadPromise;
}

// คืนรูป (canvas) ของตัวละครที่สวมอุปกรณ์ตามรายการ เช่น ["weapon", "armor"]
// คืน null ถ้ายังไม่พร้อม (ไฟล์ยังโหลดไม่เสร็จ / กำลังแปลงรูป) — ผู้เรียกควรวาดแบบสำรองไปก่อน
export function getCharacterSprite(gender, equippedSlots = []) {
  if (!svgTexts[gender]) return null;

  const visible = Object.keys(EQUIPMENT_LAYERS).filter((slot) => equippedSlots.includes(slot));
  const key = gender + "|" + visible.join(",");

  let entry = sprites.get(key);
  if (!entry) {
    entry = { canvas: null };
    sprites.set(key, entry);
    buildSprite(svgTexts[gender], visible)
      .then((canvas) => (entry.canvas = canvas))
      .catch((error) => console.error("สร้างภาพตัวละครไม่สำเร็จ:", error));
  }
  return entry.canvas;
}

async function buildSprite(svgText, visibleSlots) {
  const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
  if (doc.querySelector("parsererror")) throw new Error("ไฟล์ SVG ตัวละครผิดรูปแบบ");

  // ลบชั้นของอุปกรณ์ที่ไม่ได้สวม
  for (const [slot, layer] of Object.entries(EQUIPMENT_LAYERS)) {
    if (visibleSlots.includes(slot)) continue;
    doc.querySelectorAll(`[data-slot="${layer}"]`).forEach((group) => group.remove());
  }

  const markup = new XMLSerializer().serializeToString(doc.documentElement);
  const image = new Image();
  image.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(markup);
  await image.decode();

  const scale = RASTER_HEIGHT / SPRITE_LAYOUT.height;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(SPRITE_LAYOUT.width * scale);
  canvas.height = RASTER_HEIGHT;
  canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas;
}
