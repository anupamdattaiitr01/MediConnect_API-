const cache = {};

export const set = (key, data, ttlInMs = 15000) => { // 15-second default TTL
  const expiresAt = Date.now() + ttlInMs;
  cache[key] = { data, expiresAt };
};

export const get = (key) => {
  const cachedItem = cache[key];
  
  if (!cachedItem) return null;

  if (Date.now() > cachedItem.expiresAt) {
    delete cache[key];
    return null;
  }

  return cachedItem.data;
};

export const invalidate = (key) => {
  delete cache[key];
};