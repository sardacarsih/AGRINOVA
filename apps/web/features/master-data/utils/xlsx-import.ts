import readXlsxFile from 'read-excel-file';

export type NormalizedImportRow = Record<string, unknown>;

type ZipCell = {
  type: 'string' | 'number';
  value: string | number;
};

type ZipcelxConfig = {
  filename: string;
  sheet: {
    data: ZipCell[][];
  };
};

type ZipcelxFn = (config: ZipcelxConfig) => Promise<void>;

function normalizeHeaderKey(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/[\s\-\/]+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

function normalizeRow(rawRow: Record<string, unknown>): NormalizedImportRow {
  const normalized: NormalizedImportRow = {};

  Object.entries(rawRow).forEach(([rawKey, rawValue]) => {
    const key = normalizeHeaderKey(rawKey);
    if (!key) {
      return;
    }
    normalized[key] = rawValue;
  });

  return normalized;
}

export function normalizeLookupKey(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizeCellValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).trim();
}

export function getRowString(row: NormalizedImportRow, candidateKeys: string[]): string {
  for (const key of candidateKeys) {
    const normalizedKey = normalizeHeaderKey(key);
    const rawValue = row[normalizedKey];
    const textValue = normalizeCellValue(rawValue);
    if (textValue) {
      return textValue;
    }
  }
  return '';
}

export async function parseFirstWorksheetRows(file: File): Promise<NormalizedImportRow[]> {
  const worksheetRows = await readXlsxFile(file, { sheet: 1 });
  if (worksheetRows.length === 0) {
    return [];
  }

  const [headerRow, ...dataRows] = worksheetRows;
  const headers = headerRow.map((cell) => normalizeCellValue(cell));

  return dataRows
    .map((rowValues) => {
      const rawRow: Record<string, unknown> = {};
      headers.forEach((header, index) => {
        if (!header) {
          return;
        }
        rawRow[header] = rowValues[index] ?? '';
      });
      return normalizeRow(rawRow);
    })
    .filter((row) => Object.values(row).some((value) => normalizeCellValue(value) !== ''));
}

export async function downloadXlsxTemplate(
  fileName: string,
  rows: Array<Record<string, unknown>>,
): Promise<void> {
  const headerSet = new Set<string>();
  rows.forEach((row) => {
    Object.keys(row).forEach((key) => headerSet.add(key));
  });
  const headers = Array.from(headerSet);
  if (headers.length === 0) {
    throw new Error('Template tidak memiliki kolom untuk diekspor.');
  }

  const makeCell = (value: unknown): ZipCell => {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return { type: 'number', value };
    }
    return { type: 'string', value: normalizeCellValue(value) };
  };

  const sheetData: ZipCell[][] = [
    headers.map((header) => ({ type: 'string', value: header })),
    ...rows.map((row) => headers.map((header) => makeCell(row[header]))),
  ];

  const zipcelxModule = await import('zipcelx');
  const zipcelx = ((zipcelxModule as any).default || zipcelxModule) as ZipcelxFn;
  const normalizedName = fileName.toLowerCase().endsWith('.xlsx')
    ? fileName.slice(0, -5)
    : fileName;

  await zipcelx({
    filename: normalizedName || 'template',
    sheet: {
      data: sheetData,
    },
  });
}

export function parseOptionalNumberValue(value: string): number | undefined {
  const normalized = value.trim();
  if (!normalized) {
    return undefined;
  }

  const compact = normalized.replace(/\s+/g, '');
  let numericString = compact;

  if (compact.includes(',') && compact.includes('.')) {
    numericString = compact.replace(/\./g, '').replace(',', '.');
  } else if (compact.includes(',')) {
    numericString = compact.replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(compact)) {
    numericString = compact.replace(/\./g, '');
  }

  const parsed = Number(numericString);
  return Number.isNaN(parsed) ? Number.NaN : parsed;
}

export function parseOptionalIntegerValue(value: string): number | undefined {
  const parsed = parseOptionalNumberValue(value);
  if (parsed === undefined || Number.isNaN(parsed)) {
    return parsed;
  }
  if (!Number.isInteger(parsed)) {
    return Number.NaN;
  }
  return parsed;
}

export function isSpreadsheetFile(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return lower.endsWith('.xlsx');
}
