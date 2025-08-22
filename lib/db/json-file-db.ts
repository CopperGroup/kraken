// lib/db/json-file-db.ts
import type { ScraperResult } from "@/lib/types/scraper";

const RESULTS_DIR_NAME = 'scraper-results';
const METADATA_FILE_NAME = 'metadata.json';
const PERMISSIONS_KEY = 'scraper-db-permissions';

type RunMetadata = {
  id: string;
  source: string;
  timestamp: string;
  functionName: string;
  productCount: number;
  filename: string;
  errors?: string[];
  links?: string[];
  subCategoryLinks?: string[];
};

let rootDirHandle: FileSystemDirectoryHandle | null = null;
let resultsDirHandle: FileSystemDirectoryHandle | null = null;
let metadataFileHandle: FileSystemFileHandle | null = null;

/**
 * Persists the directory handle to local storage.
 * @param handle The directory handle to persist.
 */
async function saveHandle(handle: FileSystemDirectoryHandle) {
  const serialized = await (window as any).showDirectoryPicker({ startIn: handle });
  localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(serialized));
}

/**
 * Retrieves the persisted directory handle.
 * @returns The directory handle or null if not found.
 */
async function getPersistedHandle(): Promise<FileSystemDirectoryHandle | null> {
  const storedHandle = localStorage.getItem(PERMISSIONS_KEY);
  if (storedHandle) {
    try {
      const parsedHandle = JSON.parse(storedHandle);
      const handle = await (window as any).showDirectoryPicker({ startIn: parsedHandle });
      return handle;
    } catch (e) {
      console.error("Failed to retrieve persisted handle:", e);
      localStorage.removeItem(PERMISSIONS_KEY);
      return null;
    }
  }
  return null;
}

/**
 * Requests a directory handle from the user.
 * This should be called before any file operations.
 * @returns A boolean indicating if a handle was successfully obtained.
 */
export async function requestDirHandle(): Promise<boolean> {
    if (rootDirHandle) return true;
  
    try {
      rootDirHandle = await getPersistedHandle();
      if (rootDirHandle) {
        // Use type assertion for queryPermission as it may not be in all type definitions
        const permissionStatus = await (rootDirHandle as any).queryPermission({ mode: 'readwrite' });
        if (permissionStatus === 'granted') {
          return true;
        }
      }
  
      // If no handle or no permission, request a new one
      rootDirHandle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
      // Check for null handle before saving to avoid the type error
      if (rootDirHandle) {
        await saveHandle(rootDirHandle);
        return true;
      }
  
      return false;
    } catch (e) {
      console.error("Failed to get directory handle:", e);
      return false;
    }
  }

/**
 * Initializes the file system structure: a root directory and a 'scraper-results' subdirectory.
 */
export async function initFilesystem() {
  if (!rootDirHandle) {
    const hasPermission = await requestDirHandle();
    if (!hasPermission) throw new Error("Permission to access file system not granted.");
  }

  // Get or create the results directory
  resultsDirHandle = await rootDirHandle!.getDirectoryHandle(RESULTS_DIR_NAME, { create: true });

  // Get or create the metadata file handle
  metadataFileHandle = await resultsDirHandle.getFileHandle(METADATA_FILE_NAME, { create: true });
}

/**
 * Reads all metadata from the metadata file.
 * @returns A promise that resolves to an array of RunMetadata.
 */
async function readMetadata(): Promise<RunMetadata[]> {
  try {
    if (!metadataFileHandle) {
      await initFilesystem();
    }
    const file = await metadataFileHandle!.getFile();
    if (file.size === 0) return [];
    const content = await file.text();
    return JSON.parse(content);
  } catch (e) {
    console.error("Error reading metadata file:", e);
    return [];
  }
}

/**
 * Writes the entire metadata array back to the file.
 * @param metadata The array of RunMetadata to write.
 */
async function writeMetadata(metadata: RunMetadata[]) {
  if (!metadataFileHandle) {
    await initFilesystem();
  }
  const writable = await metadataFileHandle!.createWritable();
  await writable.write(JSON.stringify(metadata, null, 2));
  await writable.close();
}

/**
 * Adds a new scraper result by creating a new JSON file and updating metadata.
 * @param result The scraper result to add.
 */
export async function addScraperResult(result: ScraperResult) {
  if (!resultsDirHandle) {
    await initFilesystem();
  }

  // Sanitize the filename to avoid invalid characters
  const filename = `${result.id}.json`.replace(/[<>:"/\\|?*]/g, '_');
  const fileHandle = await resultsDirHandle!.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(JSON.stringify(result, null, 2));
  await writable.close();

  // Create metadata entry
  const newMetadata: RunMetadata = {
    id: result.id,
    source: result.source,
    timestamp: result.timestamp.toISOString(),
    functionName: result.functionName,
    productCount: result.productCount || 0,
    filename: filename,
    errors: result.errors,
    links: result.links,
    subCategoryLinks: result.subCategoryLinks,
  };

  // Update and save the metadata file
  const allMetadata = await readMetadata();
  allMetadata.unshift(newMetadata);
  await writeMetadata(allMetadata);
}

/**
 * Retrieves all scraper results by reading all JSON files.
 * This can be slow for a large number of files.
 * @returns A promise that resolves to an array of all scraper results.
 */
export async function getScraperResults(): Promise<ScraperResult[]> {
  if (!resultsDirHandle) {
    await initFilesystem();
  }

  const allMetadata = await readMetadata();
  const results: ScraperResult[] = [];

  for (const meta of allMetadata) {
    try {
      if (meta.filename === METADATA_FILE_NAME) continue; // Skip metadata file
      const fileHandle = await resultsDirHandle!.getFileHandle(meta.filename);
      const file = await fileHandle.getFile();
      const content = await file.text();
      const result: ScraperResult = JSON.parse(content);
      // Restore timestamp to a Date object
      result.timestamp = new Date(meta.timestamp);
      results.push(result);
    } catch (e) {
      console.error(`Error loading file ${meta.filename}:`, e);
      // Add a placeholder for the failed load
      results.push({
        id: meta.id,
        source: meta.source,
        timestamp: new Date(meta.timestamp),
        functionName: meta.functionName,
        errors: [`Failed to load data: ${e instanceof Error ? e.message : 'Unknown error'}`],
        productCount: 0
      });
    }
  }

  // The metadata is already sorted by timestamp in `addScraperResult`
  return results;
}

/**
 * Deletes a specific scraper result by its ID.
 * @param id The ID of the result to delete.
 */
export async function deleteScraperResult(id: string) {
  if (!resultsDirHandle) {
    await initFilesystem();
  }

  const allMetadata = await readMetadata();
  const metadataToDelete = allMetadata.find(meta => meta.id === id);

  if (metadataToDelete) {
    try {
      await resultsDirHandle!.removeEntry(metadataToDelete.filename);
      const newMetadata = allMetadata.filter(meta => meta.id !== id);
      await writeMetadata(newMetadata);
    } catch (e) {
      console.error("Error deleting file:", e);
      throw new Error("Failed to delete scraper result file.");
    }
  }
}

/**
 * Clears all scraper results by deleting all JSON files.
 */
export async function clearScraperResults() {
  if (!resultsDirHandle) {
    await initFilesystem();
  }

  const allMetadata = await readMetadata();
  for (const meta of allMetadata) {
    try {
      if (meta.filename === METADATA_FILE_NAME) continue;
      await resultsDirHandle!.removeEntry(meta.filename);
    } catch (e) {
      console.error(`Error clearing file ${meta.filename}:`, e);
    }
  }

  // Clear the metadata file by writing an empty array
  await writeMetadata([]);
}