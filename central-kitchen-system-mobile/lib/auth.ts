export type User = {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: string;
  storeId: string | null;
  storeName: string | null;
  isActive: boolean;
  createdAt?: string;
};

export type LoginResponse = {
  success: boolean;
  message: string;
  token: string;
  user: User;
};

export type MeResponse = {
  success: boolean;
  data: User;
};

const ALLOWED_ROLES = ['StoreStaff', 'KitchenStaff'] as const;

export type AllowedRole = (typeof ALLOWED_ROLES)[number];

export const isAllowedRole = (role: string) =>
  ALLOWED_ROLES.includes(role as AllowedRole);
