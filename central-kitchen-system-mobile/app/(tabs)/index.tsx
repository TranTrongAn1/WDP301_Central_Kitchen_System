import { Redirect } from 'expo-router';
import * as React from 'react';

import { useAuth } from '@/hooks/use-auth';

export default function TabsIndex() {
  const { user } = useAuth();

  if (user?.role === 'KitchenStaff') {
    return React.createElement(Redirect, { href: '/(tabs)/inventory' });
  }

  return React.createElement(Redirect, { href: '/(tabs)/store-orders' });
}
