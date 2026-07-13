import Papa from "papaparse";
import * as XLSX from "xlsx";

export type ColumnType = "number" | "string" | "boolean" | "date" | "mixed";

export type ColumnProfile = {
  name: string;
  type: ColumnType;
  nullCount: number;
  uniqueApprox: number;
  sampleValues: string[];
  min?: number | null;
  max?: number | null;
  mean?: number | null;
};

export type DatasetProfile = {
  rowCount: number;
  columnCount: number;
  columns: ColumnProfile[];
  sampleRows: Record<string, unknown>[];
  /** Capped rows retained for chat context (not full file) */
  retainedRows: Record<string, unknown>[];
  filename: string;
};

const MAX_RETAINED_ROWS = 400;
const MAX_SAMPLE_ROWS = 40;
const MAX_FILE_BYTES = 10 * 1024 * 1024;

function inferType(values: unknown[]): ColumnType {
  const nonNull = values.filter((v) => v !== null && v !== undefined && v !== "");
  if (!nonNull.length) return "string";

  let num = 0;
  let bool = 0;
  let date = 0;
  for (const v of nonNull.slice(0, 50)) {
    if (typeof v === "boolean" || v === "true" || v === "false") bool++;
    else if (typeof v === "number" && Number.isFinite(v)) num++;
    else if (typeof v === "string") {
      const t = v.trim();
      if (t !== "" && !Number.isNaN(Number(t)) && /^-?\d+(\.\d+)?$/.test(t)) num++;
      else if (!Number.isNaN(Date.parse(t)) && /\d{4}|\//.test(t)) date++;
    }
  }
  const n = nonNull.slice(0, 50).length;
  if (num / n > 0.8) return "number";
  if (bool / n > 0.8) return "boolean";
  if (date / n > 0.7) return "date";
  if (num > 0 && num / n > 0.3) return "mixed";
  return "string";
}

function toNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) {
    return Number(v);
  }
  return null;
}

function profileRows(
  rows: Record<string, unknown>[],
  filename: string,
): DatasetProfile {
  if (!rows.length) {
    throw new Error("No data rows found in file");
  }

  const columns = Object.keys(rows[0] ?? {});
  if (!columns.length) {
    throw new Error("No columns found");
  }

  const retainedRows = rows.slice(0, MAX_RETAINED_ROWS).map((r) => {
    const o: Record<string, unknown> = {};
    for (const c of columns) o[c] = r[c];
    return o;
  });

  const colProfiles: ColumnProfile[] = columns.map((name) => {
    const values = retainedRows.map((r) => r[name]);
    const type = inferType(values);
    const nonNull = values.filter((v) => v !== null && v !== undefined && v !== "");
    const unique = new Set(nonNull.map((v) => String(v))).size;
    const sampleValues = [...new Set(nonNull.map((v) => String(v)))].slice(0, 5);

    let min: number | null = null;
    let max: number | null = null;
    let mean: number | null = null;
    if (type === "number" || type === "mixed") {
      const nums = nonNull.map(toNumber).filter((n): n is number => n !== null);
      if (nums.length) {
        min = Math.min(...nums);
        max = Math.max(...nums);
        mean = nums.reduce((a, b) => a + b, 0) / nums.length;
      }
    }

    return {
      name,
      type,
      nullCount: values.length - nonNull.length,
      uniqueApprox: unique,
      sampleValues,
      min,
      max,
      mean: mean !== null ? Math.round(mean * 1000) / 1000 : null,
    };
  });

  return {
    rowCount: rows.length,
    columnCount: columns.length,
    columns: colProfiles,
    sampleRows: retainedRows.slice(0, MAX_SAMPLE_ROWS),
    retainedRows,
    filename,
  };
}

export function parseSpreadsheetBuffer(
  buffer: Buffer,
  filename: string,
  contentType?: string,
): DatasetProfile {
  if (buffer.length > MAX_FILE_BYTES) {
    throw new Error("File too large (max 10MB)");
  }

  const lower = filename.toLowerCase();
  const isCsv =
    lower.endsWith(".csv") ||
    contentType === "text/csv" ||
    contentType === "application/csv";
  const isXlsx =
    lower.endsWith(".xlsx") ||
    lower.endsWith(".xls") ||
    contentType?.includes("spreadsheet") ||
    contentType === "application/vnd.ms-excel";

  if (isCsv || (!isXlsx && buffer.toString("utf8", 0, 200).includes(","))) {
    const text = buffer.toString("utf8");
    const parsed = Papa.parse<Record<string, unknown>>(text, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
    });
    if (parsed.errors?.length && !parsed.data?.length) {
      throw new Error(parsed.errors[0]?.message ?? "CSV parse failed");
    }
    return profileRows(parsed.data as Record<string, unknown>[], filename);
  }

  // Excel
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new Error("Workbook has no sheets");
  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: null,
    raw: false,
  });
  return profileRows(rows, filename);
}

export function parseBase64File(input: string): {
  buffer: Buffer;
  contentType: string;
} {
  let contentType = "application/octet-stream";
  let b64 = input;
  const m = /^data:([^;]+);base64,(.+)$/s.exec(input);
  if (m) {
    contentType = m[1];
    b64 = m[2];
  }
  const buffer = Buffer.from(b64, "base64");
  if (!buffer.length) throw new Error("Invalid file data");
  if (buffer.length > MAX_FILE_BYTES) throw new Error("File too large (max 10MB)");
  return { buffer, contentType };
}
