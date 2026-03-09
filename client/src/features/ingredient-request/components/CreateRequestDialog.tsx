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
import { ingredientApi, type Ingredient } from '@/api/IngredientApi';
import type { CreateIngredientRequestBody } from '@/shared/types/ingredientRequest';

const UNIT_OPTIONS: { value: string; label: string }[] = [
  { value: 'kg', label: 'kg' },
  { value: 'g', label: 'g' },
  { value: 'lit', label: 'lit' },
  { value: 'ml', label: 'ml' },
  { value: 'chai', label: 'chai' },
  { value: 'hộp', label: 'hộp' },
  { value: 'bó', label: 'bó' },
];

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
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loadingIngredients, setLoadingIngredients] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<CreateIngredientRequestBody>({
    ingredientId: '',
    quantityRequested: 0,
    unit: 'kg',
    note: '',
  });

  useEffect(() => {
    if (open) {
      setLoadingIngredients(true);
      ingredientApi
        .getAll()
        .then((res: any) => {
          const data = res?.data ?? res;
          const list = Array.isArray(data) ? data : data ? [data] : [];
          setIngredients(list);
          if (list.length && !form.ingredientId) {
            setForm((p) => ({ ...p, ingredientId: list[0]._id }));
          }
        })
        .catch(() => setIngredients([]))
        .finally(() => setLoadingIngredients(false));
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.ingredientId || form.quantityRequested <= 0) {
      return;
    }
    setSubmitting(true);
    try {
      await ingredientRequestApi.create({
        ingredientId: form.ingredientId,
        quantityRequested: form.quantityRequested,
        unit: form.unit || 'kg',
        note: form.note?.trim() || undefined,
      });
      onSuccess();
      onOpenChange(false);
      setForm({ ingredientId: '', quantityRequested: 0, unit: 'kg', note: '' });
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        'Tạo phiếu thất bại. Vui lòng thử lại.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tạo phiếu xin mua nguyên liệu</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nguyên liệu</Label>
            <Select
              value={form.ingredientId}
              onValueChange={(v) =>
                setForm((p) => ({ ...p, ingredientId: v }))
              }
              disabled={loadingIngredients}
            >
              <SelectTrigger>
                <SelectValue placeholder="Chọn nguyên liệu" />
              </SelectTrigger>
              <SelectContent>
                {ingredients.map((ing) => (
                  <SelectItem key={ing._id} value={ing._id}>
                    {ing.ingredientName} ({ing.unit})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Số lượng</Label>
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
            />
          </div>
          <div className="space-y-2">
            <Label>Đơn vị</Label>
            <Select
              value={form.unit || 'kg'}
              onValueChange={(v) => setForm((p) => ({ ...p, unit: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UNIT_OPTIONS.map((u) => (
                  <SelectItem key={u.value} value={u.value}>
                    {u.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Ghi chú (tùy chọn, tối đa 500 ký tự)</Label>
            <Input
              value={form.note ?? ''}
              onChange={(e) =>
                setForm((p) => ({ ...p, note: e.target.value.slice(0, 500) }))
              }
              placeholder="VD: Ưu tiên cho kế hoạch sản xuất thứ 7"
              maxLength={500}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Hủy
            </Button>
            <Button type="submit" isLoading={submitting} disabled={submitting}>
              Tạo phiếu
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
