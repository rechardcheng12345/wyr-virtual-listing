export function filterListingsByText(listings, searchText) {
  const query = searchText.trim().toLowerCase();
  if (!query) return listings;

  return listings.filter((listing) => {
    const sku = String(listing.sku ?? '').toLowerCase();
    const productName = String(listing.product_name ?? '').toLowerCase();
    return sku.includes(query) || productName.includes(query);
  });
}
