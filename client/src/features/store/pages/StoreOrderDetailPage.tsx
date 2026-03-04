import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { OrderApi, type Order, type UpdateOrderPayload } from '@/api/OrderApi';

const StoreOrderDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [requestedDeliveryDate, setRequestedDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const fetchOrder = async () => {
      if (!id) return;
      try {
        setLoading(true);
        setError(null);
        const data = await OrderApi.getOrderById(id);
        setOrder(data);
        setRequestedDeliveryDate(
          data.requestedDeliveryDate
            ? data.requestedDeliveryDate.slice(0, 10)
            : new Date().toISOString().slice(0, 10),
        );
        setNotes(data.notes ?? '');
      } catch {
        setError('Không thể tải chi tiết đơn hàng.');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [id]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);

  const handleSave = async () => {
    if (!order || !id) return;
    if (order.status !== 'Pending') return;

    const payload: UpdateOrderPayload = {
      requestedDeliveryDate: new Date(requestedDeliveryDate).toISOString(),
      notes: notes.trim(),
    };

    try {
      setSaving(true);
      await OrderApi.updateOrder(id, payload);
      navigate('/store/orders');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-sm text-muted-foreground">
        <span className="material-symbols-outlined animate-spin mr-2">
          progress_activity
        </span>
        Đang tải chi tiết đơn hàng...
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-500 text-center">{error ?? 'Không tìm thấy đơn hàng.'}</p>
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => navigate('/store/orders')}
            className="h-9 rounded-lg border border-border px-3 text-xs font-semibold hover:bg-secondary"
          >
            Quay lại danh sách đơn
          </button>
        </div>
      </div>
    );
  }

  const canEdit = order.status === 'Pending';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-[0.2em] font-semibold">
            Store Order
          </p>
          <p className="font-mono text-sm font-semibold">
            {order.orderCode}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Trạng thái: {order.status}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => navigate('/store/orders')}
            className="h-9 rounded-lg border border-border px-3 text-xs font-semibold hover:bg-secondary"
          >
            Quay lại
          </button>
          {canEdit && (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="h-9 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground">
            Thông tin giao hàng
          </p>
          <div className="grid gap-3 text-xs md:grid-cols-2">
            <div className="space-y-1">
              <label className="font-medium">Ngày giao dự kiến</label>
              <input
                type="date"
                value={requestedDeliveryDate}
                onChange={(e) => setRequestedDeliveryDate(e.target.value)}
                disabled={!canEdit}
                className="h-8 w-full rounded-lg border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="space-y-1">
              <label className="font-medium">Người nhận</label>
              <input
                type="text"
                value={order.recipientName}
                disabled
                className="h-8 w-full rounded-lg border border-input bg-muted px-2 text-xs text-muted-foreground"
              />
            </div>
            <div className="space-y-1">
              <label className="font-medium">Số điện thoại</label>
              <input
                type="text"
                value={order.recipientPhone}
                disabled
                className="h-8 w-full rounded-lg border border-input bg-muted px-2 text-xs text-muted-foreground"
              />
            </div>
            <div className="space-y-1">
              <label className="font-medium">Địa chỉ</label>
              <input
                type="text"
                value={
                  typeof order.storeId === 'object' && order.storeId?.address
                    ? order.storeId.address
                    : ''
                }
                disabled
                className="h-8 w-full rounded-lg border border-input bg-muted px-2 text-xs text-muted-foreground"
              />
            </div>
          </div>

          <div className="space-y-1 pt-2 text-xs">
            <label className="font-medium">Ghi chú cửa hàng</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={!canEdit}
              className="w-full rounded-lg border border-input bg-background px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4 space-y-3 text-xs">
          <p className="text-xs font-semibold text-muted-foreground">
            Tóm tắt đơn
          </p>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Số mặt hàng</span>
              <span className="font-semibold">
                {order.items?.length ?? 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Tổng giá trị</span>
              <span className="font-semibold text-primary">
                {formatCurrency(order.totalAmount ?? 0)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Hình thức thanh toán</span>
              <span className="font-semibold">
                {order.paymentMethod ?? 'Wallet'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-4">
        <p className="mb-3 text-xs font-semibold text-muted-foreground">
          Sản phẩm trong đơn
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-left text-[11px] text-muted-foreground">
                <th className="pb-2 pr-2 font-medium">Sản phẩm</th>
                <th className="pb-2 pr-2 font-medium">SKU</th>
                <th className="pb-2 pr-2 font-medium text-right">SL đặt</th>
                <th className="pb-2 pr-2 font-medium text-right">Đơn giá</th>
                <th className="pb-2 pr-2 font-medium text-right">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {order.items?.map((item) => {
                const product =
                  typeof item.productId === 'string'
                    ? { name: item.productId, sku: '' }
                    : item.productId;
                return (
                  <tr key={product.name + item.quantity} className="border-b border-border/60">
                    <td className="py-2 pr-2 max-w-[220px] truncate">
                      {product.name}
                    </td>
                    <td className="py-2 pr-2">{product.sku}</td>
                    <td className="py-2 pr-2 text-right font-semibold">
                      {item.quantity}
                    </td>
                    <td className="py-2 pr-2 text-right">
                      {formatCurrency(item.unitPrice ?? 0)}
                    </td>
                    <td className="py-2 pr-2 text-right font-semibold">
                      {formatCurrency(item.subtotal ?? 0)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StoreOrderDetailPage;

