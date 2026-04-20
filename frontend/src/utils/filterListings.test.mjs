import assert from 'node:assert/strict';
import { filterListingsByText } from './filterListings.js';

const listings = [
  { sku: 'SKU-001', product_name: 'Beach Towel' },
  { sku: 'CARD-123', product_name: 'Gift Card' },
  { sku: 'ZIP-900', product_name: 'Video Bundle' },
];

assert.deepEqual(
  filterListingsByText(listings, ''),
  listings,
  'empty search returns all listings'
);

assert.deepEqual(
  filterListingsByText(listings, 'beach'),
  [listings[0]],
  'search matches product name case-insensitively'
);

assert.deepEqual(
  filterListingsByText(listings, 'card-123'),
  [listings[1]],
  'search matches SKU case-insensitively'
);

assert.deepEqual(
  filterListingsByText(listings, 'missing'),
  [],
  'search returns no rows when neither product name nor SKU matches'
);
