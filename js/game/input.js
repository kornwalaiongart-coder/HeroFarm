// =====================================================
// js/game/input.js
// รวมการควบคุมทุกแบบ เป็นค่าเดียวที่โลกในเกมอ่าน:
//   { moveX, moveY, attack }   moveX/moveY อยู่ระหว่าง -1 ถึง 1
//
// คอม:    WASD / ลูกศร = เดิน   Space / J = โจมตี
// มือถือ: จอยสติ๊กซ้ายล่าง = เดิน   ปุ่มขวาล่าง = โจมตี
// =====================================================

const keys = new Set();
const joystick = { x: 0, y: 0, pointerId: null };
let attackHeld = false;

const GAME_KEYS = new Set([
  "KeyW", "KeyA", "KeyS", "KeyD", "KeyJ", "Space",
  "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"
]);

// กำลังพิมพ์ในช่องข้อความอยู่ → ไม่นับเป็นการควบคุมเกม
function isTyping(event) {
  return event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement;
}

export function clearInput() {
  keys.clear();
  joystick.x = 0;
  joystick.y = 0;
  joystick.pointerId = null;
  attackHeld = false;
}

export function initInput({ joystickEl, knobEl, attackButton }) {
  window.addEventListener("keydown", (event) => {
    if (isTyping(event)) return;
    keys.add(event.code);
    if (GAME_KEYS.has(event.code)) event.preventDefault();
  });
  window.addEventListener("keyup", (event) => keys.delete(event.code));
  // สลับแท็บขณะกดปุ่มค้าง → keyup ไม่มา ตัวละครจะเดินไม่หยุด
  window.addEventListener("blur", clearInput);

  // ---------- จอยสติ๊ก ----------
  const updateJoystick = (event) => {
    const rect = joystickEl.getBoundingClientRect();
    const maxDistance = rect.width / 2;
    let dx = event.clientX - (rect.left + rect.width / 2);
    let dy = event.clientY - (rect.top + rect.height / 2);

    const distance = Math.hypot(dx, dy);
    if (distance > maxDistance) {
      dx = (dx / distance) * maxDistance;
      dy = (dy / distance) * maxDistance;
    }

    joystick.x = dx / maxDistance;
    joystick.y = dy / maxDistance;
    knobEl.style.transform = `translate(${dx}px, ${dy}px)`;
  };

  const releaseJoystick = (event) => {
    if (event.pointerId !== joystick.pointerId) return;
    joystick.pointerId = null;
    joystick.x = 0;
    joystick.y = 0;
    knobEl.style.transform = "";
  };

  joystickEl.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    joystick.pointerId = event.pointerId;
    joystickEl.setPointerCapture(event.pointerId);
    updateJoystick(event);
  });
  joystickEl.addEventListener("pointermove", (event) => {
    if (event.pointerId === joystick.pointerId) updateJoystick(event);
  });
  joystickEl.addEventListener("pointerup", releaseJoystick);
  joystickEl.addEventListener("pointercancel", releaseJoystick);

  // ---------- ปุ่มโจมตี (กดค้าง = ตีต่อเนื่อง) ----------
  attackButton.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    attackHeld = true;
    attackButton.setPointerCapture(event.pointerId);
  });
  for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) {
    attackButton.addEventListener(type, () => (attackHeld = false));
  }
}

export function readInput() {
  const pressed = (...codes) => codes.some((code) => keys.has(code));

  let moveX = (pressed("KeyD", "ArrowRight") ? 1 : 0) - (pressed("KeyA", "ArrowLeft") ? 1 : 0);
  let moveY = (pressed("KeyS", "ArrowDown") ? 1 : 0) - (pressed("KeyW", "ArrowUp") ? 1 : 0);

  if (moveX !== 0 || moveY !== 0) {
    // เดินเฉียงต้องไม่เร็วกว่าเดินตรง
    const length = Math.hypot(moveX, moveY);
    moveX /= length;
    moveY /= length;
  } else {
    moveX = joystick.x;
    moveY = joystick.y;
  }

  return {
    moveX,
    moveY,
    attack: attackHeld || pressed("Space", "KeyJ")
  };
}
