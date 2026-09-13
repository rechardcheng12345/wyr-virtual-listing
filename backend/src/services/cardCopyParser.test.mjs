import assert from 'node:assert/strict';
import { parseClipboardText } from './cardCopyParser.js';
import { parseTIDData } from './cardCopyTidParser.js';

// --- TID parser ---
const higgs3 = parseTIDData('E2003412 01234567');
assert.equal(higgs3.isValid, true);
assert.equal(higgs3.vendor, 'Alien Technology');
assert.equal(higgs3.tagModel, 'Alien Higgs-3');
assert.equal(higgs3.tagClass, 'GS1 EPCglobal (EPC Gen2)');

// Longer prefixes win over shorter ones (Monza 4QT vs the Monza 1 "E200110" family).
const monza4qt = parseTIDData('E2801105ABCDEF');
assert.equal(monza4qt.tagModel, 'Impinj Monza 4QT');

// Known manufacturer via MDID fallback when the exact model is unlisted.
// E2 00 60 -> MDID 0x006 (NXP), but "E2006099" matches no listed model prefix.
const nxpUnknownModel = parseTIDData('E2006099FFFF');
assert.equal(nxpUnknownModel.vendor, 'NXP Semiconductors');
assert.match(nxpUnknownModel.modelNotes, /unrecognized model/);

const tooShort = parseTIDData('E200');
assert.equal(tooShort.isValid, false);
assert.match(tooShort.errorMessage, /too short/);

// A "No data" bank is rejected as invalid (it collapses to 6 chars once spaces
// are stripped, so the desktop app's length guard catches it). Real defense
// against unreadable banks lives in the parser/validator below.
const inaccessible = parseTIDData('No data');
assert.equal(inaccessible.isValid, false);

// --- Clipboard parser: same-line values ---
const inline = parseClipboardText(
  [
    '=== CLIENT DATA ===',
    'Order ID: 1001',
    'Data A: 0000000000000000',
    'Data B: 3000E2003412ABCDEF01234567',
    'Data C: E2003412012345670000ABCD',
    'Data D: DEADBEEF',
    'Data E: 2026-01-01 12:00:00',
    '=== END ===',
  ].join('\n')
);
assert.equal(inline.orderId, '1001');
assert.equal(inline.dataB, '3000E2003412ABCDEF01234567');
assert.equal(inline.dataC, 'E2003412012345670000ABCD');
assert.equal(inline.dataD, 'DEADBEEF');
assert.equal(inline.dataE, '2026-01-01 12:00:00');
assert.equal(inline.vendor, 'Alien Technology');
assert.equal(inline.isValid, true);
assert.match(inline.validationMessage, /Valid order #1001/);

// --- Clipboard parser: value on the next line ---
const multiline = parseClipboardText(
  ['Order ID:', '1002', 'Data B:', 'EPCDATA1234', 'Data C:', 'E2003412FFFF'].join('\n')
);
assert.equal(multiline.orderId, '1002');
assert.equal(multiline.dataB, 'EPCDATA1234');
assert.equal(multiline.dataC, 'E2003412FFFF');
assert.equal(multiline.isValid, true);

// --- Validation failures ---
assert.match(parseClipboardText('Data B: X\nData C: Y').validationMessage, /Order ID is required/);

const missingBanks = parseClipboardText('Order ID: 3\nData B: No data\nData C: No data');
assert.equal(missingBanks.isValid, false);
assert.match(missingBanks.validationMessage, /Critical banks/);

const zeros = parseClipboardText('Order ID: 4\nData B: 0000\nData C: E2003412');
assert.equal(zeros.isValid, false);
assert.match(zeros.validationMessage, /Data B \(EPC\) cannot be all zeros/);

const empty = parseClipboardText('   ');
assert.equal(empty.isValid, false);
assert.match(empty.validationMessage, /empty/);

console.log('cardCopyParser.test.mjs: all assertions passed');
