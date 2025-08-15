'use server';

import { XMLParser } from 'fast-xml-parser';

export interface ProductInfo {
  isAvailable: true; // always true since we only include in-stock items
  articleNumber: string;
  discountPrice: number | null;
  price: number;
}

export async function parseGeekXML(source: string): Promise<string> {
  function extractTextContent(value: unknown): string {
    if (typeof value === 'object' && value !== null) {
      if ('_text' in value) return String((value as any)._text).trim();
      if ('#text' in value) return String((value as any)['#text']).trim();
      return '';
    }
    return String(value ?? '').trim();
  }

  const xmlString = source.startsWith('http')
    ? await fetch(source).then(r => r.text())
    : await (await import('fs/promises')).readFile(source, 'utf8');

  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });
  const feedObj = parser.parse(xmlString);
  const entries = feedObj?.feed?.entry ?? [];

  console.log(`🧾 Parsed ${entries.length} entries from feed`);

  const result: ProductInfo[] = [];

  for (const [i, e] of entries.entries()) {
    const availability = extractTextContent(e['g:availability']).toLowerCase();
    if (availability !== 'in stock') {
      console.log(`🔁 [${i}] Skipping due to availability:`, availability);
      continue;
    }

    const articleNumber = extractTextContent(e['g:mpn']).trim();
    if (!articleNumber) {
      console.warn(`⚠️ [${i}] Empty g:mpn`);
      continue;
    }

    const priceStr = extractTextContent(e['g:price']);
    const salePriceStr = extractTextContent(e['g:sale_price']);

    const priceNum = parseFloat(priceStr.replace(/[^0-9.]+/g, ''));
    const salePriceNum = salePriceStr
      ? parseFloat(salePriceStr.replace(/[^0-9.]+/g, ''))
      : NaN;

    if (Number.isNaN(priceNum)) {
      console.warn(`⚠️ [${i}] Could not parse price for ${articleNumber}:`, priceStr);
      continue;
    }

    result.push({
      isAvailable: true,
      articleNumber,
      price: priceNum,
      discountPrice: Number.isNaN(salePriceNum) ? null : salePriceNum,
    });
  }

  console.log(`✅ Extracted ${result.length} valid product entries`);
  return JSON.stringify(result);
}
