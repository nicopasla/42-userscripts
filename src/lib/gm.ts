declare const GM_getValue: (key: string, defaultValue?: any) => any;
declare const GM_setValue: (key: string, value: any) => void;
declare const GM_deleteValue: (key: string) => void;

function safeGetValue<T>(key: string, fallback?: T): T | undefined {
  try {
    if (typeof GM_getValue !== "undefined") {
      return GM_getValue(key, fallback);
    }
    const stored = localStorage.getItem(`gm_${key}`);
    return stored ? JSON.parse(stored) : fallback;
  } catch (e) {
    console.warn(`[gm] Failed to get ${key}:`, e);
    return fallback;
  }
}

function safeSetValue(key: string, value: unknown): void {
  try {
    if (typeof GM_setValue !== "undefined") {
      GM_setValue(key, value);
    } else {
      localStorage.setItem(`gm_${key}`, JSON.stringify(value));
    }
  } catch (e) {
    console.warn(`[gm] Failed to set ${key}:`, e);
  }
}

function safeDeleteValue(key: string): void {
  try {
    if (typeof GM_deleteValue !== "undefined") {
      GM_deleteValue(key);
    } else {
      localStorage.removeItem(`gm_${key}`);
    }
  } catch (e) {
    console.warn(`[gm] Failed to delete ${key}:`, e);
  }
}

export const gm = {
  get<T>(key: string, fallback?: T): T | undefined {
    return safeGetValue<T>(key, fallback);
  },
  set(key: string, value: unknown): void {
    safeSetValue(key, value);
  },
  remove(key: string): void {
    safeDeleteValue(key);
  },
};

export const gmGetValue = safeGetValue;
export const gmSetValue = safeSetValue;
export const gmDeleteValue = safeDeleteValue;
