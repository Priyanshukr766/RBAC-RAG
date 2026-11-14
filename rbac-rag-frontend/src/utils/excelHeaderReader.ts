import * as XLSX from 'xlsx';

export interface ExcelExtractionResult {
  sheetNames: string[];
  columns: string[];
  sampleRows: Record<string, unknown>[];
}

export async function extractExcelColumnsAndPreview(
  file: File
): Promise<ExcelExtractionResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });

  const sheetNames = workbook.SheetNames;
  if (!sheetNames || sheetNames.length === 0) {
    throw new Error('The uploaded Excel workbook contains no sheets.');
  }

  const firstSheetName = sheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  // Read as array of arrays (header: 1)
  const rawRows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    defval: '',
  });

  if (!rawRows || rawRows.length === 0) {
    throw new Error('The selected Excel worksheet is empty.');
  }

  // Row 0 contains column headers
  const headerRow = rawRows[0] as unknown[];
  const columns: string[] = headerRow
    .map((col, idx) => (col ? String(col).trim() : `Column_${idx + 1}`))
    .filter((col) => col.length > 0);

  // Subsequent rows contain sample data
  const sampleRows: Record<string, unknown>[] = [];
  for (let i = 1; i < Math.min(rawRows.length, 4); i++) {
    const rowData = rawRows[i] as unknown[];
    const rowObj: Record<string, unknown> = {};
    columns.forEach((colName, colIdx) => {
      rowObj[colName] = rowData[colIdx] !== undefined ? rowData[colIdx] : '';
    });
    sampleRows.push(rowObj);
  }

  return {
    sheetNames,
    columns,
    sampleRows,
  };
}

