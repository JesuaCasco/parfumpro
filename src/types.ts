export type ProductType = 'perfume' | 'decant';

export interface Product {
  id: number;
  name: string;
  brand: string;
  type: ProductType;
  volume: string;
  price: number;
  stock: number;
}

export interface Sale {
  id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  total: number;
  sold_at: string;
}
