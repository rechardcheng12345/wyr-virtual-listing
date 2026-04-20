import assert from 'node:assert/strict';
import { formatSingaporeDateTime } from './dateTime.js';

assert.equal(
  formatSingaporeDateTime('2026-04-20T12:00:00Z'),
  '20 Apr 2026, 08:00 pm SGT',
  'formats timestamps in Asia/Singapore timezone'
);

assert.equal(
  formatSingaporeDateTime('2026-04-20 12:00:00'),
  '20 Apr 2026, 08:00 pm SGT',
  'treats timezone-less backend timestamps as UTC before formatting in Singapore time'
);
