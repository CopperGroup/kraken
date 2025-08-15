import { jsonToXml } from '@/lib/download/xml';
import { NextResponse } from 'next/server';

export const POST = async (req: Request) => {
  try {
    const products = await req.json(); // Expecting an array of products

    if (!Array.isArray(products)) {
      return NextResponse.json({ error: 'Invalid data format. Expected an array of products.' }, { status: 400 });
    }

    const xmlData = await jsonToXml(products);

    const response = new NextResponse(xmlData);
    response.headers.set('Content-Type', 'application/xml');
    response.headers.set('Content-Disposition', 'attachment; filename=products_data.xml');

    return response;
  } catch (error) {
    return NextResponse.json({ error: 'Failed to convert JSON to XML' }, { status: 500 });
  }
};
