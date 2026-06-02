import { safeFilenameText } from "./formatUtils";
import { downloadXlsx } from "./xlsxExporter";

export function buildExportFilename(prefix, values, extension) {
  const safeValues = values.map(safeFilenameText).filter(Boolean);
  const cleanExtension = String(extension).replace(/^\./, "");

  return `${[prefix, ...safeValues].join("_")}.${cleanExtension}`;
}

export function downloadSpreadsheet(rows, filename, sheetName = "Informe") {
  downloadXlsx(rows, filename, sheetName);
}
