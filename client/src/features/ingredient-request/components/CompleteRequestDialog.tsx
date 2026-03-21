import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/features/manager/components/ui/Dialog';
// Thêm Loader2 vào đây
import {Loader2} from 'lucide-react';
import { Button } from '@/features/manager/components/ui/Button';
import { Input } from '@/features/manager/components/ui/Input';
import { Label } from '@/features/manager/components/ui/Label';
import { ingredientRequestApi } from '@/api/IngredientRequestApi';
import { supplierApi } from '@/api/SupplierApi';
import toast from 'react-hot-toast';
import type { IngredientRequest } from '@/shared/types/ingredientRequest';
import { ingredientApi } from '@/api/IngredientApi';

interface CompleteRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: IngredientRequest | null;
  onSuccess: () => void;
}

const formatMoney = (value: string) => {
  if (!value) return '';
  const number = value.replace(/\D/g, '');
  return number.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

const parseMoney = (formattedValue: string) => {
  return parseInt(formattedValue.replace(/\./g, ''), 10) || 0;
};

export function CompleteRequestDialog({
  open,
  onOpenChange,
  request,
  onSuccess,
}: CompleteRequestDialogProps) {
  const [supplierId, setSupplierId] = useState<string>('');
  const [supplierName, setSupplierName] = useState<string>('');
  const [receiptImage, setReceiptImage] = useState<string>('');
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [displayCost, setDisplayCost] = useState<string>('');
  const MAX_LIMIT = 500000000;
  const [expiryDate, setExpiryDate] = useState<string>('');
  const [receivedDate, setReceivedDate] = useState<string>(new Date().toISOString().split('T')[0]); // THÊM MỚI: Mặc định ngày hôm nay
  const [ingredientName, setIngredientName] = useState<string>('');

  useEffect(() => {
    if (open) {
      const fetchSuppliers = async () => {
        try {
          const res: any = await supplierApi.getAll();
          const supplierList = Array.isArray(res)
            ? res
            : (Array.isArray(res?.data) ? res.data : []);
          setSuppliers(supplierList);
        } catch (error) {
          console.error("Lỗi lấy danh sách NCC", error);
          setSuppliers([]);
        }
      };
      fetchSuppliers();
      // Reset ngày nhận về hôm nay mỗi khi mở dialog
      setReceivedDate(new Date().toISOString().split('T')[0]);
    }
  }, [open]);

  const handleCostChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const formatted = formatMoney(rawValue);
    if (parseMoney(formatted) > MAX_LIMIT) {
      toast.error('Số tiền vượt quá hạn mức cho phép (500tr). Vui lòng kiểm tra lại!');
      return;
    }
    setDisplayCost(formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request || !request._id) return;

    if (!expiryDate) {
      toast.error('Vui lòng chọn Hạn sử dụng!');
      return;
    }
    
    // Validate Ngày nhận
    if (!receivedDate) {
      toast.error('Vui lòng chọn Ngày nhận hàng!');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        actualCost: parseMoney(displayCost),
        supplierId: supplierId === 'external' ? null : (supplierId || null),
        externalSupplierName: supplierId === 'external' ? supplierName : null,
        receiptImage,
        expiryDate,
        receivedDate, // GỬI LÊN BE
        status: 'COMPLETED' as const
      };

      await ingredientRequestApi.complete(request._id, payload);
      toast.success('Đã chốt hàng và nhập kho thành công!');
      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Chốt hàng thất bại.');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    const fetchIngredientDetail = async () => {
      if (open && request && typeof request.ingredientId === 'string') {
        try {
          const res = await ingredientApi.getById(request.ingredientId);
          if (res.data) {
            const data = res.data as any;
            setIngredientName(data.ingredientName || 'N/A');
          }
        } catch (error) {
          console.error("Lỗi lấy chi tiết nguyên liệu:", error);
        }
      }
    };
    fetchIngredientDetail();
  }, [open, request]);

  const resetForm = () => {
    setSupplierId('');
    setSupplierName('');
    setReceiptImage('');
    setExpiryDate('');
    setDisplayCost('');
  };

  if (!request) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Chốt hàng & Nhập kho</DialogTitle>
        </DialogHeader>

        <div className="bg-muted/50 p-3 rounded-lg border border-border space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Nguyên liệu:</span>
            <span className="font-semibold text-foreground">
              {typeof request.ingredientId === 'object' && request.ingredientId !== null
                ? (request.ingredientId as any).name || (request.ingredientId as any).ingredientName
                : (ingredientName || "Đang tải...")}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Số lượng duyệt:</span>
            <span className="font-bold text-primary">
              {request.quantityRequested} {request.unit}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="supplier-select">Nhà cung cấp</Label>
            <select
              id="supplier-select"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
            >
              <option value="">-- Chọn nhà cung cấp --</option>
              {suppliers.map((s) => (
                <option key={s._id} value={s._id}>{s.name}</option>
              ))}
              <option value="external" className="text-green-600 font-bold">+ Mua lẻ bên ngoài</option>
            </select>
          </div>

          {supplierId === 'external' && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
              <Label>Tên nơi mua lẻ <span className="text-destructive">*</span></Label>
              <Input
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder="VD: Chợ, WinMart..."
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Tổng tiền thực tế (VNĐ)</Label>
            <div className="relative">
              <Input
                type="text"
                value={displayCost}
                onChange={handleCostChange}
                placeholder="0"
                className="pr-12"
                required
              />
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-muted-foreground text-xs font-bold">
                VNĐ
              </div>
            </div>
          </div>

{/* FIELD: NGÀY NHẬN HÀNG */}
<div className="space-y-2">
  <Label className="font-semibold text-blue-600">Ngày nhận hàng (Received Date) *</Label>
  <Input
    type="date"
    value={receivedDate}
    onChange={(e) => setReceivedDate(e.target.value)}
    required
    className="bg-background text-foreground border-input"
  />
</div>

{/* FIELD: HẠN SỬ DỤNG */}
<div className="space-y-2">
  <Label className="font-semibold text-destructive">Hạn sử dụng (Expiry Date) *</Label>
  <Input
    type="date"
    value={expiryDate}
    onChange={(e) => setExpiryDate(e.target.value)}
    required
    min={new Date().toISOString().split("T")[0]}
    className="bg-background text-foreground border-input"
  />
</div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Link ảnh hóa đơn / Chứng từ</Label>
            <Input
              type="url"
              value={receiptImage}
              onChange={(e) => setReceiptImage(e.target.value)}
              placeholder="https://imgur.com/..."
            />
            {receiptImage && receiptImage.startsWith('http') && (
              <div className="mt-2 w-20 h-20 rounded-md overflow-hidden border border-border shadow-sm">
                <img src={receiptImage} alt="Preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button
              type="submit"
              className="bg-green-600 hover:bg-green-700 text-white font-bold"
              disabled={submitting}
            >
              {submitting ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
              Xác nhận nhập kho
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}