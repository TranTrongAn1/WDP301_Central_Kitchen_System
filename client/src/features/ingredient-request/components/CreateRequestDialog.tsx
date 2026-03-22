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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/features/manager/components/ui/Select';
import { ingredientRequestApi } from '@/api/IngredientRequestApi';
import toast from 'react-hot-toast';
import { ingredientApi } from '@/api/IngredientApi';
import type { RequestType } from '@/shared/types/ingredientRequest';
import { useThemeStore } from '@/shared/zustand/themeStore';
import { Loader2 } from 'lucide-react';

const UNIT_OPTIONS = [
  { value: 'kg', label: 'kg' },
  { value: 'g', label: 'g' },
  { value: 'lit', label: 'lít' },
  { value: 'ml', label: 'ml' },
  { value: 'chai', label: 'chai' },
  { value: 'hộp', label: 'hộp' },
  { value: 'bó', label: 'bó' },
  { value: 'cái', label: 'cái' },
];

interface IngredientOption {
  _id: string;
  ingredientName: string;
  unit: string;
}

interface CreateRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateRequestDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateRequestDialogProps) {
  const { darkMode } = useThemeStore();
  const [ingredients, setIngredients] = useState<IngredientOption[]>([]);
  const [loadingIngredients, setLoadingIngredients] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    ingredientId: '',
    quantityRequested: 0,
    unit: 'kg',
    requestType: 'PLANNED' as RequestType,
    note: '',
    neededByDate: '',
  });

  useEffect(() => {
    if (open) {
      setLoadingIngredients(true);
      ingredientApi
        .getAll()
        .then((res: any) => {
          const data = res?.data ?? res;
          const list: IngredientOption[] = Array.isArray(data) ? data : data ? [data] : [];
          setIngredients(list);
          if (list.length > 0 && !form.ingredientId) {
            setForm((p) => ({ ...p, ingredientId: list[0]._id, unit: list[0].unit || 'kg' }));
          }
        })
        .catch(() => setIngredients([]))
        .finally(() => setLoadingIngredients(false));
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.ingredientId || form.quantityRequested <= 0) {
      toast.error('Vui lòng nhập đầy đủ thông tin!');
      return;
    }
    if (!form.neededByDate) {
      toast.error('Vui lòng chọn ngày cần hàng!');
      return;
    }
    setSubmitting(true);
    try {
      await ingredientRequestApi.create({
        ingredientId: form.ingredientId,
        quantityRequested: form.quantityRequested,
        unit: form.unit || 'kg',
        requestType: form.requestType,
        note: form.note?.trim() || undefined,
        neededByDate: form.neededByDate,
      });
      toast.success('Tạo phiếu thành công!');
      onSuccess();
      onOpenChange(false);
      setForm({ ingredientId: '', quantityRequested: 0, unit: 'kg', requestType: 'PLANNED', note: '', neededByDate: '' });
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Tạo phiếu thất bại. Vui lòng thử lại.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`sm:max-w-md ${darkMode ? 'bg-[#1c1c24] border-gray-700' : 'bg-white'}`}>
        <DialogHeader className={darkMode ? 'text-white' : ''}>
          <DialogTitle className={darkMode ? 'text-white' : ''}>Tạo phiếu xin mua nguyên liệu</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Request Type */}
          <div className="space-y-2">
            <Label className={darkMode ? 'text-gray-300' : ''}>Loại yêu cầu</Label>
            <Select
              value={form.requestType}
              onValueChange={(v) => setForm((p) => ({ ...p, requestType: v as RequestType }))}
            >
              <SelectTrigger className={darkMode ? 'bg-[#252530] border-gray-700 text-white' : ''}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={darkMode ? 'bg-[#1c1c24] border-gray-700' : ''}>
                <SelectItem value="PLANNED">Kế hoạch</SelectItem>
                <SelectItem value="URGENT">Mua gấp</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Ingredient */}
          <div className="space-y-2">
            <Label className={darkMode ? 'text-gray-300' : ''}>Nguyên liệu</Label>
            {loadingIngredients ? (
              <div className="flex items-center gap-2 py-3">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Đang tải...</span>
              </div>
            ) : (
              <Select
                value={form.ingredientId}
                onValueChange={(v) => {
                  const selected = ingredients.find(i => i._id === v);
                  setForm((p) => ({ ...p, ingredientId: v, unit: selected?.unit || p.unit }));
                }}
                disabled={loadingIngredients}
              >
                <SelectTrigger className={darkMode ? 'bg-[#252530] border-gray-700 text-white' : ''}>
                  <SelectValue placeholder="Chọn nguyên liệu" />
                </SelectTrigger>
                <SelectContent className={darkMode ? 'bg-[#1c1c24] border-gray-700' : ''}>
                  {ingredients.map((ing) => (
                    <SelectItem key={ing._id} value={ing._id}>
                      {ing.ingredientName} ({ing.unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Quantity & Unit */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className={darkMode ? 'text-gray-300' : ''}>Số lượng</Label>
              <Input
                type="number"
                min={0.01}
                step="any"
                value={form.quantityRequested || ''}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    quantityRequested: parseFloat(e.target.value) || 0,
                  }))
                }
                placeholder="VD: 25"
                required
                className={darkMode ? 'bg-[#252530] border-gray-700 text-white' : ''}
              />
            </div>
            <div className="space-y-2">
              <Label className={darkMode ? 'text-gray-300' : ''}>Đơn vị</Label>
              <Select
                value={form.unit}
                onValueChange={(v) => setForm((p) => ({ ...p, unit: v }))}
              >
                <SelectTrigger className={darkMode ? 'bg-[#252530] border-gray-700 text-white' : ''}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={darkMode ? 'bg-[#1c1c24] border-gray-700' : ''}>
                  {UNIT_OPTIONS.map((u) => (
                    <SelectItem key={u.value} value={u.value}>
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Needed By Date */}
          <div className="space-y-2">
            <Label className={darkMode ? 'text-gray-300' : ''}>Ngày cần hàng <span className="text-red-500">*</span></Label>
            <Input
              type="date"
              value={form.neededByDate}
              onChange={(e) => setForm((p) => ({ ...p, neededByDate: e.target.value }))}
              required
              className={darkMode ? 'bg-[#252530] border-gray-700 text-white' : ''}
            />
          </div>

          {/* Note */}
          <div className="space-y-2">
            <Label className={darkMode ? 'text-gray-300' : ''}>Ghi chú (tùy chọn)</Label>
            <textarea
              value={form.note ?? ''}
              onChange={(e) =>
                setForm((p) => ({ ...p, note: e.target.value.slice(0, 500) }))
              }
              placeholder="VD: Ưu tiên cho kế hoạch sản xuất thứ 7"
              maxLength={500}
              rows={3}
              className={`w-full p-3 rounded-xl border text-sm resize-none ${
                darkMode
                  ? 'bg-[#252530] border-gray-700 text-white placeholder-gray-500'
                  : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'
              } focus:ring-2 focus:ring-primary/25 outline-none`}
            />
            <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              {form.note.length}/500 ký tự
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className={darkMode ? 'border-gray-700 text-gray-300' : ''}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              isLoading={submitting}
              disabled={submitting}
              className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white"
            >
              Tạo phiếu
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
