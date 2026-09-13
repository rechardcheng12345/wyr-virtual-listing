// Port of the CloneCardSellerProgram TIDParser (TIDParser.cs).
// Identifies the RFID chip make/model from the first bytes of the TID memory
// bank (Data C). Kept behaviourally identical to the desktop app.

// First 4 TID bytes (8 hex chars) identify make/model. Longer prefixes must be
// listed before shorter ones. Sources: GS1 EPC TDS MDID/TMN layout and
// published Impinj / Alien / NXP TID headers.
const KNOWN_CHIPS = [
  ['E2003411', 'Alien Technology', 'Higgs-2', 'Alien Higgs-2', '96-bit EPC, 32-bit TID'],
  ['E2003412', 'Alien Technology', 'Higgs-3', 'Alien Higgs-3', '96-bit EPC, 512-bit User Memory'],
  ['E2003414', 'Alien Technology', 'Higgs-4', 'Alien Higgs-4', '128-bit EPC, 128-bit User Memory'],
  ['E2003811', 'Alien Technology', 'Higgs-EC', 'Alien Higgs-EC', '128-bit EPC, 128-bit User Memory'],
  ['E2803821', 'Alien Technology', 'Higgs-9', 'Alien Higgs-9', '96-bit EPC, 688-bit User Memory'],

  ['E200104', 'Impinj', 'Monza 1', 'Impinj Monza 1', '96-bit EPC, legacy'],
  ['E200105', 'Impinj', 'Monza 1', 'Impinj Monza 1a', '96-bit EPC, legacy'],
  ['E200107', 'Impinj', 'Monza 2', 'Impinj Monza 2', '96-bit EPC, legacy'],
  ['E200109', 'Impinj', 'Monza 3', 'Impinj Monza 3', '96-bit EPC, legacy'],
  ['E2801100', 'Impinj', 'Monza 4', 'Impinj Monza 4D', '128-bit EPC, 32-bit User Memory'],
  ['E2801104', 'Impinj', 'Monza 4', 'Impinj Monza 4U', '128-bit EPC, 512-bit User Memory'],
  ['E2801105', 'Impinj', 'Monza 4', 'Impinj Monza 4QT', '128-bit EPC, 512-bit User Memory, QT privacy'],
  ['E280110C', 'Impinj', 'Monza 4', 'Impinj Monza 4E', '496-bit EPC, 128-bit User Memory'],
  ['E2801114', 'Impinj', 'Monza 4', 'Impinj Monza 4i', '256-bit EPC, 480-bit User Memory'],
  ['E2801130', 'Impinj', 'Monza 5', 'Impinj Monza 5', '128-bit EPC'],
  ['E2801140', 'Impinj', 'Monza X', 'Impinj Monza X-2K', '2K-bit User Memory'],
  ['E2801150', 'Impinj', 'Monza X', 'Impinj Monza X-8K', '8K-bit User Memory'],
  ['E2801160', 'Impinj', 'Monza R6', 'Impinj Monza R6', '96-bit EPC, AutoTune'],
  ['E2801170', 'Impinj', 'Monza R6-P', 'Impinj Monza R6-P', '96/128-bit EPC, 32/64-bit User Memory'],
  ['E2801171', 'Impinj', 'Monza R6-A', 'Impinj Monza R6-A/R6-B', '96-bit EPC'],
  ['E2801173', 'Impinj', 'Monza S6-C', 'Impinj Monza S6-C', 'Specialty Monza 6'],
  ['E2801191', 'Impinj', 'M730', 'Impinj M730', '128-bit EPC'],
  ['E2801190', 'Impinj', 'M750', 'Impinj M750', '96-bit EPC, 32-bit User Memory'],
  ['E28011A0', 'Impinj', 'M770', 'Impinj M770', '128-bit EPC, 32-bit User Memory'],
  ['E28011C1', 'Impinj', 'M780', 'Impinj M781', '128-bit EPC, 512-bit User Memory'],
  ['E28011C0', 'Impinj', 'M780', 'Impinj M780', 'High-memory M780 series'],
  ['E2801180', 'Impinj', 'M800', 'Impinj M830/M850', 'M800 series'],
  ['E2C011A2', 'Impinj', 'M775', 'Impinj M775', 'Cryptographic M770 variant'],

  ['E2006001', 'NXP Semiconductors', 'EPC Gen2', 'NXP EPC Gen2 (legacy)', 'Legacy Class-1 Gen2'],
  ['E2006003', 'NXP Semiconductors', 'UCODE G2XM', 'NXP UCODE G2XM', '240-bit EPC, extended memory'],
  ['E2006004', 'NXP Semiconductors', 'UCODE G2XL', 'NXP UCODE G2XL', '240-bit EPC'],
  ['E2006806', 'NXP Semiconductors', 'UCODE G2iL', 'NXP UCODE G2iL', '96-bit EPC'],
  ['E2006807', 'NXP Semiconductors', 'UCODE G2iL+', 'NXP UCODE G2iL+', '96-bit EPC, enhanced range'],
  ['E200680A', 'NXP Semiconductors', 'UCODE G2iM', 'NXP UCODE G2iM', '96-bit EPC'],
  ['E200680B', 'NXP Semiconductors', 'UCODE G2iM+', 'NXP UCODE G2iM+', 'Enhanced G2iM'],
  ['E200680D', 'NXP Semiconductors', 'UCODE I2C', 'NXP UCODE I2C', 'I2C interface'],
  ['E200688D', 'NXP Semiconductors', 'UCODE I2C', 'NXP UCODE I2C', 'I2C interface'],
  ['E2806810', 'NXP Semiconductors', 'UCODE 7', 'NXP UCODE 7', '128-bit EPC'],
  ['E2806890', 'NXP Semiconductors', 'UCODE 7', 'NXP UCODE 7', '128-bit EPC'],
  ['E2806891', 'NXP Semiconductors', 'UCODE 7m', 'NXP UCODE 7m', 'UCODE 7 with User Memory'],
  ['E2806D12', 'NXP Semiconductors', 'UCODE 7xm', 'NXP UCODE 7xm', '448-bit EPC, 1K User Memory'],
  ['E2806F12', 'NXP Semiconductors', 'UCODE 7xm', 'NXP UCODE 7xm', '448-bit EPC, 2K User Memory'],
  ['E2806D92', 'NXP Semiconductors', 'UCODE 7xm+', 'NXP UCODE 7xm+', '448-bit EPC, 2K User Memory'],
  ['E2806894', 'NXP Semiconductors', 'UCODE 8', 'NXP UCODE 8', '128-bit EPC'],
  ['E2806994', 'NXP Semiconductors', 'UCODE 8m', 'NXP UCODE 8m', '96-bit EPC, 32-bit User Memory'],
  ['E2806895', 'NXP Semiconductors', 'UCODE 9', 'NXP UCODE 9', '96-bit EPC'],
  ['E2806995', 'NXP Semiconductors', 'UCODE 9', 'NXP UCODE 9', '96-bit EPC'],
  ['E2806915', 'NXP Semiconductors', 'UCODE 9', 'NXP UCODE 9', '96-bit EPC'],
  ['E2806A16', 'NXP Semiconductors', 'UCODE 9xe', 'NXP UCODE 9xe', '128-bit EPC'],
  ['E2806A96', 'NXP Semiconductors', 'UCODE 9xe', 'NXP UCODE 9xe', '128-bit EPC'],
  ['E2C06B12', 'NXP Semiconductors', 'UCODE DNA', 'NXP UCODE DNA', 'Cryptographic authentication'],
  ['E2C06892', 'NXP Semiconductors', 'UCODE DNA', 'NXP UCODE DNA', 'Cryptographic authentication'],
  ['E2C06C12', 'NXP Semiconductors', 'UCODE DNA', 'NXP UCODE DNA', 'Cryptographic authentication'],
].map(([prefix, vendor, family, model, notes]) => ({ prefix, vendor, family, model, notes }));

// ISO/IEC 15963 allocation class in TID byte 0 — not an air-interface family.
function getTagClassDescription(tagClassHex) {
  switch (tagClassHex.toUpperCase()) {
    case 'E0':
      return 'ISO/IEC 15963';
    case 'E2':
      return 'GS1 EPCglobal (EPC Gen2)';
    default:
      return `Unknown allocation class (${tagClassHex})`;
  }
}

// GS1 Gen2 TID: class E2, then X/S/F, 9-bit MDID, 12-bit TMN.
function identifyVendorByMdid(cleanHex) {
  if (cleanHex.length < 8 || !cleanHex.startsWith('E2')) return 'Unknown';
  const b1 = parseInt(cleanHex.substring(2, 4), 16);
  const b2 = parseInt(cleanHex.substring(4, 6), 16);
  const mdid = ((b1 & 0x1f) << 4) | ((b2 >> 4) & 0x0f);
  switch (mdid) {
    case 0x001:
      return 'Impinj';
    case 0x002:
      return 'Texas Instruments';
    case 0x003:
      return 'Alien Technology';
    case 0x004:
      return 'Intelleflex';
    case 0x005:
      return 'Atmel';
    case 0x006:
      return 'NXP Semiconductors';
    default:
      return 'Unknown';
  }
}

function identifyVendorFamilyModel(cleanHex) {
  let best = null;
  for (const chip of KNOWN_CHIPS) {
    if (cleanHex.startsWith(chip.prefix) && (best === null || chip.prefix.length > best.prefix.length)) {
      best = chip;
    }
  }
  if (best) {
    return { vendor: best.vendor, family: best.family, model: best.model, notes: best.notes };
  }

  const header = cleanHex.length >= 8 ? cleanHex.substring(0, 8) : cleanHex;
  const vendor = identifyVendorByMdid(cleanHex);
  if (vendor !== 'Unknown') {
    return {
      vendor,
      family: vendor,
      model: `${vendor} (TID: ${header})`,
      notes: 'Known manufacturer, unrecognized model',
    };
  }
  return {
    vendor: 'Unknown',
    family: 'Unknown',
    model: `Unknown (TID: ${header})`,
    notes: 'Unrecognized manufacturer pattern',
  };
}

export function parseTIDData(hexData) {
  const result = {
    tagClass: 'Unknown',
    vendor: 'Unknown',
    tagFamily: 'Unknown',
    tagModel: 'Unknown',
    modelNotes: '',
    xtidSupported: 'No',
    isValid: false,
    errorMessage: '',
  };

  try {
    if (!hexData || !hexData.trim()) {
      result.errorMessage = 'TID data is empty';
      return result;
    }

    const cleanHex = hexData.replace(/ /g, '').replace(/\t/g, '').toUpperCase();

    if (cleanHex.includes('NO DATA') || cleanHex.includes('ACCESS DENIED')) {
      result.errorMessage = 'TID data not accessible';
      return result;
    }

    if (cleanHex.length < 8) {
      result.errorMessage = 'TID data too short (minimum 4 bytes required)';
      return result;
    }

    result.tagClass = getTagClassDescription(cleanHex.substring(0, 2));

    const secondByte = parseInt(cleanHex.substring(2, 4), 16);
    result.xtidSupported = (secondByte & 0x80) !== 0 ? 'Yes' : 'No';

    const { vendor, family, model, notes } = identifyVendorFamilyModel(cleanHex);
    result.vendor = vendor;
    result.tagFamily = family;
    result.tagModel = model;
    result.modelNotes = notes;
    result.isValid = true;
  } catch (err) {
    result.errorMessage = `TID parsing error: ${err.message}`;
  }

  return result;
}
