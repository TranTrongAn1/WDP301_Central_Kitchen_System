// lib/suppliers.ts

export type SupplierStatus = 'Active' | 'Inactive';

export interface Supplier {
  _id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  status: SupplierStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SuppliersResponse {
  success: boolean;
  count: number;
  total: number;
  page: number;
  pages: number;
  data: Supplier[];
}

export interface SupplierResponse {
  success: boolean;
  data: Supplier;
}