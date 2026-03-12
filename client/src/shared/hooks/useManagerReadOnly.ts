import { useAuthStore } from '@/shared/zustand/authStore';

export function useManagerReadOnly() {
  const { user } = useAuthStore();

  return {
    user,
    isManagerReadOnly: user?.role === 'Manager',
  };
}

