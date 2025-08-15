import { getCatalogLinks, getCatalogPagesLinks } from '@/lib/scraper/cataog.actions';
import { NextResponse } from 'next/server';


export async function POST(request: Request) {
  try {
    const { catalogUrl } = await request.json();

    if (!catalogUrl) {
      return NextResponse.json({ error: 'Catalog URL is required.' }, { status: 400 });
    }

    const allCatalogs = await getCatalogLinks(catalogUrl)


    const data = await getCatalogPagesLinks(allCatalogs);
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'An error occurred while scraping.' }, { status: 500 });
  }
}
