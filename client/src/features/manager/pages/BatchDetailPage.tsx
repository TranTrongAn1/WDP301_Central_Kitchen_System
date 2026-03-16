import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Loader2, Package, AlertTriangle, CheckCircle2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ErrorState } from '../components/ui/ErrorState';
import { batchApi } from '@/api/BatchApi';
import type { Batch } from '@/api/BatchApi';
import { useAuthStore } from '@/shared/zustand/authStore';

const BatchDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [batch, setBatch] = useState<Batch | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchBatch = async () => {
        if (!id) return;
        try {
            setLoading(true);
            setError(null);
            const response = await batchApi.getById(id);
            const data = (response as any)?.data || response;
            setBatch(data);
        } catch (err) {
            console.error('Error fetching batch:', err);
            setError('Không thể tải chi tiết lô sản xuất');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBatch();
    }, [id]);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Active':
                return (
                    <Badge className="bg-green-500 text-white">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Đang hoạt động
                    </Badge>
                );
            case 'SoldOut':
                return (
                    <Badge className="bg-blue-500 text-white">
                        <Package className="w-3 h-3 mr-1" />
                        Đã bán hết
                    </Badge>
                );
            case 'Expired':
                return (
                    <Badge className="bg-red-500 text-white">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Đã hết hạn
                    </Badge>
                );
            case 'Recalled':
                return (
                    <Badge className="bg-orange-500 text-white">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Thu hồi
                    </Badge>
                );
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return '—';
        return new Date(dateString).toLocaleDateString('vi-VN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                <span className="ml-2 text-muted-foreground">Đang tải chi tiết lô...</span>
            </div>
        );
    }

    if (error || !batch) {
        return (
            <div className="space-y-6">
                <Button
                    variant="outline"
                    onClick={() =>
                        user?.role === 'KitchenStaff'
                            ? navigate('/kitchen/production/batches')
                            : navigate('/manager/production/batches')
                    }
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Quay lại danh sách lô
                </Button>
                <Card>
                    <CardContent className="p-6">
                        <ErrorState
                            title="Không thể tải chi tiết lô"
                            message={error || 'Không tìm thấy lô sản xuất'}
                            onRetry={fetchBatch}
                        />
                    </CardContent>
                </Card>
            </div>
        );
    }

    const productName = typeof batch.productId === 'string'
        ? 'Sản phẩm không xác định'
        : batch.productId?.name || 'Không xác định';

    const getPlanDisplay = () => {
        const planRef: any = (batch as any).productionPlanId;
        if (!planRef) return null;
        if (typeof planRef === 'string') {
            return planRef.substring(0, 8) + '...';
        }
        if (planRef.planCode) return planRef.planCode;
        if (planRef._id) return String(planRef._id).substring(0, 8) + '...';
        return null;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button
                        variant="outline"
                        onClick={() => navigate(-1)}
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Quay lại
                    </Button>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold">{batch.batchCode}</h1>
                        <p className="text-muted-foreground">{productName}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {getStatusBadge(batch.status)}
                </div>
            </div>

            {/* Main Info */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Thông tin lô</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Sản phẩm</span>
                            <span className="font-medium">{productName}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Trạng thái</span>
                            {getStatusBadge(batch.status)}
                        </div>
                        {getPlanDisplay() && (
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Kế hoạch sản xuất</span>
                                <span className="font-medium">{getPlanDisplay()}</span>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Số lượng</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Số lượng ban đầu</span>
                            <span className="font-medium">{batch.initialQuantity?.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Số lượng hiện tại</span>
                            <span className="font-medium text-orange-500">{batch.currentQuantity?.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Đã sử dụng/đã bán</span>
                            <span className="font-medium">
                                {((batch.initialQuantity || 0) - (batch.currentQuantity || 0)).toLocaleString()}
                            </span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Thời gian</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Ngày sản xuất</span>
                            <span className="font-medium">{formatDate(batch.mfgDate)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Hạn sử dụng</span>
                            <span className="font-medium text-red-500">{formatDate(batch.expDate)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Hạn dùng (số ngày)</span>
                            <span className="font-medium">
                                {typeof batch.productId === 'object' && batch.productId?.shelfLifeDays
                                    ? `${batch.productId.shelfLifeDays} ngày`
                                    : '—'}
                            </span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Traceability */}
            {batch.ingredientBatchesUsed && batch.ingredientBatchesUsed.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Nguyên liệu đã sử dụng</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {batch.ingredientBatchesUsed.map((usage: any, index: number) => (
                                <div key={index} className="flex justify-between p-3 bg-muted/50 rounded-lg">
                                    <div>
                                        <p className="font-medium">
                                                {typeof usage.ingredientBatchId === 'object'
                                                ? usage.ingredientBatchId.ingredientId?.ingredientName || 'Nguyên liệu'
                                                : 'Nguyên liệu'}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            Lô nguyên liệu: {typeof usage.ingredientBatchId === 'object'
                                                ? usage.ingredientBatchId.batchCode
                                                : usage.ingredientBatchId?.substring(0, 8) || '—'}
                                        </p>
                                    </div>
                                    <span className="font-medium">{usage.quantityUsed?.toLocaleString()} đơn vị</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default BatchDetailPage;

