import assert from 'node:assert/strict';
import { buildHistoryItems } from './emailHistory.js';

const listings = [
  {
    id: 10,
    sku: 'SKU-10',
    product_name: 'Digital Course',
    url_link: 'https://example.com/course',
  },
  {
    id: 11,
    sku: null,
    product_name: null,
    url_link: null,
  },
];

assert.deepEqual(
  buildHistoryItems(listings, new Map([[10, 'https://signed.example.com/course']])),
  [
    {
      listing_id: 10,
      sku: 'SKU-10',
      product_name: 'Digital Course',
      download_url: 'https://signed.example.com/course',
    },
    {
      listing_id: 11,
      sku: '',
      product_name: '',
      download_url: null,
    },
  ],
  'buildHistoryItems snapshots listing product data and generated download URLs'
);
