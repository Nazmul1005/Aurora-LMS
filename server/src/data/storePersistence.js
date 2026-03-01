import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { instructors, learners, admins, courses, transactions, bankAccounts } from './store.js';

//
// PERSISTENCE LAYER
// ------------------------------------------------------------
// The LMS runs entirely from an in-memory store (see store.js).
// This module mirrors that store to a JSON snapshot on disk so
// local development sessions survive server restarts. The file is
// written atomically (write → rename) to avoid corruption.
//

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
let DB_PATH = path.resolve(MODULE_DIR, '../../data', 'aurora-db.json');
let writeChain = Promise.resolve();
let didInit = false;

/**
 * Serialize the current in-memory store into a JSON string.
 */
const buildPayload = () => JSON.stringify(getSnapshot(), null, 2);

/**
 * Capture a plain-object snapshot of all store collections.
 */
const getSnapshot = () => ({
  instructors,
  learners,
  admins,
  courses,
  transactions,
  bankAccounts: Array.from(bankAccounts.entries()),
});

/**
 * Apply a previously saved snapshot back into the in-memory store.
 */
const applySnapshot = (snapshot) => {
  if (!snapshot || typeof snapshot !== 'object') return;

  if (Array.isArray(snapshot.instructors)) {
    instructors.splice(0, instructors.length, ...snapshot.instructors);
  }
  if (Array.isArray(snapshot.learners)) {
    learners.splice(0, learners.length, ...snapshot.learners);
  }
  if (Array.isArray(snapshot.admins)) {
    admins.splice(0, admins.length, ...snapshot.admins);
  }
  if (Array.isArray(snapshot.courses)) {
    const byId = new Map();
    for (const course of courses) {
      if (!course?.id) continue;
      byId.set(course.id, course);
    }
    for (const course of snapshot.courses) {
      if (!course?.id) continue;
      byId.set(course.id, course);
    }
    courses.splice(0, courses.length, ...Array.from(byId.values()));
  }
  if (Array.isArray(snapshot.transactions)) {
    transactions.splice(0, transactions.length, ...snapshot.transactions);
  }

  if (Array.isArray(snapshot.bankAccounts)) {
    bankAccounts.clear();
    for (const entry of snapshot.bankAccounts) {
      if (!Array.isArray(entry) || entry.length !== 2) continue;
      const [accountNumber, account] = entry;
      if (!accountNumber || typeof accountNumber !== 'string') continue;
      bankAccounts.set(accountNumber, account);
    }
  }
};

/**
 * Initialize persistence once at server boot. Loads existing snapshot
 * if present, otherwise seeds a new file. Accepts a custom dbPath for tests.
 */
export const initStorePersistence = ({ dbPath } = {}) => {
  if (didInit) return;
  didInit = true;

  if (dbPath) {
    DB_PATH = dbPath;
  }

  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

  if (fs.existsSync(DB_PATH)) {
    try {
      const raw = fs.readFileSync(DB_PATH, 'utf8');
      const parsed = JSON.parse(raw);
      applySnapshot(parsed);
      return;
    } catch {
    }
  }

  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(getSnapshot(), null, 2), 'utf8');
  } catch {
  }
};

/**
 * Asynchronously write the current store snapshot to disk. Writes are
 * chained to avoid overlapping writes when multiple requests mutate state.
 */
export const persistStore = () => {
  if (!didInit) return;

  const payload = buildPayload();
  const tmpPath = `${DB_PATH}.tmp`;

  writeChain = writeChain
    .then(async () => {
      await fs.promises.writeFile(tmpPath, payload, 'utf8');
      await fs.promises.rename(tmpPath, DB_PATH);
    })
    .catch(() => {
    });
};

/**
 * Synchronous variant used during shutdown so no writes are lost.
 */
export const persistStoreSync = () => {
  if (!didInit) return;
  try {
    const payload = buildPayload();
    const tmpPath = `${DB_PATH}.tmp`;
    fs.writeFileSync(tmpPath, payload, 'utf8');
    fs.renameSync(tmpPath, DB_PATH);
  } catch {
  }
};

/**
 * Express middleware that triggers persistence after successful
 * mutating requests (POST/PUT/PATCH/DELETE).
 */
export const storePersistenceMiddleware = () => {
  const mutatingMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

  return (req, res, next) => {
    if (!mutatingMethods.has(req.method)) {
      next();
      return;
    }

    res.on('finish', () => {
      if (res.statusCode < 400) {
        persistStore();
      }
    });

    next();
  };
};
