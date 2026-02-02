import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Clock, CheckCircle2, AlertCircle, Loader2, RefreshCcw, Eye, Package, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Calendar } from '../components/ui/Calendar';
import { Input } from '../components/ui/Input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/Tabs';
import { Modal } from '../components/ui/Modal';
import { ErrorState } from '../components/ui/ErrorState';
import { EmptyState } from '../components/ui/EmptyState';
import { productionPlanApi, type CreateProductionPlanRequest } from '@/api/ProductionPlanApi';
import { productApi } from '@/api/ProductApi';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select';
import type { ProductionPlan, ProductionPlanDetail } from '@/api/ProductionPlanApi';
import type { Product } from '@/api/ProductApi';

interface PlanDetailItem {
    productId: string;
    productName: string;
    plannedQuantity: number;
}

const ProductionPlansPage = () => {
    const navigate = useNavigate();
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [activeTab, setActiveTab] = useState('all');
    const [plans, setPlans] = useState<ProductionPlan[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Create modal state
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [createLoading, setCreateLoading] = useState(false);
    const [planCode, setPlanCode] = useState('');
    const [planDate, setPlanDate] = useState('');
    const [note, setNote] = useState('');
    const [planDetails, setPlanDetails] = useState<PlanDetailItem[]>([]);
    const [selectedProduct, setSelectedProduct] = useState('');
    const [selectedQuantity, setSelectedQuantity] = useState<number>(1);

    const fetchPlans = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await productionPlanApi.getAll();
            const data = (response as any)?.data || response || [];
            setPlans(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error fetching production plans:', err);
            setError('Could not connect to the server. Please check your connection and try again.');
        } finally {
            setLoading(false);
        }
    };

    const fetchProducts = async () => {
        try {
            const response = await productApi.getAll();
            const data = (response as any)?.data || response || [];
            setProducts(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error fetching products:', err);
        }
    };

    useEffect(() => {
        fetchPlans();
        fetchProducts();
    }, []);

    const filterPlansByDate = (plans: ProductionPlan[]) => {
        if (!date) return plans;
        return plans.filter(plan => {
            const planDate = new Date(plan.planDate).toDateString();
            return planDate === date.toDateString();
        });
    };

    const getStatusBadge = (status: string) => {
        if (status === 'Completed') {
            return (
                <Badge className="bg-green-500 text-white">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Completed
                </Badge>
            );
        }
        if (status === 'In_Progress') {
            return (
                <Badge className="bg-orange-500 text-white">
                    <Clock className="w-3 h-3 mr-1" />
                    In Progress
                </Badge>
            );
        }
        if (status === 'Cancelled') {
            return (
                <Badge variant="destructive">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Cancelled
                </Badge>
            );
        }
        return (
            <Badge variant="secondary">
                <AlertCircle className="w-3 h-3 mr-1" />
                Planned
            </Badge>
        );
    };

    const filterPlans = (status: string) => {
        const datePlans = filterPlansByDate(plans);
        if (status === 'all') return datePlans;
        const statusMap: Record<string, string> = {
            'pending': 'Planned',
            'in-progress': 'In_Progress',
            'completed': 'Completed'
        };
        return datePlans.filter(plan => plan.status === statusMap[status]);
    };

    const getProductName = (detail: ProductionPlanDetail) => {
        if (typeof detail.productId === 'string') return 'Product';
        return detail.productId?.name || 'Unknown Product';
    };

    const getProductSku = (detail: ProductionPlanDetail) => {
        if (typeof detail.productId === 'string') return detail.productId;
        return detail.productId?.sku || '';
    };

    const getCompletionPercentage = (plan: ProductionPlan) => {
        if (!plan.details || plan.details.length === 0) return 0;
        const totalPlanned = plan.details.reduce((sum, d) => sum + d.plannedQuantity, 0);
        const totalActual = plan.details.reduce((sum, d) => sum + d.actualQuantity, 0);
        if (totalPlanned === 0) return 0;
        return Math.round((totalActual / totalPlanned) * 100);
    };

    const todayPlans = filterPlansByDate(plans);
    const stats = {
        total: todayPlans.length,
        completed: todayPlans.filter(p => p.status === 'Completed').length,
        inProgress: todayPlans.filter(p => p.status === 'In_Progress').length,
        totalUnits: todayPlans.reduce((sum, p) =>
            sum + (p.details?.reduce((s, d) => s + d.plannedQuantity, 0) || 0), 0
        ),
    };

    // Create plan handlers
    const addProductToPlan = () => {
        if (!selectedProduct || selectedQuantity <= 0) return;
        const product = products.find(p => p._id === selectedProduct);
        if (!product) return;

        setPlanDetails([...planDetails, {
            productId: selectedProduct,
            productName: product.name,
            plannedQuantity: selectedQuantity
        }]);
        setSelectedProduct('');
        setSelectedQuantity(1);
    };

    const removeProductFromPlan = (index: number) => {
        setPlanDetails(planDetails.filter((_, i) => i !== index));
    };

    const handleCreatePlan = async () => {
        if (!planCode || planDetails.length === 0) return;

        try {
            setCreateLoading(true);
            const data: CreateProductionPlanRequest = {
                planCode,
                planDate: planDate || new Date().toISOString(),
                note,
                details: planDetails.map(d => ({
                    productId: d.productId,
                    plannedQuantity: d.plannedQuantity
                }))
            };
            await productionPlanApi.create(data);
            setIsCreateModalOpen(false);
            resetCreateForm();
            fetchPlans();
        } catch (err) {
            console.error('Error creating plan:', err);
            alert('Failed to create production plan');
        } finally {
            setCreateLoading(false);
        }
    };

    const resetCreateForm = () => {
        setPlanCode('');
        setPlanDate('');
        setNote('');
        setPlanDetails([]);
    };

    const closeCreateModal = () => {
        setIsCreateModalOpen(false);
        resetCreateForm();
    };

    const openCreateModal = () => {
        setIsCreateModalOpen(true);
    };

    const viewPlan = (planId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        navigate(`/manager/production/${planId}`);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                <span className="ml-2 text-muted-foreground">Loading production plans...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                    </div>
                </div>
                <Card>
                    <CardContent className="p-6">
                        <ErrorState
                            title="Unable to Load Production Plans"
                            message={error}
                            onRetry={fetchPlans}
                        />
                    </CardContent>
                </Card>
            </div>
        );
    }

    const renderPlanList = (filteredPlans: ProductionPlan[]) => (
        <div className="space-y-4 mt-4">
            {filteredPlans.length === 0 ? (
                <EmptyState
                    icon={Package}
                    title="No Production Plans"
                    message={`No production plans found for ${date?.toLocaleDateString() || 'selected date'}`}
                    actionLabel="Create New Plan"
                    onAction={openCreateModal}
                />
            ) : (
                filteredPlans.map((plan) => (
                    <motion.div
                        key={plan._id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                        onClick={() => navigate(`/manager/production/${plan._id}`)}
                    >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-3 gap-2">
                            <div>
                                <h3 className="font-semibold text-lg">{plan.planCode}</h3>
                                <p className="text-sm text-muted-foreground">
                                    {new Date(plan.planDate).toLocaleDateString()}
                                    {plan.note && ` • ${plan.note}`}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                {getStatusBadge(plan.status)}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => viewPlan(plan._id, e)}
                                >
                                    <Eye className="w-4 h-4 mr-1" />
                                    View
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {plan.details?.slice(0, 2).map((detail, idx) => (
                                <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between text-sm bg-background/50 p-2 rounded-lg gap-2">
                                    <div>
                                        <span className="font-medium">{getProductName(detail)}</span>
                                        <span className="text-muted-foreground ml-2">({getProductSku(detail)})</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span>{detail.actualQuantity} / {detail.plannedQuantity} units</span>
                                        {getStatusBadge(detail.status)}
                                    </div>
                                </div>
                            ))}
                            {plan.details && plan.details.length > 2 && (
                                <p className="text-sm text-muted-foreground text-center">
                                    +{plan.details.length - 2} more items
                                </p>
                            )}
                        </div>

                        <div className="mt-3">
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-muted-foreground">Completion</span>
                                <span className="font-medium">{getCompletionPercentage(plan)}%</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-orange-500 to-amber-600 transition-all"
                                    style={{ width: `${getCompletionPercentage(plan)}%` }}
                                />
                            </div>
                        </div>
                    </motion.div>
                ))
            )}
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => navigate('/manager/production/batches')} variant="outline">
                        <Package className="w-4 h-4 mr-2" />
                        View Batches
                    </Button>
                    <Button
                        className="bg-gradient-to-r from-orange-600 to-amber-600"
                        onClick={openCreateModal}
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        New Plan
                    </Button>
                </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Today's Schedule</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className="grid w-full grid-cols-4">
                                <TabsTrigger value="all">All</TabsTrigger>
                                <TabsTrigger value="pending">Planned</TabsTrigger>
                                <TabsTrigger value="in-progress">In Progress</TabsTrigger>
                                <TabsTrigger value="completed">Completed</TabsTrigger>
                            </TabsList>
                            <TabsContent value="all">
                                {renderPlanList(filterPlans('all'))}
                            </TabsContent>
                            <TabsContent value="pending">
                                {renderPlanList(filterPlans('pending'))}
                            </TabsContent>
                            <TabsContent value="in-progress">
                                {renderPlanList(filterPlans('in-progress'))}
                            </TabsContent>
                            <TabsContent value="completed">
                                {renderPlanList(filterPlans('completed'))}
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle>Calendar</CardTitle>
                        </CardHeader>
                        <CardContent className="p-2 sm:p-4">
                            <Calendar
                                mode="single"
                                selected={date}
                                onSelect={setDate}
                                className="rounded-md border"
                            />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Production Stats</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <div className="flex justify-between mb-2">
                                    <span className="text-sm text-muted-foreground">Today's Plans</span>
                                    <span className="font-medium">{stats.total} plans</span>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between mb-2">
                                    <span className="text-sm text-muted-foreground">Today's Target</span>
                                    <span className="font-medium text-orange-500">{stats.totalUnits} units</span>
                                </div>
                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-orange-500 to-amber-600"
                                        style={{ width: stats.total > 0 ? `${(stats.completed / stats.total) * 100}%` : '0%' }}
                                    />
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between mb-2">
                                    <span className="text-sm text-muted-foreground">Completed</span>
                                    <span className="font-medium text-green-600">{stats.completed} / {stats.total}</span>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between mb-2">
                                    <span className="text-sm text-muted-foreground">In Progress</span>
                                    <span className="font-medium text-orange-500">{stats.inProgress}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Create Production Plan Modal */}
            <Modal
                isOpen={isCreateModalOpen}
                onClose={closeCreateModal}
                title="Create Production Plan"
                description="Schedule a new production plan"
                size="lg"
                footer={
                    <>
                        <Button variant="outline" onClick={closeCreateModal}>
                            Cancel
                        </Button>
                        <Button
                            className="bg-gradient-to-r from-orange-600 to-amber-600"
                            onClick={handleCreatePlan}
                            disabled={createLoading || !planCode || planDetails.length === 0}
                        >
                            {createLoading ? 'Creating...' : 'Create Plan'}
                        </Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium mb-1 block">Plan Code *</label>
                        <Input
                            placeholder="e.g. PLAN-20260202-001"
                            value={planCode}
                            onChange={(e) => setPlanCode(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium mb-1 block">Plan Date</label>
                        <Input
                            type="date"
                            value={planDate}
                            onChange={(e) => setPlanDate(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium mb-1 block">Note (Optional)</label>
                        <textarea
                            className="flex min-h-[80px] w-full rounded-xl border border-input bg-white/60 dark:bg-white/5 px-4 py-2 text-base"
                            placeholder="Add notes about this production plan..."
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                        />
                    </div>

                    <div className="border-t pt-4">
                        <h4 className="font-medium mb-3">Products to Produce</h4>

                        {/* Add Product Form */}
                        <div className="flex gap-2 mb-4">
                            <div className="flex-1">
                                <Select
                                    value={selectedProduct}
                                    onValueChange={setSelectedProduct}
                                >
                                    <SelectTrigger className="h-10">
                                        <SelectValue placeholder="Select Product" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {products.map((product) => (
                                            <SelectItem key={product._id} value={product._id}>
                                                {product.name} ({product.sku})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <Input
                                type="number"
                                min={1}
                                className="w-24 h-10"
                                placeholder="Qty"
                                value={selectedQuantity}
                                onChange={(e) => setSelectedQuantity(parseInt(e.target.value) || 0)}
                            />
                            <Button
                                type="button"
                                variant="outline"
                                onClick={addProductToPlan}
                                disabled={!selectedProduct || selectedQuantity <= 0}
                            >
                                <Plus className="w-4 h-4" />
                            </Button>
                        </div>

                        {/* Selected Products List */}
                        {planDetails.length > 0 ? (
                            <div className="space-y-2">
                                {planDetails.map((item, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                                    >
                                        <div>
                                            <p className="font-medium">{item.productName}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {item.plannedQuantity} units
                                            </p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-red-500 hover:text-red-600"
                                            onClick={() => removeProductFromPlan(index)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">
                                No products added yet. Add at least one product to create a plan.
                            </p>
                        )}
                    </div>
                </div>
            </Modal>
        </div>
    );
}

export default ProductionPlansPage;
