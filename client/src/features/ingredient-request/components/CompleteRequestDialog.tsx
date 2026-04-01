import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/features/manager/components/ui/Dialog';
import { Loader2 } from 'lucide-react';
import { Button } from '@/features/manager/components/ui/Button';
import { Input } from '@/features/manager/components/ui/Input';
import { Label } from '@/features/manager/components/ui/Label';
import { ingredientRequestApi } from '@/api/IngredientRequestApi';
import { supplierApi } from '@/api/SupplierApi';
import toast from 'react-hot-toast';
import type { IngredientRequest } from '@/shared/types/ingredientRequest';
import { ingredientApi } from '@/api/IngredientApi';
import { uploadProductImage } from '@/shared/lib/firebase';
import { useThemeStore } from '@/shared/zustand/themeStore';

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
  const { darkMode } = useThemeStore();
  const [supplierId, setSupplierId] = useState<string>('');
  const [supplierName, setSupplierName] = useState<string>('');
  const [receiptImage, setReceiptImage] = useState<string>('');
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [displayCost, setDisplayCost] = useState<string>('');
  const MAX_LIMIT = 500000000;
  const [expiryDate, setExpiryDate] = useState<string>('');
  const [receivedDate, setReceivedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [ingredientName, setIngredientName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn file hình ảnh!');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File quá lớn. Vui lòng chọn file nhỏ hơn 5MB.');
      return;
    }

    setUploadingImage(true);
    try {
      const url = await uploadProductImage(file, 'receipts');
      setReceiptImage(url);
      toast.success('Tải ảnh lên thành công!');
    } catch (error: any) {
      toast.error(error.message || 'Tải ảnh thất bại!');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = () => {
    setReceiptImage('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request || !request._id) return;

    if (!expiryDate) {
      toast.error('Vui lòng chọn Hạn sử dụng!');
      return;
    }

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
        receivedDate,
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
      <DialogContent className={`sm:max-w-md max-h-[95vh] overflow-y-auto ${darkMode ? 'bg-[#1c1c24] border-gray-700' : 'bg-white'}`}>
        <DialogHeader>
          <DialogTitle className={darkMode ? 'text-white' : ''}>Chốt hàng & Nhập kho</DialogTitle>
        </DialogHeader>

        <div className={`p-3 rounded-lg border space-y-1 text-sm ${darkMode ? 'bg-[#252530] border-gray-700' : 'bg-amber-50 border-amber-200'}`}>
          <div className="flex justify-between">
            <span className={`${darkMode ? 'text-gray-400' : 'text-amber-700'}`}>Nguyên liệu:</span>
            <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {typeof request.ingredientId === 'object' && request.ingredientId !== null
                ? (request.ingredientId as any).name || (request.ingredientId as any).ingredientName
                : (ingredientName || "Đang tải...")}
            </span>
          </div>
          <div className="flex justify-between">
            <span className={`${darkMode ? 'text-gray-400' : 'text-amber-700'}`}>Số lượng duyệt:</span>
            <span className={`font-bold ${darkMode ? 'text-amber-400' : 'text-amber-600'}`}>
              {request.quantityRequested} {request.unit}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Supplier */}
          <div className="space-y-2">
            <Label className={darkMode ? 'text-gray-300' : ''}>Nhà cung cấp</Label>
            <select
              className={`flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/20 cursor-pointer ${
                darkMode ? 'bg-[#252530] border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
              }`}
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
            >
              <option value="">-- Chọn nhà cung cấp --</option>
              {suppliers.map((s) => (
                <option key={s._id} value={s._id}>{s.name}</option>
              ))}
            </select>
          </div>

          {supplierId === 'external' && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
              <Label className={darkMode ? 'text-gray-300' : ''}>Tên nơi mua lẻ <span className="text-red-500">*</span></Label>
              <Input
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder="VD: Chợ, WinMart..."
                required
                className={darkMode ? 'bg-[#252530] border-gray-700 text-white' : ''}
              />
            </div>
          )}

          {/* Cost */}
          <div className="space-y-2">
            <Label className={darkMode ? 'text-gray-300' : ''}>Tổng tiền thực tế (VNĐ)</Label>
            <div className="relative">
              <Input
                type="text"
                value={displayCost}
                onChange={handleCostChange}
                placeholder="0"
                className={`pr-12 ${darkMode ? 'bg-[#252530] border-gray-700 text-white' : ''}`}
                required
              />
              <div className={`absolute inset-y-0 right-3 flex items-center pointer-events-none text-xs font-bold ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                VNĐ
              </div>
            </div>
          </div>

          {/* Received Date */}
          <div className="space-y-2">
            <Label className={`font-semibold ${darkMode ? 'text-gray-300' : 'text-orange-700'}`}>
              Ngày nhận hàng <span className="text-red-500">*</span>
            </Label>
            <Input
              type="date"
              value={receivedDate}
              onChange={(e) => setReceivedDate(e.target.value)}
              required
              min={new Date().toISOString().split("T")[0]}
              className={darkMode ? 'bg-[#252530] border-gray-700 text-white' : ''}
            />
          </div>

          {/* Expiry Date */}
          <div className="space-y-2">
            <Label className={`font-semibold ${darkMode ? 'text-gray-300' : 'text-red-600'}`}>
              Hạn sử dụng <span className="text-red-500">*</span>
            </Label>
            <Input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              required
              min={new Date().toISOString().split("T")[0]}
              className={darkMode ? 'bg-[#252530] border-gray-700 text-white' : ''}
            />
          </div>

          {/* Receipt Image Upload */}
          <div className="space-y-2">
            <Label className={darkMode ? 'text-gray-300' : ''}>Ảnh hóa đơn / Chứng từ</Label>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              id="receipt-upload"
            />
            
            {receiptImage ? (
              <div className="relative">
                <div className={`w-full h-40 rounded-xl overflow-hidden border-2 ${darkMode ? 'border-gray-700' : 'border-amber-200'} overflow-hidden`}>
                  <img 
                    src={receiptImage} 
                    alt="Receipt preview" 
                    className="w-full h-full object-cover" 
                  />
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      darkMode
                        ? 'border-gray-700 text-gray-300 hover:bg-gray-800'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Đổi ảnh
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="px-3 py-2 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors"
                  >
                    Xóa
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`w-full h-32 rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${
                  darkMode
                    ? 'border-gray-700 bg-[#252530] hover:bg-gray-800 text-gray-400'
                    : 'border-amber-200 bg-amber-100 hover:bg-amber-200 text-amber-600'
                }`}
              >
                {uploadingImage ? (
                  <Loader2 className="w-8 h-8 animate-spin mb-2" />
                ) : (
                  <>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${darkMode ? 'bg-gray-800' : 'bg-amber-100'}`}>
                      <span className="material-symbols-outlined text-2xl">upload</span>
                    </div>
                    <p className="text-sm font-medium">
                      {uploadingImage ? 'Đang tải...' : 'Tải ảnh lên'}
                    </p>
                    <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-amber-500'}`}>
                      PNG, JPG, WEBP (tối đa 5MB)
                    </p>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Or paste URL */}
          <div className="space-y-2">
            <Label className={darkMode ? 'text-gray-300' : ''}>Hoặc dán link ảnh</Label>
            <Input
              type="url"
              value={receiptImage}
              onChange={(e) => setReceiptImage(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className={darkMode ? 'bg-[#252530] border-gray-700 text-white' : ''}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t dark:border-gray-700">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={() => onOpenChange(false)}
              className={darkMode ? 'text-gray-300' : ''}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              className="bg-green-600 hover:bg-green-700 text-white font-bold"
              disabled={submitting || uploadingImage}
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
