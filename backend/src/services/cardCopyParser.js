// Port of the CloneCardSellerProgram ClipboardData parser + validator
// (ClipboardData.cs). Parses the client's pasted memory-bank dump and validates
// that the critical banks (EPC/Data B and TID/Data C) are present and non-zero.
import { parseTIDData } from './cardCopyTidParser.js';

function extractDataValue(line) {
  const colonIndex = line.indexOf(':');
  if (colonIndex >= 0 && colonIndex < line.length - 1) {
    return line.substring(colonIndex + 1).trim();
  }
  return '';
}

function isAllZeros(hexData) {
  if (!hexData) return true;
  const cleanData = hexData.replace(/ /g, '').replace(/\t/g, '');
  if (cleanData.length === 0) return true;
  for (const c of cleanData) {
    if (c !== '0') return false;
  }
  return true;
}

function startsWithCI(line, prefix) {
  return line.toLowerCase().startsWith(prefix.toLowerCase());
}

function isRealBank(value) {
  return !!value && !value.includes('No data') && !value.includes('Access denied');
}

// Expected client format (banks may sit on the same line or the next line):
//   Order ID: [order number]
//   Data A: [hex]   (Reserved / Bank 0)
//   Data B: [hex]   (EPC / Bank 1)
//   Data C: [hex]   (TID / Bank 2)
//   Data D: [hex]   (User / Bank 3)
//   Data E: [datetime]
export function parseClipboardText(clipboardText) {
  const data = {
    orderId: '',
    dataA: null,
    dataB: null,
    dataC: null,
    dataD: null,
    dataE: null,
    receivedTime: new Date().toISOString(),
    isValid: false,
    validationMessage: '',
    tagClass: null,
    vendor: null,
    tagFamily: null,
    tagModel: null,
    modelNotes: null,
    xtidSupported: null,
  };

  try {
    if (!clipboardText || !clipboardText.trim()) {
      data.validationMessage = 'Clipboard is empty';
      return data;
    }

    const lines = clipboardText.split(/[\r\n]+/).filter((l) => l.length > 0);
    let validDataCount = 0;
    let currentDataType = '';

    const bankSetters = {
      A: (v) => { data.dataA = v; },
      B: (v) => { data.dataB = v; },
      C: (v) => { data.dataC = v; },
      D: (v) => { data.dataD = v; },
    };

    for (const rawLine of lines) {
      const trimmedLine = rawLine.trim();
      if (trimmedLine.startsWith('===')) continue;

      if (startsWithCI(trimmedLine, 'Order ID:')) {
        currentDataType = 'OrderID';
        const sameLineData = extractDataValue(trimmedLine);
        if (sameLineData) {
          data.orderId = sameLineData;
          currentDataType = '';
        }
      } else if (startsWithCI(trimmedLine, 'Data A:') || startsWithCI(trimmedLine, 'Data B:') ||
                 startsWithCI(trimmedLine, 'Data C:') || startsWithCI(trimmedLine, 'Data D:')) {
        const bank = trimmedLine.substring(5, 6).toUpperCase();
        currentDataType = bank;
        const sameLineData = extractDataValue(trimmedLine);
        if (sameLineData) {
          bankSetters[bank](sameLineData);
          if (isRealBank(sameLineData)) validDataCount++;
          currentDataType = '';
        }
      } else if (startsWithCI(trimmedLine, 'Data E:')) {
        currentDataType = 'E';
        const sameLineData = extractDataValue(trimmedLine);
        if (sameLineData) {
          data.dataE = sameLineData;
          currentDataType = '';
        }
      } else if (currentDataType && trimmedLine) {
        // Data supplied on the line after its header.
        switch (currentDataType) {
          case 'OrderID':
            data.orderId = trimmedLine;
            break;
          case 'A':
          case 'B':
          case 'C':
          case 'D':
            bankSetters[currentDataType](trimmedLine);
            if (isRealBank(trimmedLine)) validDataCount++;
            break;
          case 'E':
            data.dataE = trimmedLine;
            break;
          default:
            break;
        }
        currentDataType = '';
      }
    }

    if (data.dataC) {
      const tid = parseTIDData(data.dataC);
      data.tagClass = tid.tagClass;
      data.vendor = tid.vendor;
      data.tagFamily = tid.tagFamily;
      data.tagModel = tid.tagModel;
      data.modelNotes = tid.modelNotes;
      data.xtidSupported = tid.xtidSupported;
    } else {
      data.tagClass = 'N/A';
      data.vendor = 'N/A';
      data.tagFamily = 'N/A';
      data.tagModel = 'N/A';
      data.modelNotes = 'N/A';
      data.xtidSupported = 'N/A';
    }

    validate(data, validDataCount);
  } catch (err) {
    data.validationMessage = `Error parsing clipboard data: ${err.message}`;
  }

  return data;
}

// Mutates `data.isValid` / `data.validationMessage`. `parsedBankCount` is only
// used to enrich the success message, matching the desktop app.
export function validate(data, parsedBankCount = null) {
  data.isValid = false;

  if (!data.orderId) {
    data.validationMessage = 'Order ID is required';
    return data;
  }

  const dataBPresent = isRealBank(data.dataB);
  const dataCPresent = isRealBank(data.dataC);

  if (!dataBPresent || !dataCPresent) {
    data.validationMessage = 'Critical banks (Data B/EPC and Data C/TID) are missing';
    return data;
  }

  const dataBValid = !isAllZeros(data.dataB);
  const dataCValid = !isAllZeros(data.dataC);

  if (dataBValid && dataCValid) {
    data.isValid = true;
    const vendorInfo = data.vendor && data.vendor !== 'N/A' ? ` (${data.vendor} ${data.tagModel})` : '';
    const banksInfo = parsedBankCount !== null && parsedBankCount !== undefined ? ` with ${parsedBankCount} banks` : '';
    data.validationMessage = `Valid order #${data.orderId}${banksInfo}${vendorInfo}`;
  } else if (!dataBValid && !dataCValid) {
    data.validationMessage = 'Data B (EPC) and Data C (TID) cannot be all zeros - original tag appears empty or unwritten';
  } else if (!dataBValid) {
    data.validationMessage = 'Data B (EPC) cannot be all zeros - EPC memory appears empty';
  } else {
    data.validationMessage = 'Data C (TID) cannot be all zeros - TID memory appears empty or corrupted';
  }

  return data;
}
