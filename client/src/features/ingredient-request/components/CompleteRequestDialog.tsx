import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/features/manager/components/ui/Dialog';
import { Button } from '@/features/manager/components/ui/Button';
import { Input } from '@/features/manager/components/ui/Input';
import { Label } from '@/features/manager/components/ui/Label';
import { ingredientRequestApi } from '@/api/IngredientRequestApi';
import { supplierApi } from '@/api/SupplierApi'; // Đảm bảo bạn có API này
import toast from 'react-hot-toast';
import type { IngredientRequest } from '@/shared/types/ingredientRequest';

interface CompleteRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: IngredientRequest | null;
  onSuccess: () => void;
}
const formatMoney = (value: string) => {
  if (!value) return '';
  // Loại bỏ tất cả ký tự không phải số
  const number = value.replace(/\D/g, '');
  // Định dạng có dấu chấm phân cách
  return number.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

const parseMoney = (formattedValue: string) => {
  // Chuyển ngược từ "100.000" về 100000 để gửi lên BE
  return parseInt(formattedValue.replace(/\./g, ''), 10) || 0;
};
export function CompleteRequestDialog({
  open,
  onOpenChange,
  request,
  onSuccess,
}: CompleteRequestDialogProps) {
  const [actualCost, setActualCost] = useState<string>('');
  const [supplierId, setSupplierId] = useState<string>('');
  const [supplierName, setSupplierName] = useState<string>('');
  const [receiptImage, setReceiptImage] = useState<string>('');
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [displayCost, setDisplayCost] = useState<string>('');
  const MAX_LIMIT = 500000000;
  const [expiryDate, setExpiryDate] = useState<string>('');
  // Lấy danh sách NCC
  useEffect(() => {
    if (open) {
      const fetchSuppliers = async () => {
        try {
          const res: any = await supplierApi.getAll();
          // Kiểm tra nếu res là mảng thì dùng luôn, 
          // nếu không thì tìm trong res.data hoặc res.data.data (tùy cấu trúc API của bạn)
          const supplierList = Array.isArray(res)
            ? res
            : (Array.isArray(res?.data) ? res.data : []);

          setSuppliers(supplierList);
        } catch (error) {
          console.error("Lỗi lấy danh sách NCC", error);
          setSuppliers([]); // Reset về mảng rỗng nếu lỗi
        }
      };
      fetchSuppliers();
    }
  }, [open]);
const handleCostChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const formatted = formatMoney(rawValue);
    
    // Kiểm tra ngay khi nhập
    if (parseMoney(formatted) > MAX_LIMIT) {
      toast.error('Số tiền vượt quá hạn mức cho phép (500tr). Vui lòng kiểm tra lại!');
      return;
    }
    
    setDisplayCost(formatted);
  };
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!request || !request._id) return;

  // Validate Hạn sử dụng
  if (!expiryDate) {
    toast.error('Vui lòng chọn Hạn sử dụng cho nguyên liệu!');
    return;
  }

  setSubmitting(true);
  try {
    const payload = {
      actualCost: parseMoney(displayCost),
      supplierId: supplierId || null,
      receiptImage,
      expiryDate, // Gửi field mới lên BE
      status: 'COMPLETED'
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

  const resetForm = () => {
    setActualCost('');
    setSupplierId('');
    setSupplierName('');
    setReceiptImage('');
  };

  if (!request) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Chốt hàng & Nhập kho</DialogTitle>
        </DialogHeader>

        {/* Thông tin tóm tắt phiếu */}
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Nguyên liệu:</span>
            <span className="font-semibold text-slate-700">
              {typeof request.ingredientId === 'object' ? request.ingredientId?.name : 'N/A'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Số lượng duyệt:</span>
            <span className="font-bold text-blue-600">
              {request.quantityRequested} {request.unit}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Chọn Nhà Cung Cấp */}
          <div className="space-y-2">
  <Label htmlFor="supplier-select" className="text-gray-300">Nhà cung cấp (Hệ thống)</Label>
  <select
    id="supplier-select"
    className="flex h-12 w-full rounded-lg border border-gray-700 bg-[#1c1c1c] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none cursor-pointer"
    style={{ colorScheme: 'dark' }} // Giúp các option bên trong cũng ăn theo theme tối
    value={supplierId}
    onChange={(e) => setSupplierId(e.target.value)}
  >
    <option value="" className="bg-[#1c1c1c]">-- Chọn nhà cung cấp hoặc mua ngoài --</option>
    {suppliers.map((s) => (
      <option key={s._id} value={s._id} className="bg-[#1c1c1c]">
        {s.name}
      </option>
    ))}
    <option value="external" className="bg-[#1c1c1c] text-green-400">
      + Mua lẻ bên ngoài (Chợ / Siêu thị...)
    </option>
  </select>
</div>

          {/* Nhập tên mua lẻ - Chỉ hiện khi không chọn NCC hệ thống */}
          {!supplierId && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
              <Label>Tên nơi mua lẻ <span className="text-red-500">*</span></Label>
              <Input
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder="VD: Chợ Gò Vấp, WinMart..."
                required
              />
            </div>
          )}

          {/* Giá tiền thực tế */}
       <div className="space-y-2">
      <Label>Tổng tiền thực tế (VNĐ)</Label>
      <div className="relative">
        <Input
          type="text" // Chuyển sang text để hiển thị dấu chấm
          value={displayCost}
          onChange={handleCostChange}
          placeholder="VD: 100.000"
          className="pr-12" // Chừa chỗ cho đơn vị VNĐ bên phải nếu cần
          required
        />
        <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-500 text-xs">
          VNĐ
        </div>
      </div>
      {displayCost && (
        <p className="text-[10px] text-green-500">
          Ghi nhận: {parseMoney(displayCost).toLocaleString('vi-VN')} đồng
        </p>
      )}
    </div>

          {/* Link ảnh hóa đơn */}
          <div className="space-y-2">
            <Label>Link ảnh hóa đơn / Chứng từ</Label>
            <Input
              type="url"
              value={receiptImage}
              onChange={(e) => setReceiptImage(e.target.value)}
              placeholder="https://imgur.com/..."
            />
            <p className="text-[11px] text-muted-foreground italic">
              * Dán link ảnh chụp bill để đối soát tài chính sau này.
            </p>
          </div>
          <div className="space-y-2">
  <Label className="text-red-400">Hạn sử dụng (Expiry Date) *</Label>
  <Input
    type="date"
    value={expiryDate}
    onChange={(e) => setExpiryDate(e.target.value)}
    className="bg-[#1c1c1c] text-white border-gray-700"
    required
    // Ngăn chọn ngày trong quá khứ
    min={new Date().toISOString().split("T")[0]} 
  />
  <p className="text-[10px] text-muted-foreground italic">
    * Bắt buộc để đảm bảo an toàn thực phẩm.
  </p>
</div>
          <DialogFooter className="gap-2 sm:gap-0 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              className="bg-green-600 hover:bg-green-700"
              isLoading={submitting}
              disabled={submitting}
            >
              Hoàn tất nhập kho
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}