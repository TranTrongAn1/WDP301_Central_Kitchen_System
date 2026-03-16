import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ArrowLeft, Loader2, Package, Truck, CheckCircle2,
    Clock, XCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ErrorState } from '../components/ui/ErrorState';
import { transferApi } from '@/api/TransferApi';
import type { Transfer } from '@/api/TransferApi';

const TransferDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [transfer, setTransfer] = useState<Transfer | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchTransfer = async () => {
        if (!id) return;
        try {
            setLoading(true);
            setError(null);
            const response = await transferApi.getById(id);
            const data = (response as any)?.data || response;
            setTransfer(data);
        } catch (err) {
            console.error('Error fetching transfer:', err);
            setError('Không thể tải chi tiết điều chuyển');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTransfer();
    }, [id]);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Pending':
                return <Badge className="bg-yellow-500 text-white"><Clock className="w-3 h-3 mr-1" />Đang chờ xử lý</Badge>;
            case 'Shipped':
            case 'InTransit':
                return <Badge className="bg-blue-500 text-white"><Truck className="w-3 h-3 mr-1" />Đang giao</Badge>;
            case 'Received':
            case 'Completed':
                return <Badge className="bg-green-500 text-white"><CheckCircle2 className="w-3 h-3 mr-1" />Đã nhận</Badge>;
            case 'Cancelled':
                return <Badge className="bg-red-500 text-white"><XCircle className="w-3 h-3 mr-1" />Đã hủy</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const getStoreName = () => {
        if (!transfer) return 'Cửa hàng không xác định';
        if (typeof transfer.toStoreId === 'string') return 'Cửa hàng không xác định';
        return transfer.toStoreId?.storeName || 'Cửa hàng không xác định';
    };

    const getStoreAddress = () => {
        if (!transfer) return '';
        if (typeof transfer.toStoreId === 'string') return '';
        return transfer.toStoreId?.address || '';
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
                <span className="ml-2 text-muted-foreground">Đang tải chi tiết điều chuyển...</span>
            </div>
        );
    }

    if (error || !transfer) {
        return (
            <div className="space-y-6">
                <Button variant="outline" onClick={() => navigate('/manager/orders')}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Quay lại danh sách điều chuyển
                </Button>
                <Card>
                    <CardContent className="p-6">
                        <ErrorState
                            title="Không thể tải chi tiết điều chuyển"
                            message={error || 'Không tìm thấy phiếu điều chuyển'}
                            onRetry={fetchTransfer}
                        />
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="outline" onClick={() => navigate('/manager/orders')}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Quay lại
                    </Button>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold">{transfer.transferCode}</h1>
                        <div className="flex items-center gap-2 mt-1">
                            {getStatusBadge(transfer.status)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Transfer Info */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Thông tin điều chuyển</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Trạng thái</span>
                            {getStatusBadge(transfer.status)}
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Cửa hàng nhận</span>
                            <span className="font-medium">{getStoreName()}</span>
                        </div>
                        {getStoreAddress() && (
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Địa chỉ</span>
                                <span className="font-medium text-right max-w-[200px]">{getStoreAddress()}</span>
                            </div>
                        )}
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Số dòng sản phẩm</span>
                            <span className="font-medium">{transfer.items?.length || 0} sản phẩm</span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Mốc thời gian</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <p className="text-sm text-muted-foreground">Ngày tạo</p>
                            <p className="font-medium">{formatDate(transfer.createdAt)}</p>
                        </div>
                        {transfer.shippedDate && (
                            <div>
                                <p className="text-sm text-muted-foreground">Ngày xuất kho</p>
                                <p className="font-medium">{formatDate(transfer.shippedDate)}</p>
                            </div>
                        )}
                        {transfer.receivedDate && (
                            <div>
                                <p className="text-sm text-muted-foreground">Ngày cửa hàng nhận</p>
                                <p className="font-medium">{formatDate(transfer.receivedDate)}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Tổng quan</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <p className="text-sm text-muted-foreground">Tổng số đơn vị</p>
                            <p className="text-2xl font-bold text-orange-500">
                                {transfer.items?.reduce((sum, item) => sum + item.quantity, 0) || 0}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Items List */}
            <Card>
                <CardHeader>
                    <CardTitle>Danh sách sản phẩm điều chuyển</CardTitle>
                </CardHeader>
                <CardContent>
                    {transfer.items && transfer.items.length > 0 ? (
                        <div className="space-y-3">
                            {transfer.items.map((item, index) => {
                                const batch = typeof item.batchId === 'string' ? null : item.batchId;
                                const product = batch?.productId;
                                const productName = product?.name || 'Sản phẩm không xác định';
                                const productSku = product?.sku || '—';
                                const batchCode = batch?.batchCode || 'Lô không xác định';
                                const expDate = batch?.expDate || '';

                                return (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center">
                                                <Package className="w-6 h-6 text-white" />
                                            </div>
                                            <div>
                                                <h4 className="font-semibold">{productName}</h4>
                                                    <p className="text-sm text-muted-foreground">
                                                    {productSku} • Lô: {batchCode}
                                                </p>
                                                    {expDate && (
                                                    <p className="text-xs text-muted-foreground">
                                                        HSD: {formatDate(expDate)}
                                                    </p>
                                                    )}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xl font-bold">{item.quantity}</p>
                                            <p className="text-sm text-muted-foreground">đơn vị</p>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            Không có sản phẩm nào trong phiếu điều chuyển này
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default TransferDetailPage;

