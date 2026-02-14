import { openDB } from 'idb';

const DB_NAME = 'psyduck-panic-db';
const DB_VERSION = 1;

export interface HighScore {
  score: number;
  date: number;
}

export interface Settings {
  volume: number;
  muted: boolean;
}

export const initDB = async () => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('scores')) {
        const store = db.createObjectStore('scores', { keyPath: 'id', autoIncrement: true });
        store.createIndex('score', 'score');
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings');
      }
    },
  });
};

export const saveScore = async (score: number) => {
  const db = await initDB();
  await db.add('scores', { score, date: Date.now() });
};

export const getHighScores = async (limit = 10): Promise<HighScore[]> => {
  const db = await initDB();
  const tx = db.transaction('scores', 'readonly');
  const index = tx.store.index('score');
  let cursor = await index.openCursor(null, 'prev');
  const scores: HighScore[] = [];
  while (cursor && scores.length < limit) {
    scores.push(cursor.value);
    cursor = await cursor.continue();
  }
  return scores;
};

export const saveSettings = async (settings: Settings) => {
  const db = await initDB();
  await db.put('settings', settings, 'config');
};

export const getSettings = async (): Promise<Settings | undefined> => {
  const db = await initDB();
  return db.get('settings', 'config');
};
