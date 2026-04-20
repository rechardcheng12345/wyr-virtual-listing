export interface Listing {
  id: number;
  sku: string;
  product_name: string;
  product_format: string | null;
  url_link: string | null;
  size: string | null;
  file_path: string | null;
  created_date: string;
  updated_at: string;
}

export type DeliveryMethod = 'presign_url';

export interface SendPayload {
  listing_ids: number[];
  email: string;
  delivery_method: DeliveryMethod;
}
