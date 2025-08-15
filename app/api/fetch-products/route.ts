import { scrapeProductLinks } from '@/lib/scraper/product.actions';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { links, threads }: { links: string[], threads: number} = await req.json();

  if (!Array.isArray(links) || links.length === 0) {
    return NextResponse.json({ error: 'No links provided' }, { status: 400 });
  }

  try {
    const results = await scrapeProductLinks(links, threads);
    return NextResponse.json(results);
  } catch (error) {
    console.error('Error during scraping:', error);
    return NextResponse.json({ error: 'Failed to scrape products' }, { status: 500 });
  }
}
