// =====================================================
// js/systems/collectionRewards.js
// รางวัลสมุดสะสม — สะสมไอเทมครบหมวดแล้วกดรับทอง / เพชร / เหรียญตรา
//
// รายการรางวัลอยู่ที่ data/collectionRewards.js
// โครงสร้างใน state:
//   collection.claimedRewards = { rewardId: เวลาที่กดรับ (ms) }
// =====================================================

import { state, addGold, addGem } from "../state.js";
import { ITEMS, ITEM_TYPES, getCollectionItems } from "./itemDatabase.js";
import { isDiscovered } from "./collection.js";
import { addLoot } from "./inventory.js";
import { COLLECTION_REWARDS } from "../../data/collectionRewards.js";

export { COLLECTION_REWARDS };

// ---------- ตรวจข้อมูลรางวัล ----------
// คืนรายการข้อความ error (array ว่าง = ถูกต้อง)
export function validateCollectionRewards(rewards = COLLECTION_REWARDS) {
  const errors = [];
  const seenIds = new Set();

  for (const reward of rewards) {
    const fail = (message) => errors.push(`รางวัล ${reward?.id ?? "(ไม่มี id)"}: ${message}`);

    if (typeof reward?.id !== "string" || !reward.id) fail("ต้องมี id");
    else if (seenIds.has(reward.id)) fail("id ซ้ำ");
    seenIds.add(reward?.id);

    if (reward.type !== null && !Object.hasOwn(ITEM_TYPES, reward.type)) {
      fail(`type "${reward.type}" ไม่มีในระบบ (ใช้ชื่อหมวดใน ITEM_TYPES หรือ null = ทุกหมวด)`);
    } else if (getCollectionItems(reward.type).length === 0) {
      fail("หมวดนี้ไม่มีไอเทมให้สะสม");
    }

    for (const key of ["gold", "gem"]) {
      if (reward[key] !== undefined && (!Number.isInteger(reward[key]) || reward[key] < 0)) fail(`${key} ต้องเป็นจำนวนเต็ม 0 ขึ้นไป`);
    }

    if (reward.itemId !== undefined) {
      const item = ITEMS[reward.itemId];
      if (!item) fail(`ไม่มีไอเทม ${reward.itemId}`);
      else if (!item.tags.includes("reward")) fail(`ไอเทม ${reward.itemId} ต้องมีป้าย "reward" (ไม่งั้นจะนับในสมุดสะสม)`);
    }
  }
  return errors;
}

const rewardErrors = validateCollectionRewards();
if (rewardErrors.length > 0) {
  throw new Error("[COLLECTION REWARDS] ข้อมูลใน data/collectionRewards.js ไม่ถูกต้อง:\n- " + rewardErrors.join("\n- "));
}

// ---------- สถานะรางวัล ----------
export function isRewardClaimed(rewardId) {
  return Object.hasOwn(state.collection.claimedRewards, rewardId);
}

// คืน [{ ...ข้อมูลรางวัล, found, total, complete, claimed }]
export function getRewardStatuses() {
  return COLLECTION_REWARDS.map((reward) => {
    const items = getCollectionItems(reward.type);
    const found = items.filter((item) => isDiscovered(item.id)).length;
    return { ...reward, found, total: items.length, complete: found === items.length, claimed: isRewardClaimed(reward.id) };
  });
}

// จำนวนรางวัลที่สะสมครบแล้วแต่ยังไม่กดรับ (ใช้โชว์จุดแดงที่ปุ่มเมนู)
export function countClaimableRewards() {
  return getRewardStatuses().filter((reward) => reward.complete && !reward.claimed).length;
}

// รางวัลที่ "ครบพอดี" เพราะเพิ่งได้ไอเทมชิ้นนี้ — เรียกตอนได้ไอเทมใหม่ เพื่อแจ้งเตือน
export function getRewardsCompletedBy(itemId) {
  const item = ITEMS[itemId];
  if (!item || !getCollectionItems().includes(item)) return [];

  return getRewardStatuses().filter((reward) =>
    (reward.type === null || reward.type === item.type) && reward.complete && !reward.claimed
  );
}

// ---------- กดรับรางวัล ----------
// คืน { ok: false, reason: "unknown" | "incomplete" | "claimed" } หรือ { ok: true, reward }
export function claimReward(rewardId) {
  const reward = getRewardStatuses().find((other) => other.id === rewardId);
  if (!reward) return { ok: false, reason: "unknown" };
  if (reward.claimed) return { ok: false, reason: "claimed" };
  if (!reward.complete) return { ok: false, reason: "incomplete" };

  state.collection.claimedRewards[reward.id] = Date.now();
  if (reward.gold) addGold(reward.gold);
  if (reward.gem) addGem(reward.gem);
  if (reward.itemId) addLoot(reward.itemId, 1);

  return { ok: true, reward };
}
