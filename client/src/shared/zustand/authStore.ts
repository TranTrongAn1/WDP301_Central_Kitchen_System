import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User, UserRole } from '@/shared/types/auth';

const KNOWN_ROLES: UserRole[] = [
  'Admin',
  'Manager',
  'KitchenStaff',
  'StoreStaff',
  'Coordinator',
];

const ROLE_ROUTES: Record<UserRole, string> = {
  Admin: '/admin/dashboard',
  Manager: '/manager/dashboard',
  KitchenStaff: '/kitchen/dashboard',
  StoreStaff: '/store/dashboard',
  Coordinator: '/coordinator/dashboard',
};

/** Chuẩn hóa role từ BE (khác hoa thường / khoảng trắng) để khớp UserRole */
export function normalizeUserRole(role: unknown): UserRole | null {
  if (role === undefined || role === null) return null;
  const s = String(role).trim();
  if (!s) return null;
  if ((KNOWN_ROLES as readonly string[]).includes(s)) return s as UserRole;
  const compact = s.toLowerCase().replace(/\s+/g, '');
  for (const r of KNOWN_ROLES) {
    if (r.toLowerCase().replace(/\s+/g, '') === compact) return r;
  }
  const alias: Record<string, UserRole> = {
    admin: 'Admin',
    manager: 'Manager',
    kitchenstaff: 'KitchenStaff',
    storestaff: 'StoreStaff',
    coordinator: 'Coordinator',
  };
  return alias[compact] ?? null;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => boolean;
  logout: () => void;
  getRedirectRoute: () => string;
  hasRole: (roles: UserRole[]) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      setAuth: (user: User, token: string) => {
        const normalizedRole = normalizeUserRole(user.role);
        if (!normalizedRole) {
          console.warn('[auth] Role không hợp lệ từ API:', user.role);
          return false;
        }
        localStorage.setItem('token', token);
        set({
          user: { ...user, role: normalizedRole },
          token,
          isAuthenticated: true,
        });
        return true;
      },

      logout: () => {
        localStorage.removeItem('token');
        set({ user: null, token: null, isAuthenticated: false });
      },

      getRedirectRoute: () => {
        const { user } = get();
        if (!user) return '/login';
        const r = normalizeUserRole(user.role);
        if (!r) return '/login';
        return ROLE_ROUTES[r] ?? '/login';
      },

      hasRole: (roles: UserRole[]) => {
        const { user } = get();
        if (!user) return false;
        const r = normalizeUserRole(user.role);
        if (!r) return false;
        return roles.includes(r);
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (!state?.user?.role) return;
        const n = normalizeUserRole(state.user.role);
        if (n && n !== state.user.role) {
          useAuthStore.setState({ user: { ...state.user, role: n } });
        }
      },
    }
  )
);

