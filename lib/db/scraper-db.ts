// lib/db/scraper-db.ts
import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface ScraperDB extends DBSchema {
  'scraper-results': {
    key: string;
    value: {
      id: string;
      timestamp: Date;
      source: string;
      functionName: string;
      productCount: number;
      productsData?: any;
      links?: string[];
      subCategoryLinks?: string[];
      details?: Record<string, any>;
      errors?: string[];
    };
    indexes: { 'by-timestamp': Date };
  };
  'file-groups': {
    key: string;
    value: {
      id: string;
      runId: string;
      source: string;
      timestamp: Date;
      productCount: number;
      functionName: string;
      files: any[];
    };
    indexes: { 'by-timestamp': Date };
  };
}

let db: IDBPDatabase<ScraperDB>;

/**
 * Initializes the IndexedDB database.
 */
export async function initDB() {
  if (db) return db;
  db = await openDB<ScraperDB>('scraper-dashboard', 1, {
    upgrade(db) {
      const resultsStore = db.createObjectStore('scraper-results', {
        keyPath: 'id',
      });
      resultsStore.createIndex('by-timestamp', 'timestamp');

      const filesStore = db.createObjectStore('file-groups', {
        keyPath: 'id',
      });
      filesStore.createIndex('by-timestamp', 'timestamp');
    },
  });
  return db;
}

/**
 * Adds a new scraper result to the database.
 * @param result The scraper result to add.
 */
export async function addScraperResult(result: ScraperDB['scraper-results']['value']) {
  await initDB();
  const tx = db.transaction('scraper-results', 'readwrite');
  await tx.store.add(result);
  await tx.done;
}

/**
 * Retrieves all scraper results from the database, ordered by timestamp.
 */
export async function getScraperResults() {
  await initDB();
  return db.getAllFromIndex('scraper-results', 'by-timestamp');
}

/**
 * Deletes a specific scraper result by its ID.
 * @param id The ID of the result to delete.
 */
export async function deleteScraperResult(id: string) {
  await initDB();
  await db.delete('scraper-results', id);
}

/**
 * Clears all scraper results from the database.
 */
export async function clearScraperResults() {
  await initDB();
  await db.clear('scraper-results');
}

/**
 * Adds a new file group to the database.
 * @param fileGroup The file group to add.
 */
export async function addFileGroup(fileGroup: ScraperDB['file-groups']['value']) {
  await initDB();
  const tx = db.transaction('file-groups', 'readwrite');
  await tx.store.add(fileGroup);
  await tx.done;
}

/**
 * Retrieves all file groups from the database, ordered by timestamp.
 */
export async function getFileGroups() {
  await initDB();
  return db.getAllFromIndex('file-groups', 'by-timestamp');
}

/**
 * Deletes a specific file group by its ID.
 * @param id The ID of the file group to delete.
 */
export async function deleteFileGroup(id: string) {
  await initDB();
  await db.delete('file-groups', id);
}

/**
 * Clears all file groups from the database.
 */
export async function clearFileGroups() {
  await initDB();
  await db.clear('file-groups');
}