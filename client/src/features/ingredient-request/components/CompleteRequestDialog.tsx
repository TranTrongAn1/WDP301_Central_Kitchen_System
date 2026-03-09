import { useState } from 'react';
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
import toast from 'react-hot-toast';
import type { IngredientRequest } from '@/shared/types/ingredientRequest';

interface CompleteRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: IngredientRequest | null;
  onSuccess: () => void;
}

function getIngredientDisplay(req: IngredientRequest): string {
  const ing = req.ingredientId;
  if (typeof ing === 'string') return ing;
  const obj = ing as { name?: string; code?: string };
  return obj?.name ?? obj?.code ?? '—';
}

export function CompleteRequestDialog({
  open,
  onOpenChange,
  request,
  onSuccess,
}: CompleteRequestDialogProps) {
  const [actualCost, setActualCost] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request) return;
    const cost = parseInt(actualCost, 10);
    if (Number.isNaN(cost) || cost < 0) {
      toast.error('Vui lòng nhập số tiền hợp lệ (VNĐ).');
      return;
    }
    setSubmitting(true);
    try {
      await ingredientRequestApi.complete(request._id, { actualCost: cost });
      toast.success('Đã chốt hàng và nhập kho thành công!');
      onSuccess();
      onOpenChange(false);
      setActualCost('');
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        'Chốt hàng thất bại. Vui lòng thử lại.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!request) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Chốt hàng & nhập kho</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Phiếu: <strong>{getIngredientDisplay(request)}</strong> —{' '}
          {request.quantityRequested} {request.unit}
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Tiền thực tế (VNĐ)</Label>
            <Input
              type="number"
              min={0}
              step={1000}
              value={actualCost}
              onChange={(e) => setActualCost(e.target.value)}
              placeholder="VD: 1250000"
              required
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
              Chốt hàng
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
