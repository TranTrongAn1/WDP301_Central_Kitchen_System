import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ArrowLeft, Loader2, Package, Truck, CheckCircle2,
    Clock, XCircle, Eye, MapPin, Phone, Calendar
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
            setError('Failed to load transfer details');
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
                return <Badge className="bg-yellow-500 text-white"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
            case 'Shipped':
                return <Badge className="bg-blue-500 text-white"><Truck className="w-3 h-3 mr-1" />Shipped</Badge>;
            case 'Received':
                return <Badge className="bg-green-500 text-white"><CheckCircle2 className="w-3 h-3 mr-1" />Received</Badge>;
            case 'Cancelled':
                return <Badge className="bg-red-500 text-white"><XCircle className="w-3 h-3 mr-1" />Cancelled</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const getStoreName = () => {
        if (!transfer) return 'Unknown Store';
        if (typeof transfer.toStoreId === 'string') return 'Unknown Store';
        return transfer.toStoreId?.storeName || 'Unknown Store';
    };

    const getStoreAddress = () => {
        if (!transfer) return '';
        if (typeof transfer.toStoreId === 'string') return '';
        return transfer.toStoreId?.address || '';
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return 'N/A';
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
                <span className="ml-2 text-muted-foreground">Loading transfer...</span>
            </div>
        );
    }

    if (error || !transfer) {
        return (
            <div className="space-y-6">
                <Button variant="outline" onClick={() => navigate('/manager/orders')}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Transfers
                </Button>
                <Card>
                    <CardContent className="p-6">
                        <ErrorState
                            title="Failed to Load Transfer"
                            message={error || 'Transfer not found'}
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
                        Back
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
                        <CardTitle>Transfer Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Status</span>
                            {getStatusBadge(transfer.status)}
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Destination</span>
                            <span className="font-medium">{getStoreName()}</span>
                        </div>
                        {getStoreAddress() && (
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Address</span>
                                <span className="font-medium text-right max-w-[200px]">{getStoreAddress()}</span>
                            </div>
                        )}
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Items</span>
                            <span className="font-medium">{transfer.items?.length || 0} products</span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Timeline</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <p className="text-sm text-muted-foreground">Created</p>
                            <p className="font-medium">{formatDate(transfer.createdAt)}</p>
                        </div>
                        {transfer.shippedDate && (
                            <div>
                                <p className="text-sm text-muted-foreground">Shipped</p>
                                <p className="font-medium">{formatDate(transfer.shippedDate)}</p>
                            </div>
                        )}
                        {transfer.receivedDate && (
                            <div>
                                <p className="text-sm text-muted-foreground">Received</p>
                                <p className="font-medium">{formatDate(transfer.receivedDate)}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <p className="text-sm text-muted-foreground">Total Units</p>
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
                    <CardTitle>Transfer Items</CardTitle>
                </CardHeader>
                <CardContent>
                    {transfer.items && transfer.items.length > 0 ? (
                        <div className="space-y-3">
                            {transfer.items.map((item, index) => {
                                const batch = typeof item.batchId === 'string' ? null : item.batchId;
                                const product = batch?.productId;
                                const productName = product?.name || 'Unknown Product';
                                const productSku = product?.sku || 'N/A';
                                const batchCode = batch?.batchCode || 'Unknown Batch';
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
                                                    {productSku} • Batch: {batchCode}
                                                </p>
                                                {expDate && (
                                                    <p className="text-xs text-muted-foreground">
                                                        Expires: {formatDate(expDate)}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xl font-bold">{item.quantity}</p>
                                            <p className="text-sm text-muted-foreground">units</p>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            No items in this transfer
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default TransferDetailPage;

