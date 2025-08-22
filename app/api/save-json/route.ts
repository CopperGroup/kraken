// app/api/save-json/route.ts
import { NextResponse } from 'next/server';
import { writeFile, readFile, mkdir } from 'fs/promises';
import { join } from 'path';

const DATA_DIR = join(process.cwd(), 'data');

/**
 * Handles POST requests to save data to a JSON file.
 */
export async function POST(req: Request) {
  try {
    const { id, type, data } = await req.json();

    if (!id || !type || !data) {
      return NextResponse.json({ error: 'Missing id, type, or data' }, { status: 400 });
    }

    await mkdir(DATA_DIR, { recursive: true });

    const filePath = join(DATA_DIR, `${id}.${type}.json`);
    await writeFile(filePath, JSON.stringify(data, null, 2));

    return NextResponse.json({ success: true, filePath });
  } catch (error) {
    console.error('Failed to write to file:', error);
    return NextResponse.json({ error: 'Failed to save data' }, { status: 500 });
  }
}

/**
 * Handles GET requests to retrieve a JSON file.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const type = searchParams.get('type');

    if (!id || !type) {
      return NextResponse.json({ error: 'Missing id or type' }, { status: 400 });
    }

    const filePath = join(DATA_DIR, `${id}.${type}.json`);
    const fileData = await readFile(filePath, 'utf-8');

    return NextResponse.json(JSON.parse(fileData));
  } catch (error) {
    console.error('Failed to read file:', error);
    return NextResponse.json({ error: 'File not found or failed to read' }, { status: 404 });
  }
}