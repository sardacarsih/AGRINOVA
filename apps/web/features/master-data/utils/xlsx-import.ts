export type NormalizedImportRow = Record<string, unknown>;

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
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  const worksheetName = workbook.SheetNames[0];
  if (!worksheetName) {
    return [];
  }

  const worksheet = workbook.Sheets[worksheetName];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: '',
    raw: false,
  });

  return rawRows.map((row) => normalizeRow(row));
}

export async function downloadXlsxTemplate(
  fileName: string,
  rows: Array<Record<string, unknown>>,
): Promise<void> {
  const XLSX = await import('xlsx');
  const worksheet = XLSX.utils.json_to_sheet(rows, { skipHeader: false });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');

  const workbookData = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
  });

  const blob = new Blob([workbookData], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
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
  return lower.endsWith('.xlsx') || lower.endsWith('.xls');
}
