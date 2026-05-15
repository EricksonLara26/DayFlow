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

function createSheetXml(rows) {
  const sheetRows = rows
    .map((row, rowIndex) => {
      const cells = row
        .map((value, columnIndex) => {
          const reference = `${columnName(columnIndex)}${rowIndex + 1}`;

          if (typeof value === "number") {
            return `<c r="${reference}"><v>${value}</v></c>`;
          }

          return `<c r="${reference}" t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`;
        })
        .join("");

      return `<row r="${rowIndex + 1}">${cells}</row>`;
    })
    .join("");

  return `${XML_HEADER}<worksheet xmlns="${XMLNS_MAIN}"><sheetData>${sheetRows}</sheetData></worksheet>`;
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
  return `${XML_HEADER}<styleSheet xmlns="${XMLNS_MAIN}"><fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts><fills count="1"><fill><patternFill patternType="none"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs></styleSheet>`;
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
