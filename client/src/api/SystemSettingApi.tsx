import apiClient from './Client';

export interface SystemSetting {
  _id: string;
  key: string;
  value: string;
  description?: string;
  isPublic: boolean;
  dataType?: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'JSON';
  group?: 'SYSTEM' | 'FINANCE' | 'DELIVERY' | 'PRODUCTION' | 'ORDER' | 'INVENTORY' | 'OTHER';
  createdAt?: string;
  updatedAt?: string;
}

interface SystemSettingListResponse {
  success: boolean;
  message?: string;
  count?: number;
  data: SystemSetting[];
}

interface SystemSettingResponse {
  success: boolean;
  message?: string;
  data: SystemSetting;
}

export interface CreateSystemSettingPayload {
  key: string;
  value: string;
  description?: string;
  isPublic?: boolean;
  dataType?: SystemSetting['dataType'];
  group?: SystemSetting['group'];
}

export const systemSettingApi = {
  getAll: (publicOnly?: boolean, group?: SystemSetting['group']) => {
    const params: string[] = [];
    if (publicOnly) params.push('publicOnly=true');
    if (group) params.push(`group=${group}`);
    const query = params.length ? `?${params.join('&')}` : '';
    return apiClient.get(`/system-settings${query}`) as Promise<SystemSettingListResponse>;
  },

  getByKey: (key: string) =>
    apiClient.get(`/system-settings/${encodeURIComponent(key)}`) as Promise<SystemSettingResponse>,

  create: (payload: CreateSystemSettingPayload) =>
    apiClient.post('/system-settings', payload) as Promise<SystemSettingResponse>,

  update: (
    key: string,
    payload: Partial<Pick<SystemSetting, 'value' | 'description' | 'isPublic'>>
  ) =>
    apiClient.put(
      `/system-settings/${encodeURIComponent(key)}`,
      payload
    ) as Promise<SystemSettingResponse>,

  delete: (key: string) =>
    apiClient.delete(`/system-settings/${encodeURIComponent(key)}`) as Promise<{ success: boolean; message?: string }>,

  seed: () =>
    apiClient.post('/system-settings/seed') as Promise<SystemSettingListResponse>,
};

