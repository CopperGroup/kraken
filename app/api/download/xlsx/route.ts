import { jsonToXlsx } from '@/lib/download/xlsx';
import { NextResponse } from 'next/server';

export const POST = async (req: Request) => {
  try {
    const products = await req.json();

    if (!Array.isArray(products)) {
      return NextResponse.json({ error: 'Invalid data format. Expected an array of products.' }, { status: 400 });
    }

    console.log(products)

    const buffer = jsonToXlsx(products);

    const response = new NextResponse(buffer);
    response.headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    response.headers.set('Content-Disposition', 'attachment; filename=products_data.xlsx');

    return response;
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate XLSX file' }, { status: 500 });
  }
};
