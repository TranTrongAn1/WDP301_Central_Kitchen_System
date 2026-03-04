import { useEffect, useState } from 'react';
import { useAuthStore } from '@/shared/zustand/authStore';
import { inventoryApi, type StoreInventoryItem, type StoreInventoryResponse } from '@/api/InventoryApi';

const StoreInventoryPage = () => {
  const { user } = useAuthStore();
  const [data, setData] = useState<StoreInventoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<StoreInventoryItem | null>(null);

  useEffect(() => {
    const fetchInventory = async () => {
      if (!user?.storeId) {
        setError('Không xác định được cửa hàng hiện tại.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const res = await inventoryApi.getByStore(user.storeId);
        const body = (res as any)?.data ?? res;
        setData(body as StoreInventoryResponse);
      } catch {
        setError('Không thể tải tồn kho cửa hàng.');
      } finally {
        setLoading(false);
      }
    };

    fetchInventory();
  }, [user?.storeId]);

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-sm text-muted-foreground">
        <span className="material-symbols-outlined animate-spin mr-2">
          progress_activity
        </span>
        Đang tải tồn kho cửa hàng...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-sm text-red-500">
        {error}
      </div>
    );
  }

  const items: StoreInventoryItem[] = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-4">
        {items.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            Chưa có dữ liệu tồn kho.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-left text-[11px] text-muted-foreground">
                  <th className="pb-2 pr-2 font-medium">Sản phẩm</th>
                  <th className="pb-2 pr-2 font-medium">SKU</th>
                  <th className="pb-2 pr-2 font-medium">Mã lô</th>
                  <th className="pb-2 pr-2 font-medium">HSD</th>
                  <th className="pb-2 pr-2 font-medium text-right">Số lượng</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr
                    key={row._id}
                    className="border-b border-border/60 hover:bg-secondary/40 cursor-pointer"
                    onClick={() => setSelectedItem(row)}
                  >
                    <td className="py-2 pr-2">
                      <div className="max-w-[220px] truncate">
                        {row.productId?.name}
                      </div>
                    </td>
                    <td className="py-2 pr-2">
                      {row.productId?.sku}
                    </td>
                    <td className="py-2 pr-2 font-mono">
                      {row.batchId?.batchCode}
                    </td>
                    <td className="py-2 pr-2">
                      {row.batchId?.expDate
                        ? new Date(row.batchId.expDate).toLocaleDateString('vi-VN')
                        : '—'}
                    </td>
                    <td className="py-2 pr-2 text-right font-semibold">
                      {row.quantity}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedItem && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-card border border-border p-4 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Chi tiết lô hàng</p>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <span className="material-symbols-outlined text-[18px]">
                  close
                </span>
              </button>
            </div>
            <div className="space-y-1">
              <p className="font-semibold">
                {selectedItem.productId?.name}
              </p>
              <p className="text-[11px] text-muted-foreground">
                SKU: {selectedItem.productId?.sku}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-0.5">
                <p className="text-[11px] text-muted-foreground">
                  Mã lô
                </p>
                <p className="font-mono text-xs">
                  {selectedItem.batchId?.batchCode}
                </p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[11px] text-muted-foreground">
                  Hạn sử dụng
                </p>
                <p className="text-xs">
                  {selectedItem.batchId?.expDate
                    ? new Date(selectedItem.batchId.expDate).toLocaleDateString('vi-VN')
                    : '—'}
                </p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[11px] text-muted-foreground">
                  Ngày nhập
                </p>
                <p className="text-xs">
                  {selectedItem.batchId?.mfgDate
                    ? new Date(selectedItem.batchId.mfgDate).toLocaleDateString('vi-VN')
                    : '—'}
                </p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[11px] text-muted-foreground">
                  Số lượng hiện tại
                </p>
                <p className="text-xs font-semibold">
                  {selectedItem.quantity}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoreInventoryPage;

