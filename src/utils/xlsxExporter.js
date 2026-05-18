const XML_HEADER = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const XMLNS_MAIN = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const XMLNS_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const encoder = new TextEncoder();

function escapeXml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function columnName(index) {
  let name = "";
  let current = index + 1;

  while (current > 0) {
    const remainder = (current - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    current = Math.floor((current - 1) / 26);
  }

  return name;
}

const COLUMN_WIDTH_LIMITS = [
  { min: 11, max: 14 },
  { min: 28, max: 46 },
  { min: 16, max: 22 },
  { min: 16, max: 24 },
  { min: 20, max: 28 },
  { min: 20, max: 28 },
  { min: 20, max: 24 },
  { min: 20, max: 24 },
  { min: 20, max: 24 },
  { min: 14, max: 18 },
  { min: 17, max: 22 },
];

function getMaxColumnCount(rows) {
  return Math.max(1, ...rows.map((row) => row.length));
}

function getHeaderRowIndex(rows) {
  return rows.findIndex((row) => row[0] === "ID ticket");
}

function getColumnWidths(rows, maxColumnCount) {
  return Array.from({ length: maxColumnCount }, (_, columnIndex) => {
    const limits = COLUMN_WIDTH_LIMITS[columnIndex] ?? { min: 12, max: 32 };
    const longestText = rows.reduce((longest, row, rowIndex) => {
      const value = row[columnIndex];

      if (rowIndex === 0 && columnIndex > 0) {
        return longest;
      }

      return Math.max(longest, String(value ?? "").length);
    }, 0);
    const width = Math.max(limits.min, Math.min(limits.max, longestText + 2));

    return Math.round(width * 10) / 10;
  });
}

function getRowHeight(rowIndex, headerRowIndex) {
  if (rowIndex === 0) {
    return 30;
  }

  if (rowIndex === headerRowIndex) {
    return 34;
  }

  if (rowIndex > headerRowIndex) {
    return 24;
  }

  return rowIndex === headerRowIndex - 1 ? 10 : 22;
}

function getCellStyleId(rowIndex, columnIndex, headerRowIndex) {
  if (rowIndex === 0) {
    return 1;
  }

  if (rowIndex === 1 || rowIndex === 2) {
    return columnIndex === 0 ? 2 : 3;
  }

  if (rowIndex === headerRowIndex) {
    return 4;
  }

  if (headerRowIndex >= 0 && rowIndex > headerRowIndex) {
    if (columnIndex === 0) {
      return 6;
    }

    if ([6, 7, 8].includes(columnIndex)) {
      return 7;
    }

    if (columnIndex === 9) {
      return 8;
    }

    return 5;
  }

  return 0;
}

function createCellXml(value, reference, styleId) {
  const styleAttribute = styleId ? ` s="${styleId}"` : "";

  if (typeof value === "number" && Number.isFinite(value)) {
    return `<c r="${reference}"${styleAttribute}><v>${value}</v></c>`;
  }

  if (typeof value === "boolean") {
    return `<c r="${reference}"${styleAttribute} t="b"><v>${value ? 1 : 0}</v></c>`;
  }

  return `<c r="${reference}"${styleAttribute} t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`;
}

function createSheetXml(rows) {
  const maxColumnCount = getMaxColumnCount(rows);
  const lastColumnName = columnName(maxColumnCount - 1);
  const lastRowNumber = Math.max(1, rows.length);
  const headerRowIndex = getHeaderRowIndex(rows);
  const frozenRowCount = headerRowIndex >= 0 ? headerRowIndex + 1 : 1;
  const columnWidths = getColumnWidths(rows, maxColumnCount);
  const columnsXml = columnWidths
    .map(
      (width, columnIndex) =>
        `<col min="${columnIndex + 1}" max="${columnIndex + 1}" width="${width}" customWidth="1"/>`,
    )
    .join("");
  const sheetRows = rows
    .map((row, rowIndex) => {
      const cells = row
        .map((value, columnIndex) => {
          const reference = `${columnName(columnIndex)}${rowIndex + 1}`;
          const styleId = getCellStyleId(rowIndex, columnIndex, headerRowIndex);

          return createCellXml(value, reference, styleId);
        })
        .join("");
      const rowHeight = getRowHeight(rowIndex, headerRowIndex);

      return `<row r="${rowIndex + 1}" ht="${rowHeight}" customHeight="1">${cells}</row>`;
    })
    .join("");
  const filterXml =
    headerRowIndex >= 0
      ? `<autoFilter ref="A${headerRowIndex + 1}:${lastColumnName}${lastRowNumber}"/>`
      : "";
  const mergeXml =
    maxColumnCount > 1 ? `<mergeCells count="1"><mergeCell ref="A1:${lastColumnName}1"/></mergeCells>` : "";

  return `${XML_HEADER}<worksheet xmlns="${XMLNS_MAIN}"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><dimension ref="A1:${lastColumnName}${lastRowNumber}"/><sheetViews><sheetView workbookViewId="0" showGridLines="0"><pane ySplit="${frozenRowCount}" topLeftCell="A${frozenRowCount + 1}" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="18"/><cols>${columnsXml}</cols><sheetData>${sheetRows}</sheetData>${filterXml}${mergeXml}<pageMargins left="0.25" right="0.25" top="0.5" bottom="0.5" header="0.3" footer="0.3"/><pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0"/></worksheet>`;
}

function createWorkbookXml(sheetName) {
  return `${XML_HEADER}<workbook xmlns="${XMLNS_MAIN}" xmlns:r="${XMLNS_REL}"><sheets><sheet name="${escapeXml(
    sheetName,
  )}" sheetId="1" r:id="rId1"/></sheets></workbook>`;
}

function createWorkbookRelsXml() {
  return `${XML_HEADER}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${XMLNS_REL}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${XMLNS_REL}/styles" Target="styles.xml"/></Relationships>`;
}

function createRootRelsXml() {
  return `${XML_HEADER}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${XMLNS_REL}/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
}

function createContentTypesXml() {
  return `${XML_HEADER}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`;
}

function createStylesXml() {
  return `${XML_HEADER}<styleSheet xmlns="${XMLNS_MAIN}"><fonts count="5"><font><sz val="11"/><color rgb="FF1F2937"/><name val="Calibri"/><family val="2"/></font><font><b/><sz val="16"/><color rgb="FF0F172A"/><name val="Calibri"/><family val="2"/></font><font><b/><sz val="11"/><color rgb="FF334155"/><name val="Calibri"/><family val="2"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font><font><b/><sz val="11"/><color rgb="FF166534"/><name val="Calibri"/><family val="2"/></font></fonts><fills count="7"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFEAF6F3"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF8FAFC"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FF0F766E"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFFFFF"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFDCFCE7"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFE2E8F0"/></left><right style="thin"><color rgb="FFE2E8F0"/></right><top style="thin"><color rgb="FFE2E8F0"/></top><bottom style="thin"><color rgb="FFE2E8F0"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="9"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf><xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf><xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf><xf numFmtId="0" fontId="3" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="5" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="5" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf><xf numFmtId="0" fontId="0" fillId="5" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="4" fillId="6" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles><dxfs count="0"/><tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/></styleSheet>`;
}

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;

  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }

  return value >>> 0;
});

function crc32(bytes) {
  let crc = 0xffffffff;

  for (const byte of bytes) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date = new Date()) {
  const year = Math.max(1980, date.getFullYear());
  const dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const dosDate = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();

  return { dosDate, dosTime };
}

function writeBytes(target, offset, bytes) {
  target.set(bytes, offset);
}

function createHeader(size) {
  const bytes = new Uint8Array(size);
  return {
    bytes,
    view: new DataView(bytes.buffer),
  };
}

function createZip(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  const { dosDate, dosTime } = dosDateTime();

  entries.forEach((entry) => {
    const nameBytes = encoder.encode(entry.name);
    const dataBytes = encoder.encode(entry.content);
    const checksum = crc32(dataBytes);

    const local = createHeader(30 + nameBytes.length);
    local.view.setUint32(0, 0x04034b50, true);
    local.view.setUint16(4, 20, true);
    local.view.setUint16(6, 0, true);
    local.view.setUint16(8, 0, true);
    local.view.setUint16(10, dosTime, true);
    local.view.setUint16(12, dosDate, true);
    local.view.setUint32(14, checksum, true);
    local.view.setUint32(18, dataBytes.length, true);
    local.view.setUint32(22, dataBytes.length, true);
    local.view.setUint16(26, nameBytes.length, true);
    local.view.setUint16(28, 0, true);
    writeBytes(local.bytes, 30, nameBytes);

    localParts.push(local.bytes, dataBytes);

    const central = createHeader(46 + nameBytes.length);
    central.view.setUint32(0, 0x02014b50, true);
    central.view.setUint16(4, 20, true);
    central.view.setUint16(6, 20, true);
    central.view.setUint16(8, 0, true);
    central.view.setUint16(10, 0, true);
    central.view.setUint16(12, dosTime, true);
    central.view.setUint16(14, dosDate, true);
    central.view.setUint32(16, checksum, true);
    central.view.setUint32(20, dataBytes.length, true);
    central.view.setUint32(24, dataBytes.length, true);
    central.view.setUint16(28, nameBytes.length, true);
    central.view.setUint16(30, 0, true);
    central.view.setUint16(32, 0, true);
    central.view.setUint16(34, 0, true);
    central.view.setUint16(36, 0, true);
    central.view.setUint32(38, 0, true);
    central.view.setUint32(42, offset, true);
    writeBytes(central.bytes, 46, nameBytes);

    centralParts.push(central.bytes);
    offset += local.bytes.length + dataBytes.length;
  });

  const centralSize = centralParts.reduce((total, part) => total + part.length, 0);
  const end = createHeader(22);
  end.view.setUint32(0, 0x06054b50, true);
  end.view.setUint16(4, 0, true);
  end.view.setUint16(6, 0, true);
  end.view.setUint16(8, entries.length, true);
  end.view.setUint16(10, entries.length, true);
  end.view.setUint32(12, centralSize, true);
  end.view.setUint32(16, offset, true);
  end.view.setUint16(20, 0, true);

  return new Blob([...localParts, ...centralParts, end.bytes], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export function buildXlsxBlob(rows, sheetName = "Informe") {
  return createZip([
    { name: "[Content_Types].xml", content: createContentTypesXml() },
    { name: "_rels/.rels", content: createRootRelsXml() },
    { name: "xl/workbook.xml", content: createWorkbookXml(sheetName) },
    { name: "xl/_rels/workbook.xml.rels", content: createWorkbookRelsXml() },
    { name: "xl/styles.xml", content: createStylesXml() },
    { name: "xl/worksheets/sheet1.xml", content: createSheetXml(rows) },
  ]);
}

export function downloadXlsx(rows, filename, sheetName) {
  const blob = buildXlsxBlob(rows, sheetName);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
