import apiClient from './Client';

export interface SystemSetting {
  _id: string;
  key: string;
  value: string;
  description?: string;
  isPublic: boolean;
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

export const systemSettingApi = {
  getAll: (publicOnly?: boolean) => {
    const query = publicOnly ? '?publicOnly=true' : '';
    return apiClient.get(`/system-settings${query}`) as Promise<SystemSettingListResponse>;
  },

  getByKey: (key: string) =>
    apiClient.get(`/system-settings/${encodeURIComponent(key)}`) as Promise<SystemSettingResponse>,

  update: (
    key: string,
    payload: Partial<Pick<SystemSetting, 'value' | 'description' | 'isPublic'>>
  ) =>
    apiClient.put(
      `/system-settings/${encodeURIComponent(key)}`,
      payload
    ) as Promise<SystemSettingResponse>,
};

