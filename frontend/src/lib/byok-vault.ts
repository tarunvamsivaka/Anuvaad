/**
 * Client-Side BYOK (Bring-Your-Own-Key) Vault — Milestone 4
 *
 * Implements hardware-backed AES-GCM (256-bit) client-side encryption via Web Crypto API.
 * The raw API key is NEVER stored in localStorage or plaintext.
 * Encrypted ciphertext and initialization vector are persisted in IndexedDB.
 */

import { toast } from "sonner";

const DB_NAME = "anuvaad_vault";
const STORE_NAME = "secrets";
const KEY_NAME = "gemini_byok_encrypted";
const CRYPTO_KEY_NAME = "byok_crypto_key_v2";
const LEGACY_DEVICE_SALT = "anuvaad_byok_device_entropy_v1";

// Helper to open IndexedDB
function openVaultDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB is unavailable"));
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function idbGet(key: string): Promise<any> {
  const db = await openVaultDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(key: string, value: any): Promise<void> {
  const db = await openVaultDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(value, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function idbDelete(key: string): Promise<void> {
  const db = await openVaultDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// Keep the AES key non-extractable and let IndexedDB persist its CryptoKey
// structured clone. The raw key material never enters JavaScript storage.
async function getVaultKey(): Promise<CryptoKey> {
  const stored = await idbGet(CRYPTO_KEY_NAME);
  if (stored) return stored as CryptoKey;
  const key = await window.crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
  await idbSet(CRYPTO_KEY_NAME, key);
  return key;
}

// Read only for migration of records created by the previous PBKDF2 scheme.
async function getLegacyMasterKey(salt: Uint8Array): Promise<CryptoKey> {
  const deviceEntropy = `${localStorage.getItem(LEGACY_DEVICE_SALT) ?? ""}:anuvaad-byok-v2`;
  const enc = new TextEncoder();
  const rawKeyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(deviceEntropy),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: 100000,
      hash: "SHA-256",
    },
    rawKeyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function saveByokKey(apiKey: string): Promise<void> {
  if (typeof window === "undefined" || !window.crypto?.subtle || !window.indexedDB) {
    throw new Error("Web Crypto API is not supported in this environment");
  }

  const trimmed = apiKey.trim();
  if (!trimmed) {
    await clearByokKey();
    return;
  }

  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const cryptoKey = await getVaultKey();
  const enc = new TextEncoder();
  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    cryptoKey,
    enc.encode(trimmed)
  );

  const payload = {
    version: 2,
    iv: Array.from(iv),
    data: Array.from(new Uint8Array(ciphertextBuffer)),
  };

  await idbSet(KEY_NAME, payload);
}

export async function getByokKey(): Promise<string | null> {
  if (typeof window === "undefined" || !window.crypto?.subtle || !window.indexedDB) {
    return null;
  }

  let payload: any = null;
  try {
    payload = await idbGet(KEY_NAME);
  } catch {
    return null;
  }

  if (!payload || !payload.iv || !payload.data) {
    return null;
  }

  try {
    const iv = new Uint8Array(payload.iv);
    const ciphertext = new Uint8Array(payload.data);

    const cryptoKey = await getVaultKey();
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      cryptoKey,
      ciphertext
    );

    const dec = new TextDecoder();
    return dec.decode(decryptedBuffer);
  } catch (err) {
    // Existing encrypted values were written before CryptoKey persistence.
    // Decrypt once, then re-encrypt under the non-extractable IndexedDB key.
    try {
      if (payload.salt) {
        const legacyKey = await getLegacyMasterKey(new Uint8Array(payload.salt));
        const plaintext = await window.crypto.subtle.decrypt(
          { name: "AES-GCM", iv: new Uint8Array(payload.iv) },
          legacyKey,
          new Uint8Array(payload.data)
        );
        const value = new TextDecoder().decode(plaintext);
        await saveByokKey(value);
        localStorage.removeItem(LEGACY_DEVICE_SALT);
        return value;
      }
      throw new Error("The stored vault key is unavailable.");
    } catch {
      console.warn("BYOK vault decryption failed; clearing the unreadable stored key.", err);
      await clearByokKey();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("byok-decryption-failed"));
        try {
          toast.error("Stored API key could not be decrypted. Please enter it again.");
        } catch {
          // Fallback if toast is not yet ready
        }
      }
      return null;
    }
  }
}

export async function hasByokKey(): Promise<boolean> {
  if (typeof window === "undefined" || !window.indexedDB) return false;
  try {
    const payload = await idbGet(KEY_NAME);
    return Boolean(payload && payload.data);
  } catch {
    return false;
  }
}

export async function clearByokKey(): Promise<void> {
  if (typeof window === "undefined" || !window.indexedDB) return;
  try {
    await idbDelete(KEY_NAME);
    await idbDelete(CRYPTO_KEY_NAME);
  } catch {
    // Ignore error
  }
}
