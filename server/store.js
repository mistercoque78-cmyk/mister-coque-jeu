// ============================================================
// STOCKAGE — fichier JSON local avec écritures atomiques
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LOT_PYRAMID } from '../assets/lots.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

function emptyDB() {
  const stocks = LOT_PYRAMID.map(l => ({
    id: 'stock-' + l.order,
    name: l.name,
    order: l.order,
    qty: l.qty,
    remaining: l.qty,
    reserved: 0,
    attributed: 0
  }));
  return {
    participants: [],
    claims: [],
    stocks,
    audit: [],
    counters: { participant: 0, claim: 0 }
  };
}

let db = null;

function load() {
  if (db) return db;
  try {
    if (fs.existsSync(DB_FILE)) {
      db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    } else {
      db = emptyDB();
      persist();
    }
  } catch (e) {
    db = emptyDB();
  }
  return db;
}

function persist() {
  if (!db) return;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2), 'utf8');
  fs.renameSync(tmp, DB_FILE);
}

export function getDB() { return load(); }
export function saveDB() { persist(); }
