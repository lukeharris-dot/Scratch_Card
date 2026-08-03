// Real shared storage backed by Firebase Firestore, so every device -
// yours and every guest's - reads and writes the same live data.
// Matches the same get/set/delete/list shape the app already expects.

import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBJxdXPvCDuCU9fZshDNDwfwiIt6Hc9RGc",
  authDomain: "btb-scratch-card.firebaseapp.com",
  projectId: "btb-scratch-card",
  storageBucket: "btb-scratch-card.firebasestorage.app",
  messagingSenderId: "937791752700",
  appId: "1:937791752700:web:dcd92c2322e576e6cf4a79",
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
const SHARED_COLLECTION = "sc_shared";

function personalKey(key) {
  return "personal:" + key;
}

window.storage = {
  async get(key, shared = false) {
    try {
      if (shared) {
        const ref = doc(db, SHARED_COLLECTION, key);
        const snap = await getDoc(ref);
        if (!snap.exists()) return null;
        return { key, value: snap.data().value, shared };
      }
      const raw = localStorage.getItem(personalKey(key));
      if (raw === null) return null;
      return { key, value: raw, shared };
    } catch {
      return null;
    }
  },
  async set(key, value, shared = false) {
    try {
      if (shared) {
        const ref = doc(db, SHARED_COLLECTION, key);
        await setDoc(ref, { value });
        return { key, value, shared };
      }
      localStorage.setItem(personalKey(key), value);
      return { key, value, shared };
    } catch {
      return null;
    }
  },
  async delete(key, shared = false) {
    try {
      if (shared) {
        const ref = doc(db, SHARED_COLLECTION, key);
        await deleteDoc(ref);
        return { key, deleted: true, shared };
      }
      localStorage.removeItem(personalKey(key));
      return { key, deleted: true, shared };
    } catch {
      return null;
    }
  },
  async list(prefix = "", shared = false) {
    try {
      if (shared) {
        const snap = await getDocs(collection(db, SHARED_COLLECTION));
        const keys = [];
        snap.forEach((d) => {
          if (d.id.indexOf(prefix) === 0) keys.push(d.id);
        });
        return { keys, prefix, shared };
      }
      const scoped = "personal:";
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.indexOf(scoped + prefix) === 0) {
          keys.push(k.slice(scoped.length));
        }
      }
      return { keys, prefix, shared };
    } catch {
      return null;
    }
  },
};
