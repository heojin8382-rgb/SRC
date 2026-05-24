const XLSX = require('xlsx');
const workbook = XLSX.readFile('C:\\Users\\KHG\\Desktop\\SRC\\[NEW]명단 및 회비, 인증 25.11~.xlsx');
workbook.SheetNames.forEach(sheetName => {
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  if (rows.length > 0) {
    console.log(`Sheet "${sheetName}": Headers =`, JSON.stringify(rows[0].slice(0, 15)));
  } else {
    console.log(`Sheet "${sheetName}": Empty`);
  }
});
