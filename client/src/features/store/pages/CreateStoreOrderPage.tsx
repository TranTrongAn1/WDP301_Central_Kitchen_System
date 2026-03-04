import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';

import { useAuthStore } from '@/shared/zustand/authStore';
import { productApi, type Product } from '@/api/ProductApi';
import { OrderApi, type CreateOrderPayload } from '@/api/OrderApi';

const orderItemSchema = z.object({
  productId: z.string().min(1, 'Vui lòng chọn sản phẩm'),
  quantityRequested: z
    .number()
    .int('Số lượng phải là số nguyên')
    .positive('Số lượng phải > 0'),
});

const createOrderSchema = z.object({
  requestedDeliveryDate: z.string().min(1, 'Vui lòng chọn ngày giao'),
  recipientName: z.string().min(1, 'Vui lòng nhập người nhận'),
  recipientPhone: z.string().min(1, 'Vui lòng nhập số điện thoại'),
  address: z.string().optional(),
  notes: z.string().optional(),
  paymentMethod: z.enum(['Wallet', 'Other']),
  items: z
    .array(orderItemSchema)
    .min(1, 'Đơn hàng phải có ít nhất 1 sản phẩm'),
});

type CreateOrderFormValues = z.infer<typeof createOrderSchema>;

const DEFAULT_PAYMENT_METHOD: CreateOrderFormValues['paymentMethod'] = 'Wallet';

const CreateStoreOrderPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<CreateOrderFormValues>({
    resolver: zodResolver(createOrderSchema),
    defaultValues: {
      requestedDeliveryDate: new Date().toISOString().slice(0, 10),
      recipientName: user?.fullName ?? '',
      recipientPhone: '',
      address: user?.storeName ?? '',
      notes: '',
      paymentMethod: DEFAULT_PAYMENT_METHOD,
      items: [{ productId: '', quantityRequested: 1 }],
    },
  });

  const items = watch('items');

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const res = await productApi.getAll();
        const data = (res as any)?.data ?? res ?? [];
        setProducts(Array.isArray(data) ? data : []);
      } catch {
        setProducts([]);
        toast.error('Không thể tải danh sách sản phẩm');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const productMap = useMemo(
    () =>
      products.reduce<Record<string, Product>>((acc, p) => {
        acc[p._id] = p;
        return acc;
      }, {}),
    [products]
  );

  const estimatedTotal = useMemo(() => {
    return items.reduce((sum, it) => {
      const product = productMap[it.productId];
      if (!product || !it.quantityRequested || it.quantityRequested <= 0) return sum;
      return sum + product.price * it.quantityRequested;
    }, 0);
  }, [items, productMap]);

  const addItemRow = () => {
    setValue('items', [...items, { productId: '', quantityRequested: 1 }], {
      shouldDirty: true,
      shouldValidate: false,
    });
  };

  const removeItemRow = (index: number) => {
    if (items.length === 1) return;
    setValue(
      'items',
      items.filter((_, i) => i !== index),
      { shouldDirty: true, shouldValidate: false }
    );
  };

  const onSubmit = async (values: CreateOrderFormValues) => {
    if (!user?.storeId) {
      toast.error('Không xác định được cửa hàng hiện tại');
      return;
    }

    const payload: CreateOrderPayload = {
      storeId: user.storeId,
      requestedDeliveryDate: new Date(values.requestedDeliveryDate).toISOString(),
      recipientName: values.recipientName.trim(),
      recipientPhone: values.recipientPhone.trim(),
      address: values.address?.trim() || '',
      notes: values.notes?.trim() || '',
      paymentMethod: values.paymentMethod,
      items: values.items.map((it) => ({
        productId: it.productId,
        quantityRequested: it.quantityRequested,
      })),
    };

    try {
      setSubmitting(true);
      const toastId = toast.loading('Đang tạo đơn hàng...');
      const res = await OrderApi.createOrder(payload);
      if (res?.success && res.data) {
        toast.success('Tạo đơn hàng thành công', { id: toastId });
        navigate('/store/orders');
      } else {
        toast.error(res?.message || 'Không thể tạo đơn hàng', { id: toastId });
      }
    } catch (error) {
      console.error(error);
      toast.error('Có lỗi xảy ra khi tạo đơn hàng');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="rounded-2xl border bg-card/60 p-4 md:p-5 shadow-sm space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1 border-b border-border/40 mb-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Store Order
            </p>
            <p className="mt-1 text-sm font-semibold">
              Tạo đơn hàng nội bộ
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5 max-w-md">
              Chọn sản phẩm từ catalog và gửi yêu cầu về trung tâm sản xuất.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="h-9 rounded-lg border border-border px-3 text-xs font-semibold hover:bg-secondary"
              onClick={() => navigate('/store/orders')}
            >
              Quay lại danh sách đơn
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="h-9 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {submitting ? 'Đang tạo...' : 'Tạo đơn hàng'}
            </button>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5 text-xs">
            <label className="font-medium">Ngày giao dự kiến</label>
            <input
              type="date"
              className="h-9 w-full rounded-lg border border-input bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
              {...register('requestedDeliveryDate')}
            />
            {errors.requestedDeliveryDate && (
              <p className="text-[11px] text-red-500">
                {errors.requestedDeliveryDate.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5 text-xs">
            <label className="font-medium">Người nhận tại cửa hàng</label>
            <input
              type="text"
              className="h-9 w-full rounded-lg border border-input bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Tên người nhận"
              {...register('recipientName')}
            />
            {errors.recipientName && (
              <p className="text-[11px] text-red-500">
                {errors.recipientName.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5 text-xs">
            <label className="font-medium">Số điện thoại liên hệ</label>
            <input
              type="tel"
              className="h-9 w-full rounded-lg border border-input bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="VD: 0909 xxx xxx"
              {...register('recipientPhone')}
            />
            {errors.recipientPhone && (
              <p className="text-[11px] text-red-500">
                {errors.recipientPhone.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5 text-xs">
            <label className="font-medium">Địa chỉ nhận (tuỳ chọn)</label>
            <input
              type="text"
              className="h-9 w-full rounded-lg border border-input bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Mặc định dùng địa chỉ cửa hàng"
              {...register('address')}
            />
          </div>
        </div>

        <div className="space-y-1.5 text-xs">
          <label className="font-medium">Ghi chú thêm (tuỳ chọn)</label>
          <textarea
            rows={3}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            placeholder="Ví dụ: Ưu tiên giao buổi sáng, cần gấp cho chương trình khuyến mãi..."
            {...register('notes')}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold">Sản phẩm đặt hàng</span>
            <button
              type="button"
              onClick={addItemRow}
              className="inline-flex items-center rounded-lg border border-border px-2 py-1 text-[11px] font-semibold hover:bg-secondary"
            >
              <span className="material-symbols-outlined text-[16px] mr-1">
                add
              </span>
              Thêm dòng
            </button>
          </div>

          <div className="space-y-2">
            {items.map((item, index) => (
              <div
                key={index}
                className="flex flex-col gap-2 rounded-lg border border-border/60 bg-background/60 p-3 text-xs md:flex-row md:items-center"
              >
                <div className="flex-1 space-y-1.5">
                  <label className="font-medium">Sản phẩm</label>
                  <Controller
                    control={control}
                    name={`items.${index}.productId`}
                    render={({ field }) => (
                      <select
                        {...field}
                        disabled={loading}
                        className="h-9 w-full rounded-lg border border-input bg-background/80 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 shadow-sm"
                      >
                        <option value="">Chọn sản phẩm</option>
                        {products.map((p) => (
                          <option key={p._id} value={p._id}>
                            {p.name} ({p.sku})
                          </option>
                        ))}
                      </select>
                    )}
                  />
                  {errors.items?.[index]?.productId && (
                    <p className="text-[11px] text-red-500">
                      {errors.items[index]?.productId?.message}
                    </p>
                  )}
                </div>

                <div className="w-full space-y-1.5 md:w-32">
                  <label className="font-medium">Số lượng</label>
                  <Controller
                    control={control}
                    name={`items.${index}.quantityRequested`}
                    render={({ field }) => (
                      <input
                        type="number"
                        min={1}
                        className="h-9 w-full rounded-lg border border-input bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                        value={field.value ?? 1}
                        onChange={(e) =>
                          field.onChange(
                            Number(e.target.value) > 0
                              ? Number(e.target.value)
                              : 1
                          )
                        }
                      />
                    )}
                  />
                  {errors.items?.[index]?.quantityRequested && (
                    <p className="text-[11px] text-red-500">
                      {errors.items[index]?.quantityRequested?.message}
                    </p>
                  )}
                </div>

                <div className="w-full space-y-1.5 md:w-40">
                  <span className="text-[11px] text-muted-foreground">
                    Ước tính
                  </span>
                  <div className="text-xs font-semibold">
                    {(() => {
                      const product = productMap[item.productId];
                      if (!product || !item.quantityRequested) return '—';
                      return formatCurrency(
                        product.price * (item.quantityRequested || 0)
                      );
                    })()}
                  </div>
                </div>

                <div className="flex items-center justify-end md:w-20">
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItemRow(index)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        delete
                      </span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {errors.items && typeof errors.items.message === 'string' && (
            <p className="text-[11px] text-red-500">{errors.items.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-border/60 pt-3 text-xs sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <span className="font-semibold">Hình thức thanh toán</span>
            <div className="inline-flex rounded-full bg-muted/60 p-1 gap-1">
              <label className="relative inline-flex items-center">
                <input
                  type="radio"
                  value="Wallet"
                  className="sr-only"
                  {...register('paymentMethod')}
                  defaultChecked
                />
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold cursor-pointer bg-background/60 border border-border data-[checked=true]:bg-primary data-[checked=true]:text-primary-foreground"
                  data-checked={watch('paymentMethod') === 'Wallet' ? 'true' : 'false'}
                >
                  <span className="material-symbols-outlined text-[14px]">
                    account_balance_wallet
                  </span>
                  Trừ ví cửa hàng
                </span>
              </label>
              <label className="relative inline-flex items-center">
                <input
                  type="radio"
                  value="Other"
                  className="sr-only"
                  {...register('paymentMethod')}
                />
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold cursor-pointer bg-background/60 border border-border data-[checked=true]:bg-primary data-[checked=true]:text-primary-foreground"
                  data-checked={watch('paymentMethod') === 'Other' ? 'true' : 'false'}
                >
                  <span className="material-symbols-outlined text-[14px]">
                    payments
                  </span>
                  Khác (ghi nhận sau)
                </span>
              </label>
            </div>
            {errors.paymentMethod && (
              <p className="text-[11px] text-red-500">
                {errors.paymentMethod.message}
              </p>
            )}
          </div>

          <div className="space-y-1 text-right">
            <p className="text-[11px] text-muted-foreground">Tổng ước tính</p>
            <p className="text-base font-bold text-primary">
              {formatCurrency(estimatedTotal)}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            className="h-9 rounded-lg border border-border px-3 text-xs font-semibold hover:bg-secondary"
            onClick={() => navigate('/store/orders')}
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="h-9 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {submitting ? 'Đang tạo...' : 'Tạo đơn hàng'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateStoreOrderPage;

