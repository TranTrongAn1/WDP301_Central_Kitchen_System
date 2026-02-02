import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ArrowLeft, Clock, CheckCircle2, AlertCircle, Loader2,
    Package, Play, X, Trash2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Modal, ConfirmModal } from '../components/ui/Modal';
import { ErrorState } from '../components/ui/ErrorState';
import { productionPlanApi } from '@/api/ProductionPlanApi';
import type { ProductionPlan, ProductionPlanDetail } from '@/api/ProductionPlanApi';

const ProductionPlanDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [plan, setPlan] = useState<ProductionPlan | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedDetail, setSelectedDetail] = useState<ProductionPlanDetail | null>(null);
    const [actualQuantity, setActualQuantity] = useState<number>(0);
    const [actionLoading, setActionLoading] = useState(false);

    const fetchPlan = async () => {
        if (!id) return;
        try {
            setLoading(true);
            setError(null);
            const response = await productionPlanApi.getById(id);
            const data = (response as any)?.data || response;
            setPlan(data);
        } catch (err) {
            console.error('Error fetching production plan:', err);
            setError('Failed to load production plan details');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPlan();
    }, [id]);

    const getStatusBadge = (status: string) => {
        const configs: Record<string, { className: string; icon: React.ReactNode; label: string }> = {
            Completed: { className: 'bg-green-500 text-white', icon: <CheckCircle2 className="w-3 h-3 mr-1" />, label: 'Completed' },
            In_Progress: { className: 'bg-orange-500 text-white', icon: <Clock className="w-3 h-3 mr-1" />, label: 'In Progress' },
            Cancelled: { className: 'bg-red-500 text-white', icon: <X className="w-3 h-3 mr-1" />, label: 'Cancelled' },
            Planned: { className: 'bg-blue-500 text-white', icon: <AlertCircle className="w-3 h-3 mr-1" />, label: 'Planned' },
            Pending: { className: 'bg-gray-500 text-white', icon: <Clock className="w-3 h-3 mr-1" />, label: 'Pending' },
        };
        const config = configs[status] || configs.Pending;
        return (
            <Badge className={config.className}>
                {config.icon}
                {config.label}
            </Badge>
        );
    };

    const getProductInfo = (detail: ProductionPlanDetail) => {
        if (typeof detail.productId === 'string') {
            return { name: 'Unknown Product', sku: detail.productId, price: 0, shelfLifeDays: 0 };
        }
        return detail.productId;
    };

    const openCompleteModal = (detail: ProductionPlanDetail) => {
        setSelectedDetail(detail);
        setActualQuantity(detail.plannedQuantity);
        setIsCompleteModalOpen(true);
    };

    const handleCompleteItem = async () => {
        if (!id || !selectedDetail) return;

        const productId = typeof selectedDetail.productId === 'string'
            ? selectedDetail.productId
            : selectedDetail.productId._id;

        try {
            setActionLoading(true);
            await productionPlanApi.completeItem(id, { productId, actualQuantity });
            setIsCompleteModalOpen(false);
            setSelectedDetail(null);
            fetchPlan();
        } catch (err) {
            console.error('Error completing item:', err);
            alert('Failed to complete production item');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeletePlan = async () => {
        if (!id) return;
        try {
            setActionLoading(true);
            await productionPlanApi.delete(id);
            navigate('/manager/production');
        } catch (err) {
            console.error('Error deleting plan:', err);
            alert('Failed to delete production plan');
        } finally {
            setActionLoading(false);
        }
    };

    const handleUpdateStatus = async (newStatus: 'In_Progress' | 'Completed' | 'Cancelled') => {
        if (!id) return;
        try {
            setActionLoading(true);
            await productionPlanApi.updateStatus(id, { status: newStatus });
            fetchPlan();
        } catch (err) {
            console.error('Error updating status:', err);
            alert('Failed to update status');
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                <span className="ml-2 text-muted-foreground">Loading plan details...</span>
            </div>
        );
    }

    if (error || !plan) {
        return (
            <div className="space-y-6">
                <Button variant="outline" onClick={() => navigate('/manager/production')}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Plans
                </Button>
                <Card>
                    <CardContent className="p-6">
                        <ErrorState
                            title="Failed to Load Plan"
                            message={error || 'Plan not found'}
                            onRetry={fetchPlan}
                        />
                    </CardContent>
                </Card>
            </div>
        );
    }

    const completionPercentage = plan.details?.length
        ? Math.round(
            (plan.details.reduce((sum, d) => sum + d.actualQuantity, 0) /
                plan.details.reduce((sum, d) => sum + d.plannedQuantity, 0)) * 100
        )
        : 0;

    const canDelete = plan.status === 'Planned' || plan.status === 'Cancelled';
    const canComplete = plan.status !== 'Completed' && plan.status !== 'Cancelled';

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="outline" onClick={() => navigate('/manager/production')}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                    </Button>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold">{plan.planCode}</h1>
                        <p className="text-muted-foreground">
                            {new Date(plan.planDate).toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {getStatusBadge(plan.status)}
                    {plan.status === 'Planned' && (
                        <Button onClick={() => handleUpdateStatus('In_Progress')} size="sm">
                            <Play className="w-4 h-4 mr-1" />
                            Start
                        </Button>
                    )}
                    {canDelete && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="text-red-500"
                            onClick={() => setIsDeleteModalOpen(true)}
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Production Items</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {plan.details?.map((detail, idx) => {
                                    const product = getProductInfo(detail);
                                    const isCompleted = detail.status === 'Completed';
                                    const progress = detail.plannedQuantity > 0
                                        ? Math.round((detail.actualQuantity / detail.plannedQuantity) * 100)
                                        : 0;

                                    return (
                                        <motion.div
                                            key={idx}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.1 }}
                                            className={`p-4 rounded-xl border ${isCompleted ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-muted/50 border-transparent'}`}
                                        >
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${isCompleted ? 'bg-green-500' : 'bg-gradient-to-br from-orange-400 to-amber-500'}`}>
                                                        <Package className="w-6 h-6 text-white" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-semibold">{product.name}</h4>
                                                        <p className="text-sm text-muted-foreground">
                                                            SKU: {product.sku} • Shelf Life: {product.shelfLifeDays} days
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    {getStatusBadge(detail.status)}
                                                    {!isCompleted && canComplete && (
                                                        <Button
                                                            size="sm"
                                                            onClick={() => openCompleteModal(detail)}
                                                            className="bg-gradient-to-r from-orange-600 to-amber-600"
                                                        >
                                                            <CheckCircle2 className="w-4 h-4 mr-1" />
                                                            Complete
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                                                <div>
                                                    <p className="text-muted-foreground">Planned</p>
                                                    <p className="font-semibold text-lg">{detail.plannedQuantity}</p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">Actual</p>
                                                    <p className="font-semibold text-lg text-orange-500">{detail.actualQuantity}</p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">Unit Price</p>
                                                    <p className="font-semibold">{product.price?.toLocaleString()}đ</p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">Progress</p>
                                                    <p className="font-semibold">{progress}%</p>
                                                </div>
                                            </div>

                                            <div className="mt-3">
                                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full transition-all ${isCompleted ? 'bg-green-500' : 'bg-gradient-to-r from-orange-500 to-amber-600'}`}
                                                        style={{ width: `${progress}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Plan Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Status</span>
                                {getStatusBadge(plan.status)}
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Total Items</span>
                                <span className="font-semibold">{plan.details?.length || 0}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Total Planned</span>
                                <span className="font-semibold">
                                    {plan.details?.reduce((sum, d) => sum + d.plannedQuantity, 0) || 0} units
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Total Produced</span>
                                <span className="font-semibold text-orange-500">
                                    {plan.details?.reduce((sum, d) => sum + d.actualQuantity, 0) || 0} units
                                </span>
                            </div>
                            <div className="pt-2 border-t">
                                <div className="flex justify-between mb-2">
                                    <span className="text-muted-foreground">Overall Progress</span>
                                    <span className="font-semibold">{completionPercentage}%</span>
                                </div>
                                <div className="h-3 bg-muted rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-orange-500 to-amber-600 transition-all"
                                        style={{ width: `${completionPercentage}%` }}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {plan.note && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Notes</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">{plan.note}</p>
                            </CardContent>
                        </Card>
                    )}

                    <Card>
                        <CardHeader>
                            <CardTitle>Timeline</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Created</span>
                                <span>{new Date(plan.createdAt).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Last Updated</span>
                                <span>{new Date(plan.updatedAt).toLocaleString()}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Modal
                isOpen={isCompleteModalOpen}
                onClose={() => setIsCompleteModalOpen(false)}
                title="Complete Production Item"
                description="Enter the actual quantity produced"
                size="sm"
                footer={
                    <>
                        <Button variant="outline" onClick={() => setIsCompleteModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            className="bg-gradient-to-r from-orange-600 to-amber-600"
                            onClick={handleCompleteItem}
                            disabled={actionLoading || actualQuantity <= 0}
                        >
                            {actionLoading ? 'Processing...' : 'Complete & Create Batch'}
                        </Button>
                    </>
                }
            >
                <div className="space-y-4">
                    {selectedDetail && (
                        <div className="p-3 rounded-lg bg-muted/50">
                            <p className="font-medium">{getProductInfo(selectedDetail).name}</p>
                            <p className="text-sm text-muted-foreground">
                                Planned: {selectedDetail.plannedQuantity} units
                            </p>
                        </div>
                    )}
                    <div>
                        <label className="text-sm font-medium mb-1 block">Actual Quantity Produced</label>
                        <Input
                            type="number"
                            min={1}
                            value={actualQuantity}
                            onChange={(e) => setActualQuantity(parseInt(e.target.value) || 0)}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            This will create a new finished batch and deduct ingredients from inventory (FEFO)
                        </p>
                    </div>
                </div>
            </Modal>

            <ConfirmModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeletePlan}
                title="Delete Production Plan"
                message={`Are you sure you want to delete "${plan.planCode}"? This action cannot be undone.`}
                confirmLabel="Delete"
                variant="danger"
                loading={actionLoading}
            />
        </div>
    );
};

export default ProductionPlanDetailPage;
