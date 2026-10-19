// Per-browser run history (IndexedDB). Kept separate from the recorded reference dataset.
import type { RunRecord } from "@/experiments/engine";

const DB = "surestop";
const STORE = "runs";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    t.oncomplete = () => db.close();
  });
}

export async function saveRun(r: RunRecord): Promise<void> {
  try {
    await tx("readwrite", (s) => s.add(r));
  } catch {
    // Storage may be unavailable (private mode); runs stay in memory for this session.
  }
}

export async function loadRuns(): Promise<RunRecord[]> {
  try {
    return (await tx<RunRecord[]>("readonly", (s) => s.getAll() as IDBRequest<RunRecord[]>)) ?? [];
  } catch {
    return [];
  }
}

export async function clearRuns(): Promise<void> {
  try {
    await tx("readwrite", (s) => s.clear());
  } catch {
    /* ignore */
  }
}
