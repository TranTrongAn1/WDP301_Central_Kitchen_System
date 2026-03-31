import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ArrowLeft, Clock, CheckCircle2, AlertCircle, Loader2,
    Package, Play, X, Trash2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../manager/components/ui/Card';
import { Button } from '../../manager/components/ui/Button';
import { Badge } from '../../manager/components/ui/Badge';
import { Input } from '../../manager/components/ui/Input';
import { Modal, ConfirmModal } from '../../manager/components/ui/Modal';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../../manager/components/ui/Select';
import { ErrorState } from '../../manager/components/ui/ErrorState';
import { productionPlanApi } from '@/api/ProductionPlanApi';
import type { ProductionPlan, ProductionPlanDetail } from '@/api/ProductionPlanApi';
import { inventoryApi, type IngredientBatch } from '@/api/InventoryApi';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/shared/zustand/authStore';

const ProductionPlanDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const role = user?.role;
    const listPath =
        role === 'Admin'
            ? '/admin/production'
            : role === 'Coordinator'
                ? '/coordinator/production'
                : role === 'KitchenStaff'
                    ? '/kitchen/production'
                    : '/manager/production';
    const [plan, setPlan] = useState<ProductionPlan | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedDetail, setSelectedDetail] = useState<ProductionPlanDetail | null>(null);
    const [actualQuantity, setActualQuantity] = useState<number>(0);
    const [actionLoading, setActionLoading] = useState(false);
    const [ingredientBatches, setIngredientBatches] = useState<IngredientBatch[]>([]);
    const [batchesLoading, setBatchesLoading] = useState(false);
    const [usedIngredients, setUsedIngredients] = useState<{ ingredientBatchId: string; quantityUsed: number; note?: string }[]>([
        { ingredientBatchId: '', quantityUsed: 0, note: '' },
    ]);

    const fetchPlan = useCallback(async () => {
        if (!id) return;
        try {
            setLoading(true);
            setError(null);
            const response = await productionPlanApi.getById(id);
            const raw = response as unknown;
            const data =
                raw && typeof raw === 'object' && 'data' in (raw as { data?: ProductionPlan })
                    ? (raw as { data?: ProductionPlan }).data
                    : (raw as ProductionPlan | null);
            if (data) setPlan(data);
        } catch (err: unknown) {
            console.error('Error fetching production plan:', err);
            setError('Không thể tải chi tiết kế hoạch sản xuất');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        void fetchPlan();
    }, [fetchPlan]);

    const getStatusBadge = (status: string) => {
        const configs: Record<string, { className: string; icon: React.ReactNode; label: string }> = {
            Completed: { className: 'bg-green-500 text-white', icon: <CheckCircle2 className="w-3 h-3 mr-1" />, label: 'Đã hoàn thành' },
            In_Progress: { className: 'bg-orange-500 text-white', icon: <Clock className="w-3 h-3 mr-1" />, label: 'Đang sản xuất' },
            InProgress: { className: 'bg-orange-500 text-white', icon: <Clock className="w-3 h-3 mr-1" />, label: 'Đang sản xuất' },
            Cancelled: { className: 'bg-red-500 text-white', icon: <X className="w-3 h-3 mr-1" />, label: 'Đã hủy' },
            Planned: { className: 'bg-blue-500 text-white', icon: <AlertCircle className="w-3 h-3 mr-1" />, label: 'Đã lên kế hoạch' },
            Pending: { className: 'bg-gray-500 text-white', icon: <Clock className="w-3 h-3 mr-1" />, label: 'Chờ xử lý' },
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
        if (!detail.productId || typeof detail.productId === 'string') {
            return {
                name: 'Sản phẩm (đã bị xoá hoặc không còn tồn tại)',
                sku: typeof detail.productId === 'string' ? detail.productId : '',
                price: 0,
                shelfLifeDays: 0,
            };
        }
        const product = detail.productId as {
            name?: string;
            sku?: string;
            price?: number;
            shelfLifeDays?: number;
        };
        return {
            name: product.name || 'Sản phẩm (đã bị xoá)',
            sku: product.sku || '',
            price: product.price ?? 0,
            shelfLifeDays: product.shelfLifeDays ?? 0,
        };
    };

    const openCompleteModal = (detail: ProductionPlanDetail) => {
        setSelectedDetail(detail);
        setActualQuantity(detail.plannedQuantity);
        setUsedIngredients([{ ingredientBatchId: '', quantityUsed: detail.plannedQuantity, note: '' }]);
        void loadIngredientBatches();
        setIsCompleteModalOpen(true);
    };

    const loadIngredientBatches = async () => {
        setBatchesLoading(true);
        try {
            // Lấy toàn bộ batch nguyên liệu active một lần để dropdown nhanh hơn
            const res = await inventoryApi.getAllIngredientBatches();
            const raw = res as unknown;
            const body =
                raw && typeof raw === 'object' && 'data' in (raw as { data?: IngredientBatch[] })
                    ? (raw as { data?: IngredientBatch[] }).data
                    : (raw as IngredientBatch[] | null) ?? [];
            const list: IngredientBatch[] = Array.isArray(body) ? body : [];
            setIngredientBatches(list.filter((b) => b.isActive));
        } catch {
            setIngredientBatches([]);
        } finally {
            setBatchesLoading(false);
        }
    };

    const handleCompleteItem = async () => {
        if (!id || !selectedDetail) return;

        const productId = !selectedDetail.productId || typeof selectedDetail.productId === 'string'
            ? (selectedDetail.productId as string)
            : selectedDetail.productId._id;

        const payloadUsed = usedIngredients
            .filter((u) => u.ingredientBatchId && u.quantityUsed > 0)
            .map((u) => ({
                ingredientBatchId: u.ingredientBatchId,
                quantityUsed: u.quantityUsed,
                note: u.note?.trim() || undefined,
            }));

        if (payloadUsed.length === 0) {
            toast.error('Vui lòng chọn ít nhất 1 batch nguyên liệu và số lượng sử dụng.');
            return;
        }

        try {
            setActionLoading(true);
            await productionPlanApi.completeItem(id, {
                productId,
                actualQuantity,
                usedIngredients: payloadUsed,
            });
            setIsCompleteModalOpen(false);
            setSelectedDetail(null);
            fetchPlan();
        } catch (err: unknown) {
            console.error('Error completing item:', err);
            const e = err as { response?: { data?: { message?: string } }; message?: string };
            const rawMessage =
                e?.response?.data?.message ||
                e?.message ||
                'Failed to complete production item';
            toast.error(rawMessage);
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeletePlan = async () => {
        if (!id) return;
        try {
            setActionLoading(true);
            await productionPlanApi.delete(id);
            toast.success('Đã xoá production plan.');
            navigate(listPath);
        } catch (err: unknown) {
            console.error('Error deleting plan:', err);
            const e = err as { response?: { data?: { message?: string } }; message?: string };
            const msg =
                e?.response?.data?.message ||
                e?.message ||
                'Failed to delete production plan';
            toast.error(msg);
        } finally {
            setActionLoading(false);
        }
    };

    const handleUpdateStatus = async (newStatus: 'In_Progress' | 'Completed' | 'Cancelled') => {
        if (!id) return;
        try {
            setActionLoading(true);
            await productionPlanApi.updateStatus(id, { status: newStatus });
            toast.success('Đã cập nhật trạng thái kế hoạch.');
            fetchPlan();
        } catch (err: unknown) {
            console.error('Error updating status:', err);
            const e = err as { response?: { data?: { message?: string } }; message?: string };
            const msg =
                e?.response?.data?.message ||
                e?.message ||
                'Failed to update status';
            toast.error(msg);
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                <span className="ml-2 text-muted-foreground">Đang tải chi tiết kế hoạch...</span>
            </div>
        );
    }

    if (error || !plan) {
        return (
            <div className="space-y-6">
                <Button variant="outline" onClick={() => navigate(listPath)}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Quay lại danh sách kế hoạch
                </Button>
                <Card>
                    <CardContent className="p-6">
                        <ErrorState
                            title="Không thể tải chi tiết kế hoạch"
                            message={error || 'Không tìm thấy kế hoạch sản xuất'}
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

    const canDelete =
        (plan.status === 'Planned' || plan.status === 'Cancelled') &&
        (role === 'Manager' || role === 'Admin');
    const canComplete = plan.status !== 'Completed' && plan.status !== 'Cancelled';
    const isCoordinator = role === 'Coordinator';

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="outline" onClick={() => navigate(listPath)}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Quay lại
                    </Button>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold">{plan.planCode}</h1>
                        <p className="text-muted-foreground">
                            {new Date(plan.planDate).toLocaleDateString('vi-VN', {
                                weekday: 'long',
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit'
                            })}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {getStatusBadge(plan.status)}
                    {!isCoordinator && plan.status === 'Planned' && (
                        <Button onClick={() => handleUpdateStatus('In_Progress')} size="sm">
                            <Play className="w-4 h-4 mr-1" />
                            Bắt đầu thực hiện
                        </Button>
                    )}
                    {!isCoordinator && (plan.status === 'In_Progress' || plan.status === 'InProgress') && (
                        <>
                                <Button
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                onClick={() => handleUpdateStatus('Completed')}
                                disabled={actionLoading}
                            >
                                <CheckCircle2 className="w-4 h-4 mr-1" />
                                Hoàn thành kế hoạch
                            </Button>
                                <Button
                                size="sm"
                                variant="outline"
                                className="text-red-500 border-red-200 hover:bg-red-50"
                                onClick={() => handleUpdateStatus('Cancelled')}
                                disabled={actionLoading}
                            >
                                <X className="w-4 h-4 mr-1" />
                                Hủy kế hoạch
                            </Button>
                        </>
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
                            <CardTitle>Các dòng sản xuất</CardTitle>
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
                                                            SKU: {product.sku} • Hạn sử dụng: {product.shelfLifeDays} ngày
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    {getStatusBadge(detail.status)}
                                                    {!isCoordinator && !isCompleted && canComplete && (
                                                            <Button
                                                            size="sm"
                                                            onClick={() => openCompleteModal(detail)}
                                                            className="bg-gradient-to-r from-orange-600 to-amber-600"
                                                        >
                                                            <CheckCircle2 className="w-4 h-4 mr-1" />
                                                            Hoàn tất mẻ
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>

                                                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                                                <div>
                                                    <p className="text-muted-foreground">Kế hoạch (số lượng)</p>
                                                    <p className="font-semibold text-lg">{detail.plannedQuantity}</p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">Thực tế (số lượng thành phẩm)</p>
                                                    <p className="font-semibold text-lg text-orange-500">{detail.actualQuantity}</p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">Đơn giá</p>
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
                            <CardTitle>Tổng quan kế hoạch</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Trạng thái</span>
                                {getStatusBadge(plan.status)}
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Số dòng sản xuất</span>
                                <span className="font-semibold">{plan.details?.length || 0}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Tổng sản lượng kế hoạch</span>
                                <span className="font-semibold">
                                    {plan.details?.reduce((sum, d) => sum + d.plannedQuantity, 0) || 0} đơn vị
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Tổng sản lượng thực tế</span>
                                <span className="font-semibold text-orange-500">
                                    {plan.details?.reduce((sum, d) => sum + d.actualQuantity, 0) || 0} đơn vị
                                </span>
                            </div>
                            <div className="pt-2 border-t">
                                <div className="flex justify-between mb-2">
                                    <span className="text-muted-foreground">Tiến độ toàn kế hoạch</span>
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
                            <CardTitle>Ghi chú</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">{plan.note}</p>
                            </CardContent>
                        </Card>
                    )}

                    <Card>
                        <CardHeader>
                            <CardTitle>Mốc thời gian</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Tạo lúc</span>
                                <span>{new Date(plan.createdAt).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Cập nhật gần nhất</span>
                                <span>{new Date(plan.updatedAt).toLocaleString()}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Modal
                isOpen={isCompleteModalOpen}
                onClose={() => setIsCompleteModalOpen(false)}
                title="Hoàn tất mẻ sản xuất"
                description="Nhập số lượng thành phẩm thực tế và các batch nguyên liệu đã dùng cho mẻ này"
                size="xl"
                footer={
                    <>
                        <Button variant="outline" onClick={() => setIsCompleteModalOpen(false)}>
                            Hủy
                        </Button>
                        <Button
                            className="bg-gradient-to-r from-orange-600 to-amber-600"
                            onClick={handleCompleteItem}
                            disabled={actionLoading || actualQuantity <= 0}
                        >
                            {actionLoading ? 'Đang xử lý...' : 'Hoàn tất & tạo lô'}
                        </Button>
                    </>
                }
            >
                <div className="space-y-4">
                    {selectedDetail && (
                        <div className="p-3 rounded-lg bg-muted/50">
                            <p className="font-medium">{getProductInfo(selectedDetail).name}</p>
                            <p className="text-sm text-muted-foreground">
                                Kế hoạch: {selectedDetail.plannedQuantity} đơn vị
                            </p>
                        </div>
                    )}
                    <div className="grid gap-6 md:grid-cols-[1fr,1.6fr]">
                            <div className="space-y-3">
                            <label className="text-sm font-medium block">
                                Số lượng thành phẩm thực tế
                                <span className="block text-[11px] font-normal text-muted-foreground">
                                    (tính theo đơn vị sản phẩm: chiếc/bánh/hộp/đơn vị thành phẩm)
                                </span>
                            </label>
                            <Input
                                type="number"
                                min={1}
                                value={actualQuantity}
                                onChange={(e) => setActualQuantity(parseInt(e.target.value) || 0)}
                            />
                            <p className="text-xs text-muted-foreground">
                                Đây là tổng số <strong>đơn vị thành phẩm</strong> đã làm xong cho sản phẩm này
                                (ví dụ: 10 chiếc bánh, 20 hộp...). Khi bấm &quot;Complete &amp; Create Batch&quot;,
                                hệ thống sẽ tạo <strong>01 lô (batch) thành phẩm</strong> với đúng số lượng này
                                và tự động trừ nguyên liệu trong kho tương ứng.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium block">
                                Các batch nguyên liệu đã sử dụng
                            </label>
                            <p className="text-xs text-muted-foreground">
                                Mỗi dòng bên dưới tương ứng <strong>01 batch nguyên liệu</strong> mà bếp đã dùng cho mẻ sản xuất này.
                                Số lượng nhập vào được tính theo <strong>cùng đơn vị với batch</strong> (kg, lít, cái,...)
                                như hiển thị ở từng dòng batch.
                            </p>
                            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                                {usedIngredients.map((row, index) => (
                                    <div
                                        key={index}
                                        className="rounded-xl border border-border bg-background/80 px-3 py-2 space-y-2 shadow-sm"
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                                                Batch nguyên liệu #{index + 1}
                                            </span>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                                onClick={() =>
                                                    setUsedIngredients((prev) =>
                                                        prev.length === 1
                                                            ? [{ ingredientBatchId: '', quantityUsed: 0, note: '' }]
                                                            : prev.filter((_, i) => i !== index)
                                                    )
                                                }
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                        <div className="grid grid-cols-[2fr,1fr] gap-2 items-center">
                                            <Select
                                                value={row.ingredientBatchId}
                                                onValueChange={(value) => {
                                                    setUsedIngredients((prev) =>
                                                        prev.map((u, i) =>
                                                            i === index
                                                                ? { ...u, ingredientBatchId: value }
                                                                : u
                                                        )
                                                    );
                                                }}
                                            >
                                            <SelectTrigger className="h-9 text-xs">
                                                    <SelectValue placeholder={batchesLoading ? 'Đang tải batch...' : 'Chọn batch nguyên liệu'} />
                                                </SelectTrigger>
                                                <SelectContent position="popper" side="bottom" align="start" className="max-h-64">
                                                    {batchesLoading && ingredientBatches.length === 0 && (
                                                        <div className="px-3 py-2 text-[11px] text-muted-foreground">
                                                            Đang tải danh sách batch nguyên liệu...
                                                        </div>
                                                    )}
                                                    {!batchesLoading && ingredientBatches.length === 0 && (
                                                        <div className="px-3 py-2 text-[11px] text-muted-foreground">
                                                            Không có batch nguyên liệu khả dụng.
                                                        </div>
                                                    )}
                                                    {ingredientBatches.map((b) => (
                                                        <SelectItem key={b._id} value={b._id}>
                                                            <div className="flex flex-col text-[11px]">
                                                                <span className="font-medium">
                                                                    {typeof b.ingredientId === 'string'
                                                                        ? b.ingredientId
                                                                        : b.ingredientId.ingredientName}
                                                                </span>
                                                                <span className="text-muted-foreground">
                                                                    Batch {b.batchCode} • {b.currentQuantity}{' '}
                                                                    {typeof b.ingredientId === 'string'
                                                                        ? ''
                                                                        : b.ingredientId.unit}
                                                                </span>
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <div className="flex items-center gap-1">
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    className="h-9 text-xs"
                                                    value={row.quantityUsed}
                                                    onChange={(e) => {
                                                        const value = Number(e.target.value) || 0;
                                                        setUsedIngredients((prev) =>
                                                            prev.map((u, i) =>
                                                                i === index ? { ...u, quantityUsed: value } : u
                                                            )
                                                        );
                                                    }}
                                                    placeholder="Số lượng sử dụng"
                                                />
                                                <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                                                    {(() => {
                                                        const batch = ingredientBatches.find((b) => b._id === row.ingredientBatchId);
                                                        if (!batch) return '';
                                                        return typeof batch.ingredientId === 'string'
                                                            ? ''
                                                            : batch.ingredientId.unit || '';
                                                    })()}
                                                </span>
                                            </div>
                                        </div>
                                        <Input
                                            type="text"
                                            className="h-8 text-xs"
                                            placeholder="Ghi chú (tuỳ chọn)"
                                            value={row.note ?? ''}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                setUsedIngredients((prev) =>
                                                    prev.map((u, i) =>
                                                        i === index ? { ...u, note: value } : u
                                                    )
                                                );
                                            }}
                                        />
                                    </div>
                                ))}
                            </div>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="mt-1 h-8 text-[11px]"
                                onClick={() =>
                                    setUsedIngredients((prev) => [
                                        ...prev,
                                        { ingredientBatchId: '', quantityUsed: 0, note: '' },
                                    ])
                                }
                            >
                                + Thêm batch nguyên liệu
                            </Button>
                        </div>
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
