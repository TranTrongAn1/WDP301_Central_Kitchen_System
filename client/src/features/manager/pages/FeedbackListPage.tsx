import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Star, Loader2, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/Table';
import { feedbackApi, type Feedback } from '@/api/FeedbackApi';
import { useAuthStore } from '@/shared/zustand/authStore';

export default function FeedbackListPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'Admin';

  const [list, setList] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchList = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await feedbackApi.getList();
      setList(data);
    } catch (e) {
      console.error(e);
      setError('Không thể tải danh sách phản hồi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  const getOrderId = (fb: Feedback) =>
    typeof fb.orderId === 'object' && fb.orderId !== null && typeof (fb.orderId as any)._id === 'string'
      ? (fb.orderId as any)._id
      : String(fb.orderId);

  const getOrderCode = (fb: Feedback) =>
    typeof fb.orderId === 'object' && fb.orderId !== null && (fb.orderId as any).orderCode
      ? (fb.orderId as any).orderCode
      : getOrderId(fb).slice(-8).toUpperCase();

  const getCreatorName = (fb: Feedback) =>
    typeof fb.createdBy === 'object' && fb.createdBy !== null
      ? (fb.createdBy as any).fullName || (fb.createdBy as any).email || '—'
      : '—';

  const ordersPath = isAdmin ? '/admin/dashboard' : '/coordinator/orders';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[320px] gap-2 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span>Đang tải phản hồi...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Button variant="outline" onClick={fetchList}>Thử lại</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <MessageSquare className="w-6 h-6" />
            Danh sách phản hồi
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tổng số: {list.length} phản hồi
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate(ordersPath)}>
          <ExternalLink className="w-4 h-4 mr-2" />
          Xem đơn hàng
        </Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Đơn hàng</TableHead>
                <TableHead>Người gửi</TableHead>
                <TableHead>Đánh giá</TableHead>
                <TableHead>Nội dung</TableHead>
                <TableHead>Ngày tạo</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    Chưa có phản hồi nào.
                  </TableCell>
                </TableRow>
              ) : (
                list.map((fb) => (
                  <TableRow key={fb._id}>
                    <TableCell className="font-mono text-sm">
                      {getOrderCode(fb)}
                    </TableCell>
                    <TableCell>{getCreatorName(fb)}</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                        {fb.rating}/5
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[280px] truncate" title={fb.content}>
                      {fb.content || '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {fb.createdAt ? new Date(fb.createdAt).toLocaleString('vi-VN') : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/coordinator/orders/${getOrderId(fb)}`)}
                      >
                        Xem đơn
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
