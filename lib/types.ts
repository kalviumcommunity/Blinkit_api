export type Manager = { id: number; name: string; email: string };
export type Product = {
  id: number;
  name: string;
  category: string;
  price: string;
  stock: number;
  version: number;
  updated_at: string;
};
export type InventoryLog = {
  id: number;
  product_id: number;
  product_name: string;
  manager_id: number;
  manager_name: string;
  change: number;
  old_stock: number;
  new_stock: number;
  created_at: string;
};
