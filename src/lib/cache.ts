export const getCachedData = (key: string) => {
  const cached = localStorage.getItem(key);
  const cacheTime = localStorage.getItem(`${key}Time`);
  if (cached && cacheTime) {
    const now = new Date().getTime();
    const age = now - parseInt(cacheTime);
    if (age < 3600000) { // 1 hour cache
      return JSON.parse(cached);
    }
  }
  return null;
};

export const setCachedData = (key: string, data: any) => {
  localStorage.setItem(key, JSON.stringify(data));
  localStorage.setItem(`${key}Time`, new Date().getTime().toString());
};
