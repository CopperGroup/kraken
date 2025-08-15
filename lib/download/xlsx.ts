import * as XLSX from 'xlsx';

export const jsonToXlsx = (jsonData: any[]) => {
  try {
    // Filter products that are available
    const worksheetData = jsonData
      .filter(({ isAvailable }) => isAvailable) // Only keep products that are available
      .map(({ articleNumber, discountPrice, price }) => ({ articleNumber, discountPrice: discountPrice ? discountPrice : price })); // Include discountPrice
  
    console.log(worksheetData)
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
  
    // Adding headers for the columns if you want to customize them
    worksheet['!cols'] = [
      { wch: 20 },
      { wch: 15 },
    ];
  
    // Optional: Customize the column names in the header (if desired)
    worksheet['A1'].v = 'Article Number';
    worksheet['B1'].v = 'Discount Price';
  
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Available Products');
  
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  } catch(error: any) {
    console.log(error.message)
  }
};
