import { useState, useEffect, useCallback } from 'react';
import { Plus, Loader2, Calendar, ClipboardList, Clock, CheckCircle2 } from 'lucide-react';
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
  if (!ing) return '—';
  if (typeof ing === 'string') return ing;
  const obj = ing as { name?: string; ingredientName?: string; code?: string };
  return obj?.ingredientName ?? obj?.name ?? obj?.code ?? '—';
}

// function formatDate(iso: string): string {
//   try {
//     return new Date(iso).toLocaleString('vi-VN', {
//       day: '2-digit',
//       month: '2-digit',
//       year: 'numeric',
//       hour: '2-digit',
//       minute: '2-digit',
//     });
//   } catch {
//     return iso;
//   }
// }

function StatusBadge({ status }: { status: IngredientRequestStatus }) {
  const map: Record<IngredientRequestStatus, { variant: 'default' | 'secondary' | 'destructive' | 'warning' | 'success'; label: string }> = {
    PENDING: { variant: 'warning', label: 'Chờ duyệt' },
    APPROVED: { variant: 'secondary', label: 'Đã duyệt' },
    REJECTED: { variant: 'destructive', label: 'Từ chối' },
    COMPLETED: { variant: 'success', label: 'Hoàn tất' },
  };
  const c = map[status] ?? { variant: 'secondary', label: status };
  return <Badge variant={c.variant} className="font-semibold text-[10px] uppercase tracking-wider whitespace-nowrap px-2 py-0">{c.label}</Badge>;
}

function RequestTypeBadge({ type }: { type: 'URGENT' | 'PLANNED' }) {
  const isUrgent = type === 'URGENT';
  return (
    <div className={`text-[10px] font-bold px-2 py-0.5 rounded border w-fit uppercase tracking-tighter ${
      isUrgent 
        ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-950/30 dark:border-red-800' 
        : 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800'
    }`}>
      {isUrgent ? 'Mua Gấp' : 'Kế Hoạch'}
    </div>
  );
}

export default function IngredientRequestListPage() {
  const { hasRole } = useAuthStore();
  const [list, setList] = useState<IngredientRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | IngredientRequestStatus>('ALL');
  const [completeRequest, setCompleteRequest] = useState<IngredientRequest | null>(null);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const canApproveReject = hasRole(['Coordinator', 'Admin', 'Manager']);
  const canCreate = hasRole(['KitchenStaff', 'Admin']);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await ingredientRequestApi.getList(
        statusFilter === 'ALL' ? undefined : { status: statusFilter }
      );
      setList(res?.data ?? []);
    } catch (err: any) {
      toast.error('Tải danh sách thất bại.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchList(); }, [fetchList]);

  const handleApprove = async (id: string, type: string) => {
    setActionId(id);
    try {
      // Nếu là URGENT, có thể API backend cần set thẳng status là COMPLETED
      // Hoặc tùy logic backend, ở đây tôi tạm thời update status theo luồng của ông
      await ingredientRequestApi.updateStatus(id, { 
        status: type === 'URGENT' ? 'COMPLETED' : 'APPROVED' 
      });
      toast.success(type === 'URGENT' ? 'Đã duyệt & hoàn tất mua gấp' : 'Đã duyệt phiếu kế hoạch');
      fetchList();
    } catch (err: any) {
      toast.error('Thao tác thất bại.');
    } finally { setActionId(null); }
  };

  const handleReject = async (id: string) => {
    setActionId(id);
    try {
      await ingredientRequestApi.updateStatus(id, { status: 'REJECTED' });
      toast.success('Đã từ chối phiếu.');
      fetchList();
    } catch (err: any) {
      toast.error('Từ chối thất bại.');
    } finally { setActionId(null); }
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto bg-[#fafafa] dark:bg-transparent min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold tracking-tight">Yêu cầu nguyên liệu</h1>
          </div>
          <p className="text-muted-foreground text-xs font-medium">Theo dõi và xử lý phê duyệt mua sắm</p>
        </div>
        {canCreate && (
          <Button size="sm" className="h-9 px-4 font-bold shadow-sm">
            <Plus className="h-4 w-4 mr-2" /> Tạo phiếu
          </Button>
        )}
      </div>

      <Card className="shadow-none border-border/60">
        <CardContent className="p-0 sm:p-5">
          <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
            <TabsList className="mb-6 bg-muted/40 p-1 border">
              {STATUS_OPTIONS.map((opt) => (
                <TabsTrigger key={opt.value} value={opt.value} className="px-4 py-1.5 text-xs font-bold uppercase tracking-tight">
                  {opt.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value={statusFilter}>
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary/40" />
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Đang tải...</p>
                </div>
              ) : (
                <div className="rounded-md border border-border/50 overflow-hidden bg-card">
                  <Table className="min-w-[1100px] table-fixed w-full">
                    <TableHeader className="bg-muted/30">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-[180px] font-bold text-[10px] uppercase text-muted-foreground px-4">Nguyên liệu</TableHead>
                        <TableHead className="w-[80px] font-bold text-[10px] uppercase text-muted-foreground text-center">SL</TableHead>
                        <TableHead className="w-[120px] font-bold text-[10px] uppercase text-muted-foreground">Trạng thái</TableHead>
                        <TableHead className="w-[250px] font-bold text-[10px] uppercase text-muted-foreground text-center">Ghi chú</TableHead>
                        <TableHead className="w-[180px] font-bold text-[10px] uppercase text-muted-foreground text-center">Thời gian</TableHead>
                        <TableHead className="w-[130px] font-bold text-[10px] uppercase text-muted-foreground text-right px-4">Thao tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {list.map((req: any) => (
                        <TableRow key={req._id} className="hover:bg-muted/10 transition-colors border-b last:border-0">
                          <TableCell className="px-4 py-3">
                            <div className="space-y-1.5">
                              <p className="font-bold text-[13px] text-foreground uppercase tracking-tight truncate">
                                {getIngredientDisplay(req)}
                              </p>
                              <RequestTypeBadge type={req.requestType} />
                            </div>
                          </TableCell>

                          <TableCell className="text-center">
                            <div className="inline-flex flex-col items-center">
                              <span className="text-sm font-black text-primary leading-none">{req.quantityRequested}</span>
                              <span className="text-[9px] font-bold text-muted-foreground uppercase mt-1 opacity-60">{req.unit}</span>
                            </div>
                          </TableCell>

                          <TableCell><StatusBadge status={req.status} /></TableCell>

                          <TableCell>
                            <div className="text-[12px] text-muted-foreground/80 leading-snug break-words italic px-4 text-center">
                              {req.note ? `"${req.note}"` : <span className="opacity-20">—</span>}
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="flex flex-col gap-1.5 items-center">
                              <div className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-100 flex items-center gap-1">
                                <Clock className="h-3 w-3" /> CẦN: {req.neededByDate ? new Date(req.neededByDate).toLocaleDateString('vi-VN') : '--'}
                              </div>
                              <div className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 flex items-center gap-1">
                                <Calendar className="h-3 w-3" /> GIAO: {req.expectedDeliveryDate ? new Date(req.expectedDeliveryDate).toLocaleDateString('vi-VN') : 'TBA'}
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="px-4 py-3 text-right">
                            <div className="flex justify-end items-center gap-1.5">
                              {/* 1. ĐƠN CHỜ DUYỆT */}
                              {req.status === 'PENDING' && canApproveReject && (
                                <>
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="h-7 px-3 text-[11px] font-bold border-green-500/50 text-green-600 hover:bg-green-50"
                                    onClick={() => handleApprove(req._id, req.requestType)}
                                    disabled={actionId === req._id}
                                  >
                                    Duyệt
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="h-7 px-2 text-[11px] font-bold text-destructive hover:bg-red-50"
                                    onClick={() => handleReject(req._id)}
                                    disabled={actionId === req._id}
                                  >
                                    Hủy
                                  </Button>
                                </>
                              )}

                              {/* 2. ĐƠN PLANNED ĐÃ DUYỆT (Mới cần nút Chốt) */}
                              {req.status === 'APPROVED' && req.requestType === 'PLANNED' && (
                                <Button 
                                  size="sm" 
                                  className="h-7 px-3 text-[11px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                                  onClick={() => { setCompleteRequest(req); setCompleteOpen(true); }}
                                >
                                  Chốt hàng
                                </Button>
                              )}

                              {/* 3. KHI ĐÃ XONG (Hoặc URGENT vừa duyệt xong) */}
                              {req.status === 'COMPLETED' && (
                                <div className="flex items-center gap-1 text-green-600 font-bold text-[11px] bg-green-50 px-2 py-1 rounded border border-green-100 uppercase tracking-tighter">
                                  <CheckCircle2 className="h-3 w-3" /> Hoàn tất
                                </div>
                              )}
                              
                              {req.status === 'REJECTED' && (
                                <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-40">Đã hủy</span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <CompleteRequestDialog 
        open={completeOpen} 
        onOpenChange={setCompleteOpen} 
        request={completeRequest} 
        onSuccess={fetchList} 
      />
    </div>
  );
}