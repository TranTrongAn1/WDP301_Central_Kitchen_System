import { useCallback, useEffect, useState } from 'react';

import { authApi } from '@/lib/api';
import type { User } from '@/lib/auth';
import { useAuth } from '@/hooks/use-auth';

export const useProfile = () => {
  const { token, user: storedUser } = useAuth();
  const [profile, setProfile] = useState<User | null>(storedUser);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!token) {
      setProfile(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await authApi.me(token);
      if (response.success) {
        setProfile(response.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    setProfile(storedUser);
  }, [storedUser]);

  useEffect(() => {
    if (token) {
      fetchProfile();
    }
  }, [fetchProfile, token]);

  return { profile, isLoading, error, refetch: fetchProfile };
};
