import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ArrowLeft, Loader2, Package, Calendar,
    Clock, DollarSign, Layers, AlertTriangle, CheckCircle2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ErrorState } from '../components/ui/ErrorState';
import { batchApi } from '@/api/BatchApi';
import type { Batch } from '@/api/BatchApi';

const BatchDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
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
            setError('Failed to load batch details');
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
                        Active
                    </Badge>
                );
            case 'SoldOut':
                return (
                    <Badge className="bg-blue-500 text-white">
                        <Package className="w-3 h-3 mr-1" />
                        Sold Out
                    </Badge>
                );
            case 'Expired':
                return (
                    <Badge className="bg-red-500 text-white">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Expired
                    </Badge>
                );
            case 'Recalled':
                return (
                    <Badge className="bg-orange-500 text-white">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Recalled
                    </Badge>
                );
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
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
                <span className="ml-2 text-muted-foreground">Loading batch...</span>
            </div>
        );
    }

    if (error || !batch) {
        return (
            <div className="space-y-6">
                <Button variant="outline" onClick={() => navigate('/manager/production/batches')}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Batches
                </Button>
                <Card>
                    <CardContent className="p-6">
                        <ErrorState
                            title="Failed to Load Batch"
                            message={error || 'Batch not found'}
                            onRetry={fetchBatch}
                        />
                    </CardContent>
                </Card>
            </div>
        );
    }

    const productName = typeof batch.productId === 'string'
        ? 'Unknown Product'
        : batch.productId?.name || 'Unknown';

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="outline" onClick={() => navigate('/manager/production/batches')}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
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
                        <CardTitle>Batch Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Product</span>
                            <span className="font-medium">{productName}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Status</span>
                            {getStatusBadge(batch.status)}
                        </div>
                        {batch.productionPlanId && (
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Plan ID</span>
                                <span className="font-medium">
                                    {typeof batch.productionPlanId === 'string'
                                        ? batch.productionPlanId.substring(0, 8) + '...'
                                        : batch.productionPlanId}
                                </span>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Quantities</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Initial Quantity</span>
                            <span className="font-medium">{batch.initialQuantity?.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Current Quantity</span>
                            <span className="font-medium text-orange-500">{batch.currentQuantity?.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Used/Sold</span>
                            <span className="font-medium">
                                {((batch.initialQuantity || 0) - (batch.currentQuantity || 0)).toLocaleString()}
                            </span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Dates</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Manufacturing Date</span>
                            <span className="font-medium">{formatDate(batch.mfgDate)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Expiry Date</span>
                            <span className="font-medium text-red-500">{formatDate(batch.expDate)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Shelf Life</span>
                            <span className="font-medium">
                                {typeof batch.productId === 'object' && batch.productId?.shelfLifeDays
                                    ? `${batch.productId.shelfLifeDays} days`
                                    : 'N/A'}
                            </span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Traceability */}
            {batch.ingredientBatchesUsed && batch.ingredientBatchesUsed.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Ingredients Used</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {batch.ingredientBatchesUsed.map((usage: any, index: number) => (
                                <div key={index} className="flex justify-between p-3 bg-muted/50 rounded-lg">
                                    <div>
                                        <p className="font-medium">
                                            {typeof usage.ingredientBatchId === 'object'
                                                ? usage.ingredientBatchId.ingredientId?.ingredientName || 'Ingredient'
                                                : 'Ingredient'}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            Batch: {typeof usage.ingredientBatchId === 'object'
                                                ? usage.ingredientBatchId.batchCode
                                                : usage.ingredientBatchId?.substring(0, 8) || 'N/A'}
                                        </p>
                                    </div>
                                    <span className="font-medium">{usage.quantityUsed?.toLocaleString()} units</span>
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

