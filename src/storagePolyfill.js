// Provides a browser-compatible window.storage API, matching the shape
// used by Claude's artifact sandbox, backed by real localStorage so this
// app keeps working unchanged once deployed to a real website.

function keyFor(key, shared) {
  return (shared ? "shared:" : "personal:") + key;
}

window.storage = {
  async get(key, shared = false) {
    try {
      const raw = localStorage.getItem(keyFor(key, shared));
      if (raw === null) return null;
      return { key, value: raw, shared };
    } catch {
      return null;
    }
  },
  async set(key, value, shared = false) {
    try {
      localStorage.setItem(keyFor(key, shared), value);
      return { key, value, shared };
    } catch {
      return null;
    }
  },
  async delete(key, shared = false) {
    try {
      localStorage.removeItem(keyFor(key, shared));
      return { key, deleted: true, shared };
    } catch {
      return null;
    }
  },
  async list(prefix = "", shared = false) {
    try {
      const scopePrefix = shared ? "shared:" : "personal:";
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.indexOf(scopePrefix + prefix) === 0) {
          keys.push(k.slice(scopePrefix.length));
        }
      }
      return { keys, prefix, shared };
    } catch {
      return null;
    }
  },
};
