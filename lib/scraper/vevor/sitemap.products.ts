"use server";

import axios from 'axios';
import zlib from 'zlib';
import { promisify } from 'util';
import { parseStringPromise } from 'xml2js';

const gunzip = promisify(zlib.gunzip);

export async function fetchAndParseSitemap(categoryId?: string): Promise<string[]> {
  try {
    const response = await axios.get('https://www.vevor.pl/sitemap/sitemap_category.xml.gz', {
      responseType: 'arraybuffer',
    });

    const decompressed = await gunzip(response.data);
    const xml = decompressed.toString('utf-8');
    const json = await parseStringPromise(xml);

    let urls: string[] = json.urlset.url.map((entry: any) => entry.loc[0]);

    if (categoryId) {
      const categorySlug = `-${categoryId}`;
      urls = urls.filter(url => url.includes(categorySlug));
    }

    return urls;
  } catch (error) {
    console.error('Failed to fetch and parse sitemap:', error);
    return [];
  }
}
