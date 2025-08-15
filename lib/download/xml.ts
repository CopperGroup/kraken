import axios from 'axios';

const escapeXml = (str: string) => {
  if (typeof str !== 'string') return '';
  return str.replace(/[<>&'"/]/g, (char) => {
    switch (char) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case "'": return '&apos;';
      case '"': return '&quot;';
      case '/': return '&#47;';
      default: return char;
    }
  });
};

const extractIdFromUrl = (url: string) => {
  const parts = url.split("-");
  if (parts.length >= 2) {
    return parts[parts.length - 1];
  }
  return "UnknownID";
};

const getExchangeRate = async (): Promise<number> => {
  try {
    const response = await axios.get('https://v6.exchangerate-api.com/v6/b1f0d9ba9eb41997e5113ad7/pair/PLN/UAH');
    return response.data.conversion_rate || 0;
  } catch (error) {
    console.error("❌ Failed to fetch exchange rate:", error);
    return 0;
  }
};

export const jsonToXml = async (jsonData: any[]) => {
  const exchangeRate = await getExchangeRate();
  if (exchangeRate === 0) {
    throw new Error("Failed to retrieve exchange rate. Conversion cannot proceed.");
  }

  const productsXml = jsonData.map(product => {
    const id = product.url.startsWith("https://www.vevor.pl") ? extractIdFromUrl(product.url): product.articleNumber;
    const priceInUah = product.price ? (parseFloat(product.price) * exchangeRate).toFixed(2) : '0';
    const discountPriceInUah = product.discountPrice ? (parseFloat(product.discountPrice) * exchangeRate).toFixed(2) : '';

    const imagesXml = product.images?.map((url: string, index: number) =>
      index === 0
        ? `<g:image_link>${url}</g:image_link>`
        : `<g:additional_image_link>${url}</g:additional_image_link>`
    ).join('\n') || '';

    const discountPriceTag = `<g:sale_price>${product.discountPrice} PLN</g:sale_price>`;

    const cleanTagName = (tagName: string) => {
      // Allow Polish letters by defining a character class including them
      const cleanedName = tagName
        .replace(/\s+/g, '_')
        .replace(/[^a-zA-Z0-9ąĄćĆęĘłŁńŃóÓśŚźŹżŻ:]/g, '-')
        .replace(/^-+/, '');
      
      // Prefix with "tag_" if the tag name starts with a digit
      return /^\d/.test(cleanedName) ? `_${cleanedName}` : cleanedName;
    };
    
    const characteristics = Object.entries(product.characteristics)
      .map(chr => {
        const tagName = cleanTagName(chr[0] ? chr[0] : (chr[1] as string).split(" ")[0]);
        return `<g:${tagName}>${escapeXml(chr[1] as string)}</g:${tagName}>`;
      })
      .join('\n') || '';

    return `
    <entry>
      <g:id>${escapeXml(id)}</g:id>
      <g:mpn>${escapeXml(product.articleNumber)}</g:mpn>
      <g:title>${escapeXml(product.name)}</g:title>
      <g:description><![CDATA[${escapeXml(product.description || '')}]]></g:description>
      <g:link>${product.url.startsWith("https://www.vevor.pl") ? product.url : product.url.split('.html')[0] + '.html'}</g:link>
      <g:mobile_link>${product.mobileUrl || product.url.startsWith("https://www.vevor.pl") ? product.url : product.url.split('.html')[0] + '.html'}</g:mobile_link>
      ${imagesXml}
      <g:condition>New</g:condition>
      <g:availability>In Stock</g:availability>
      <g:price>${product.price} PLN</g:price> ${product.discountPrice ? "\n" + discountPriceTag : ""}
      <g:brand>${product.brand}</g:brand>
      <g:product_type>${escapeXml(product.category)}</g:product_type>
      <g:google_product_category>${escapeXml(product.category)}</g:google_product_category>
      ${characteristics}
    </entry>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="utf-8"?>
<feed version="1.0" xmlns="http://www.w3.org/2005/Atom" xmlns:g="http://base.google.com/ns/1.0">
  <title>pl-en-pln.xml</title>
  <link href="https://www.geekbuying.com" rel="self" />
  <updated>${new Date().toISOString()}</updated>
  ${productsXml}
</feed>`;
};
