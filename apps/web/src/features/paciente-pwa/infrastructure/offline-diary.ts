"use client";

export type PendingDiary = {
  id: string;
  patientId: string;
  userId: string;
  refeicao: string;
  consumidoEm: string;
  descricao: string;
  itens: { nome: string; quantidade: string }[];
  compartilhado: boolean;
  foto?: Blob;
  mime?: string;
  createdAt: number;
};

const DB = "nutreza-paciente";
const STORE = "diario-pendente";
const PLAN_STORE = "planos-cache";
const IDENTITY_STORE = "identidade-cache";

export async function normalizePatientPhoto(file: File): Promise<Blob> {
  if (typeof createImageBitmap !== "function") return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) { bitmap.close(); return file; }
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
  return await new Promise((resolve) => canvas.toBlob((blob) => resolve(blob ?? file), "image/jpeg", 0.82));
}

function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 2);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE)) database.createObjectStore(STORE, { keyPath: "id" });
      if (!database.objectStoreNames.contains(PLAN_STORE)) database.createObjectStore(PLAN_STORE, { keyPath: "patientId" });
      if (!database.objectStoreNames.contains(IDENTITY_STORE)) database.createObjectStore(IDENTITY_STORE, { keyPath: "patientId" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function cachePatientIdentity(userId: string, patientId: string, patientName: string) {
  const db = await database();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDENTITY_STORE, "readwrite");
    tx.objectStore(IDENTITY_STORE).put({ userId, patientId, patientName });
    tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
  });
}

export async function cacheApprovedPlan(userId: string, patientId: string, plan: Record<string, unknown>) {
  const db = await database();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(PLAN_STORE, "readwrite");
    tx.objectStore(PLAN_STORE).put({ userId, patientId, savedAt: Date.now(), plan });
    tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
  });
}

export async function listPending(userId: string, patientId: string) {
  const db = await database();
  return new Promise<PendingDiary[]>((resolve, reject) => {
    const request = db.transaction(STORE).objectStore(STORE).getAll();
    request.onsuccess = () => resolve((request.result as PendingDiary[]).filter((row) => row.userId === userId && row.patientId === patientId));
    request.onerror = () => reject(request.error);
  });
}

export async function enqueue(entry: PendingDiary) {
  const db = await database();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(entry);
    tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
  });
}

export async function removePending(id: string) {
  const db = await database();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite"); tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
  });
}

export async function clearPendingForUser(userId: string) {
  const db = await database();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const request = tx.objectStore(STORE).openCursor();
    request.onsuccess = () => { const cursor = request.result; if (!cursor) return; if ((cursor.value as PendingDiary).userId === userId) cursor.delete(); cursor.continue(); };
    tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
  });
}

export async function clearPatientCache(patientId?: string) {
  const db = await database();
  const stores = patientId ? [PLAN_STORE, IDENTITY_STORE] : [PLAN_STORE, IDENTITY_STORE];
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(stores, "readwrite");
    if (patientId) { tx.objectStore(PLAN_STORE).delete(patientId); tx.objectStore(IDENTITY_STORE).delete(patientId); }
    else { tx.objectStore(PLAN_STORE).clear(); tx.objectStore(IDENTITY_STORE).clear(); }
    tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
  });
}
