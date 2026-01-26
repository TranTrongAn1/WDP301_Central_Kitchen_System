import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User, UserRole } from '@/shared/types/auth';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
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
        localStorage.setItem('token', token);
        set({ user, token, isAuthenticated: true });
      },

      logout: () => {
        localStorage.removeItem('token');
        set({ user: null, token: null, isAuthenticated: false });
      },

      getRedirectRoute: () => {
        const { user } = get();
        if (!user) return '/login';

        const roleRoutes: Record<UserRole, string> = {
          Admin: '/admin/dashboard',
          Manager: '/manager/dashboard',
          KitchenStaff: '/kitchen/dashboard',
          StoreStaff: '/store/dashboard',
          Coordinator: '/coordinator/dashboard',
        };

        return roleRoutes[user.role] || '/dashboard';
      },

      hasRole: (roles: UserRole[]) => {
        const { user } = get();
        if (!user) return false;
        return roles.includes(user.role as UserRole);
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

