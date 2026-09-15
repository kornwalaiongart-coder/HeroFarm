// =====================================================
// js/game/characterSprites.js
// ภาพตัวละคร → รูปพร้อมวาดบน canvas
//
// รองรับ 2 แบบ (กำหนดต่อตัวละครใน CHARACTER_SOURCES):
//
// 1) SVG แยกชั้นอุปกรณ์ (.svg) — แบบเต็มระบบ
//    - ชั้น <g data-slot="..."> ซ่อน/แสดงตามอุปกรณ์ที่สวมอยู่
//    - ส่วนที่ขยับตอนโจมตี (ดู swingAnimation.js) — เลือกอย่างใดอย่างหนึ่ง:
//        <g data-part="weapon-arm" data-shoulder="140 262" data-tip="94 708"> แขนทั้งแขน (แนะนำ)
//        <g data-slot="weapon" data-pivot="128 437" data-tip="94 708">          อาวุธอย่างเดียว
//    - ภาพถูกแบ่ง 3 แผ่นตามลำดับชั้น: ด้านหลัง → ส่วนที่ขยับ → ด้านหน้า (ผ้าคลุม ผมหน้า)
//
// 2) ภาพ PNG ทั้งตัว (.png) — ภาพนิ่ง
//    - ไม่เปลี่ยนตามอุปกรณ์ แขนไม่ขยับ (ตัวยังเอน/ก้าวตามท่าฟันได้)
//    - ต้องบอก layout: ขนาดภาพ + ตำแหน่งกึ่งกลางตัว / บนสุด / พื้นรองเท้า (หน่วย px ของภาพ)
//
// ทุกภาพถูกแปลงเป็นรูปเก็บไว้ (cache) ครั้งเดียวต่อชุดอุปกรณ์ ไม่ต้องแปลงใหม่ทุกเฟรม
// =====================================================

// ตำแหน่งสำคัญในไฟล์ SVG ตัวละคร (viewBox 0 0 400 820)
export const SPRITE_LAYOUT = { width: 400, height: 820, centerX: 200, topY: 36, feetY: 773 };

const CHARACTER_SOURCES = {
  male: { file: "assets/characters/hero_male.svg" },

  // ภาพจาก character sheet (ตัดพื้นหลังแล้ว) — ภาพนิ่ง ถือไม้เท้าข้างซ้ายของภาพ
  // อยากกลับไปใช้แบบแยกชั้นอุปกรณ์: เปลี่ยนเป็น { file: "assets/characters/hero_female.svg" }
  female: {
    file: "assets/characters/hero_female.png",
    layout: { width: 270, height: 720, centerX: 170, topY: 0, feetY: 720 },
    weaponSide: -1
  }
};

// ช่องอุปกรณ์ในเกม (state.equipped) → ชั้น data-slot ในไฟล์ SVG
// ไม่ได้สวม = ซ่อนชั้นนั้น · ชั้นอื่น (ผม ชุด ถุงมือ รองเท้า ผ้าคลุม) แสดงเสมอ เพราะยังไม่มีไอเทมช่องนั้น
const EQUIPMENT_LAYERS = {
  weapon: "weapon",
  armor: "armor"
};

// ความสูงของรูปที่แปลงไว้ (px) — ใหญ่กว่าตอนวาดบนแผนที่ เพื่อให้คมบนจอความละเอียดสูง
const RASTER_HEIGHT = 200;

const loaded = {};          // gender → { svgText } หรือ { image }
const sprites = new Map();  // "gender|weapon,armor" → { sprite | null }
let loadPromise = null;

const isPng = (file) => file.toLowerCase().endsWith(".png");

// โหลดไฟล์ภาพตัวละครทั้งหมด (เรียกซ้ำได้ โหลดจริงครั้งเดียว)
// basePath = ตำแหน่งโฟลเดอร์เกมเทียบกับหน้าที่เปิดอยู่ เช่น "../" สำหรับหน้าใน tests/
export function loadCharacterSprites(basePath = "") {
  loadPromise ??= Promise.all(
    Object.entries(CHARACTER_SOURCES).map(async ([gender, source]) => {
      try {
        if (isPng(source.file)) {
          const image = new Image();
          image.src = basePath + source.file;
          await image.decode();
          loaded[gender] = { image };
        } else {
          const response = await fetch(basePath + source.file);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          loaded[gender] = { svgText: await response.text() };
        }
      } catch (error) {
        console.error(`โหลดภาพตัวละคร ${source.file} ไม่สำเร็จ — ใช้ตัวละครแบบวาดง่ายแทน:`, error);
      }
    })
  );
  return loadPromise;
}

// คืนภาพตัวละครที่สวมอุปกรณ์ตามรายการ เช่น ["weapon", "armor"]
//   {
//     back:   canvas         ชั้นที่อยู่หลังส่วนที่ขยับ (หรือทั้งตัว ถ้าไม่มีส่วนที่ขยับ)
//     moving: canvas | null  ส่วนที่ขยับตอนโจมตี (แขน+อาวุธ หรืออาวุธอย่างเดียว)
//     front:  canvas | null  ชั้นที่อยู่หน้าส่วนที่ขยับ
//     pivot:  {x,y} | null   จุดหมุนของส่วนที่ขยับ (หน่วยเดียวกับ layout)
//     tip:    {x,y} | null   ปลายอาวุธ (null = ไม่ต้องวาดรอยฟัน)
//     weaponSide: -1 | 1     มือถืออาวุธอยู่ซ้าย (-1) หรือขวา (1) ของภาพ
//     layout: { width, height, centerX, topY, feetY }   ใช้จัดวางบนแผนที่
//   }
// คืน null ถ้ายังไม่พร้อม (ไฟล์ยังโหลดไม่เสร็จ / กำลังแปลงรูป) — ผู้เรียกควรวาดแบบสำรองไปก่อน
export function getCharacterSprite(gender, equippedSlots = []) {
  const data = loaded[gender];
  if (!data) return null;

  // ภาพ PNG ไม่เปลี่ยนตามอุปกรณ์ → ใช้รูปเดียว
  const visible = data.image ? [] : Object.keys(EQUIPMENT_LAYERS).filter((slot) => equippedSlots.includes(slot));
  const key = gender + "|" + visible.join(",");

  let entry = sprites.get(key);
  if (!entry) {
    entry = { sprite: null };
    sprites.set(key, entry);
    const build = data.image
      ? buildPngSprite(data.image, CHARACTER_SOURCES[gender])
      : buildSvgSprite(data.svgText, visible);
    build
      .then((sprite) => (entry.sprite = sprite))
      .catch((error) => console.error("สร้างภาพตัวละครไม่สำเร็จ:", error));
  }
  return entry.sprite;
}

// ---------- ภาพ PNG (ภาพนิ่ง) ----------
async function buildPngSprite(image, source) {
  const layout = source.layout;
  const scale = RASTER_HEIGHT / layout.height;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(layout.width * scale);
  canvas.height = RASTER_HEIGHT;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

  return { back: canvas, moving: null, front: null, pivot: null, tip: null, weaponSide: source.weaponSide ?? 1, layout };
}

// ---------- ภาพ SVG แยกชั้น ----------
// "128 437" → { x: 128, y: 437 }
function parsePoint(text) {
  const [x, y] = (text ?? "").trim().split(/[\s,]+/).map(Number);
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
}

async function buildSvgSprite(svgText, visibleSlots) {
  const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
  if (doc.querySelector("parsererror")) throw new Error("ไฟล์ SVG ตัวละครผิดรูปแบบ");
  const root = doc.documentElement;

  // ---- หาส่วนที่ขยับ + จุดหมุน (อ่านก่อนลบชั้น — ถอดอาวุธแล้วยังต้องรู้ว่ามือถืออาวุธอยู่ด้านไหน) ----
  const arm = root.querySelector('[data-part="weapon-arm"]');
  const weaponGroup = root.querySelector('[data-slot="weapon"]');
  const movingPart = arm ?? weaponGroup;
  const pivot = parsePoint(arm ? arm.getAttribute("data-shoulder") : weaponGroup?.getAttribute("data-pivot"));
  const tip = parsePoint(movingPart?.getAttribute("data-tip"));
  const weaponSide = pivot && pivot.x < SPRITE_LAYOUT.centerX ? -1 : 1;

  // ---- ลบชั้นของอุปกรณ์ที่ไม่ได้สวม ----
  for (const [slot, layer] of Object.entries(EQUIPMENT_LAYERS)) {
    if (visibleSlots.includes(slot)) continue;
    doc.querySelectorAll(`[data-slot="${layer}"]`).forEach((group) => group.remove());
  }

  const holdingWeapon = visibleSlots.includes("weapon") && weaponGroup !== null;
  // แขนขยับได้เสมอ (ถึงไม่ถืออาวุธ) · แบบอาวุธอย่างเดียว ต้องถืออาวุธอยู่
  // ส่วนที่ขยับต้องเป็นกลุ่มระดับบนสุดของ <svg> ถึงจะแบ่งหน้า/หลังได้
  const canMove = pivot !== null && movingPart?.parentNode === root && (arm !== null || holdingWeapon);
  if (!canMove) {
    return { back: await rasterize(doc), moving: null, front: null, pivot: null, tip: null, weaponSide, layout: SPRITE_LAYOUT };
  }

  // ---- แบ่ง 3 แผ่นตามลำดับชั้นในไฟล์ ----
  const index = [...root.children].indexOf(movingPart);
  const onlyChildren = (keep) => {
    const copy = doc.cloneNode(true);
    [...copy.documentElement.children].forEach((child, i) => {
      if (child.localName !== "defs" && !keep(i)) child.remove();
    });
    return copy;
  };
  const hasFront = [...root.children].slice(index + 1).some((child) => child.localName !== "defs");

  return {
    back: await rasterize(onlyChildren((i) => i < index)),
    moving: await rasterize(onlyChildren((i) => i === index)),
    front: hasFront ? await rasterize(onlyChildren((i) => i > index)) : null,
    pivot,
    tip: holdingWeapon ? tip : null,
    weaponSide,
    layout: SPRITE_LAYOUT
  };
}

async function rasterize(doc) {
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
