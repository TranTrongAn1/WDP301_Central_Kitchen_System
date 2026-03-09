import { useState, useEffect, useCallback } from 'react';
import { Plus, Check, X, Package, Loader2 } from 'lucide-react';
import { Button } from '@/features/manager/components/ui/Button';
import { Card, CardContent } from '@/features/manager/components/ui/Card';
import { Badge } from '@/features/manager/components/ui/Badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/features/manager/components/ui/Tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/features/manager/components/ui/Table';
import { ingredientRequestApi } from '@/api/IngredientRequestApi';
import { useAuthStore } from '@/shared/zustand/authStore';
import toast from 'react-hot-toast';
import type {
  IngredientRequest,
  IngredientRequestStatus,
} from '@/shared/types/ingredientRequest';
import { CreateRequestDialog } from '../components/CreateRequestDialog';
import { CompleteRequestDialog } from '../components/CompleteRequestDialog';

const STATUS_OPTIONS: { value: 'ALL' | IngredientRequestStatus; label: string }[] = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'PENDING', label: 'Chờ duyệt' },
  { value: 'APPROVED', label: 'Đã duyệt' },
  { value: 'REJECTED', label: 'Đã từ chối' },
  { value: 'COMPLETED', label: 'Hoàn tất' },
];

function getIngredientDisplay(req: IngredientRequest): string {
  const ing = req.ingredientId;
  if (typeof ing === 'string') return ing;
  const obj = ing as { name?: string; ingredientName?: string; code?: string };
  return obj?.name ?? obj?.ingredientName ?? obj?.code ?? '—';
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function StatusBadge({ status }: { status: IngredientRequestStatus }) {
  const map: Record<IngredientRequestStatus, { variant: 'default' | 'secondary' | 'destructive' | 'warning' | 'success'; label: string }> = {
    PENDING: { variant: 'warning', label: 'Chờ duyệt' },
    APPROVED: { variant: 'secondary', label: 'Đã duyệt' },
    REJECTED: { variant: 'destructive', label: 'Từ chối' },
    COMPLETED: { variant: 'success', label: 'Hoàn tất' },
  };
  const c = map[status] ?? { variant: 'secondary', label: status };
  return <Badge variant={c.variant}>{c.label}</Badge>;
}

export default function IngredientRequestListPage() {
  const { hasRole } = useAuthStore();
  const [list, setList] = useState<IngredientRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | IngredientRequestStatus>('ALL');
  const [createOpen, setCreateOpen] = useState(false);
  const [completeRequest, setCompleteRequest] = useState<IngredientRequest | null>(null);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const canCreate = hasRole(['KitchenStaff', 'Admin']);
  const canApproveReject = hasRole(['Coordinator', 'Admin']);
  const canComplete = hasRole(['KitchenStaff', 'Coordinator', 'Admin']);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await ingredientRequestApi.getList(
        statusFilter === 'ALL' ? undefined : { status: statusFilter }
      );
      const data = res?.data ?? [];
      setList(Array.isArray(data) ? data : []);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Tải danh sách thất bại.';
      toast.error(msg);
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const handleApprove = async (id: string) => {
    setActionId(id);
    try {
      await ingredientRequestApi.updateStatus(id, { status: 'APPROVED' });
      toast.success('Đã duyệt phiếu.');
      fetchList();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Duyệt phiếu thất bại.');
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (id: string) => {
    setActionId(id);
    try {
      await ingredientRequestApi.updateStatus(id, { status: 'REJECTED' });
      toast.success('Đã từ chối phiếu.');
      fetchList();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Từ chối phiếu thất bại.');
    } finally {
      setActionId(null);
    }
  };

  const openComplete = (req: IngredientRequest) => {
    setCompleteRequest(req);
    setCompleteOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Phiếu xin mua nguyên liệu</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Tạo, duyệt và chốt hàng phiếu xin mua nguyên liệu
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Tạo phiếu
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="pt-6">
          <Tabs
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as 'ALL' | IngredientRequestStatus)}
          >
            <TabsList className="mb-4">
              {STATUS_OPTIONS.map((opt) => (
                <TabsTrigger key={opt.value} value={opt.value}>
                  {opt.label}
                </TabsTrigger>
              ))}
            </TabsList>
            <TabsContent value={statusFilter} className="mt-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : list.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Chưa có phiếu nào.</p>
                  {canCreate && (
                    <Button
                      variant="outline"
                      className="mt-3"
                      onClick={() => setCreateOpen(true)}
                    >
                      Tạo phiếu đầu tiên
                    </Button>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nguyên liệu</TableHead>
                      <TableHead>Số lượng</TableHead>
                      <TableHead>Đơn vị</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead>Ghi chú</TableHead>
                      <TableHead>Ngày tạo</TableHead>
                      {(canApproveReject || canComplete) && (
                        <TableHead className="text-right">Thao tác</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {list.map((req) => (
                      <TableRow key={req._id}>
                        <TableCell className="font-medium">
                          {getIngredientDisplay(req)}
                        </TableCell>
                        <TableCell>{req.quantityRequested}</TableCell>
                        <TableCell>{req.unit}</TableCell>
                        <TableCell>
                          <StatusBadge status={req.status} />
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {req.note || '—'}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDate(req.createdAt)}
                        </TableCell>
                        {(canApproveReject || canComplete) && (
                          <TableCell className="text-right">
                            {req.status === 'PENDING' && canApproveReject && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="mr-2"
                                  onClick={() => handleApprove(req._id)}
                                  disabled={actionId === req._id}
                                  isLoading={actionId === req._id}
                                >
                                  <Check className="h-4 w-4 mr-1" />
                                  Duyệt
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleReject(req._id)}
                                  disabled={actionId === req._id}
                                >
                                  <X className="h-4 w-4 mr-1" />
                                  Từ chối
                                </Button>
                              </>
                            )}
                            {req.status === 'APPROVED' && canComplete && (
                              <Button
                                size="sm"
                                onClick={() => openComplete(req)}
                              >
                                Chốt hàng
                              </Button>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <CreateRequestDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={fetchList}
      />
      <CompleteRequestDialog
        open={completeOpen}
        onOpenChange={setCompleteOpen}
        request={completeRequest}
        onSuccess={fetchList}
      />
    </div>
  );
}
