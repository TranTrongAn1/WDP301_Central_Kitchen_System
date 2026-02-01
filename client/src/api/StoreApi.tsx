import apiClient from './Client';
export interface Store {
  _id: string;
  storeName: string;
  adress: string;
  phone_number: string;
  store_code: string;
  status: boolean;
}

export const storeApi = {
  getAllStores: async () => {
    const res = await apiClient.get<Store[]>('/stores');
    // Ép kiểu: "res" thực tế là mảng Store[]
    return res.data || [];
  },
  };