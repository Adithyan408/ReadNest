import redis from "../config/redis.js";

const KEY_PREFIX = "payment:";

// Save payment state
export const savePaymentState = async (userId, data) => {
  const key = `${KEY_PREFIX}${userId}`;
  await redis.set(key, JSON.stringify(data), {
    EX: 900, // 15 minutes
  });
};

// Get payment state
export const getPaymentState = async (userId) => {
  const key = `${KEY_PREFIX}${userId}`;
  const data = await redis.get(key);
  return data ? JSON.parse(data) : null;
};

// Clear after success
export const clearPaymentState = async (userId) => {
  const key = `${KEY_PREFIX}${userId}`;
  await redis.del(key);
};
