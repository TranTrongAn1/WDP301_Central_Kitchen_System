import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Package, AlertTriangle, TrendingUp, Loader2, Plus, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/Tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ingredientApi } from '@/api/InventoryApi';
import type { Ingredient } from '@/api/InventoryApi';
import { batchApi } from '@/api/BatchApi';
import type { Batch } from '@/api/BatchApi';
import { productApi } from '@/api/ProductApi';
import type { Product } from '@/api/ProductApi';
import { supplierApi, type Supplier } from '@/api/SupplierApi';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select';

const InventoryReportsPage = () => {
    const [activeTab, setActiveTab] = useState('materials');
    const [ingredients, setIngredients] = useState<Ingredient[]>([]);
    const [batches, setBatches] = useState<Batch[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Import Stock modal (ingredient batches)
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [importLoading, setImportLoading] = useState(false);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [importIngredientId, setImportIngredientId] = useState('');
    const [importSupplierId, setImportSupplierId] = useState('');
    const [importBatchCode, setImportBatchCode] = useState('');
    const [importReceivedDate, setImportReceivedDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [importExpiryDate, setImportExpiryDate] = useState('');
    const [importInitialQty, setImportInitialQty] = useState<number>(1);
    const [importPrice, setImportPrice] = useState<number>(0);

    const ITEMS_PER_PAGE_MATERIALS = 8;
    const ITEMS_PER_PAGE_BATCHES = 8;
    const [materialsPage, setMaterialsPage] = useState(1);
    const [batchesPage, setBatchesPage] = useState(1);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);

            const [ingredientRes, batchRes, productRes] = await Promise.all([
                ingredientApi.getAll(),
                batchApi.getAll(selectedProduct ? { productId: selectedProduct } : undefined),
                productApi.getAll()
            ]);

            // Handle response format
            const ingredientData = (ingredientRes as any)?.data || ingredientRes || [];
            const batchData = (batchRes as any)?.data || batchRes || [];
            const productData = (productRes as any)?.data || productRes || [];

            setIngredients(Array.isArray(ingredientData) ? ingredientData : []);
            setBatches(Array.isArray(batchData) ? batchData : []);
            setProducts(Array.isArray(productData) ? productData : []);
        } catch (err) {
            console.error('Error fetching inventory data:', err);
            setError('Failed to load inventory data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [selectedProduct]);

    const resetImportForm = () => {
        setImportIngredientId('');
        setImportSupplierId('');
        setImportBatchCode('');
        setImportReceivedDate(new Date().toISOString().slice(0, 10));
        setImportExpiryDate('');
        setImportInitialQty(1);
        setImportPrice(0);
    };

    const openImportModal = async () => {
        setIsImportOpen(true);
        if (suppliers.length === 0) {
            try {
                const res = await supplierApi.getAll();
                const data = (res as any)?.data?.data ?? (res as any)?.data ?? [];
                setSuppliers(Array.isArray(data) ? data : []);
            } catch {
                setSuppliers([]);
            }
        }
    };

    const closeImportModal = () => {
        setIsImportOpen(false);
        resetImportForm();
    };

    const handleImport = async () => {
        if (!importIngredientId || !importSupplierId || !importBatchCode.trim() || !importExpiryDate || importInitialQty <= 0) return;
        try {
            setImportLoading(true);
            await (ingredientApi as any).addBatch(importIngredientId, {
                batchCode: importBatchCode.trim(),
                supplierId: importSupplierId,
                expiryDate: new Date(importExpiryDate).toISOString(),
                receivedDate: new Date(importReceivedDate).toISOString(),
                initialQuantity: Number(importInitialQty) || 0,
                price: Number(importPrice) || 0,
            });
            closeImportModal();
            fetchData();
        } catch (e) {
            console.error('Import stock failed', e);
            setError('Import stock failed. Please check inputs and try again.');
        } finally {
            setImportLoading(false);
        }
    };

    // Stats
    const lowStockCount = ingredients.filter(i => i.isBelowThreshold).length;
    const activeBatches = batches.filter(b => b.status === 'Active').length;
    const expiringSoon = batches.filter(b => {
        const expDate = new Date(b.expDate);
        const now = new Date();
        const daysUntilExp = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return daysUntilExp <= 7 && daysUntilExp > 0;
    }).length;

    // Chart data - consumption by ingredient
    const chartData = ingredients.slice(0, 6).map(ing => ({
        name: ing.ingredientName?.substring(0, 10) || 'Unknown',
        quantity: ing.totalQuantity || 0,
        threshold: ing.warningThreshold || 0,
    }));

    const getStockLevel = (ingredient: Ingredient) => {
        const ratio = ingredient.totalQuantity / ingredient.warningThreshold;
        if (ratio < 1) return { level: 'Low', color: 'destructive', percentage: Math.min(ratio * 100, 100) };
        if (ratio < 2) return { level: 'Medium', color: 'warning', percentage: 50 + (ratio - 1) * 25 };
        return { level: 'Good', color: 'success', percentage: 100 };
    };

    const getBatchStatus = (batch: Batch) => {
        const expDate = new Date(batch.expDate);
        const now = new Date();
        const daysUntilExp = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (batch.status === 'Expired' || daysUntilExp <= 0) {
            return { status: 'Expired', variant: 'destructive' as const };
        }
        if (daysUntilExp <= 7) {
            return { status: `Expires in ${daysUntilExp}d`, variant: 'warning' as const };
        }
        if (batch.status === 'SoldOut') {
            return { status: 'Sold Out', variant: 'secondary' as const };
        }
        return { status: 'Active', variant: 'success' as const };
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                <span className="ml-2 text-muted-foreground">Loading inventory...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                </div>
                <div className="flex gap-2">
                    <Button className="bg-gradient-to-r from-orange-600 to-amber-600" onClick={openImportModal}>
                        <Plus className="w-4 h-4 mr-2" />
                        Import Stock
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/30">
                                <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Total Ingredients</p>
                                <p className="text-2xl font-bold">{ingredients.length}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-red-100 dark:bg-red-900/30">
                                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Low Stock Items</p>
                                <p className="text-2xl font-bold text-red-600">{lowStockCount}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-green-100 dark:bg-green-900/30">
                                <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Active Batches</p>
                                <p className="text-2xl font-bold text-green-600">{activeBatches}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-orange-100 dark:bg-orange-900/30">
                                <AlertTriangle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Expiring Soon</p>
                                <p className="text-2xl font-bold text-orange-600">{expiringSoon}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {error && (
                <div className="text-center py-4 text-red-500">
                    {error}
                    <Button onClick={fetchData} variant="link" className="ml-2">Retry</Button>
                </div>
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="materials">Raw Materials</TabsTrigger>
                    <TabsTrigger value="ingredient-batches">Ingredient Batches</TabsTrigger>
                    <TabsTrigger value="batches">Production Batches</TabsTrigger>
                    <TabsTrigger value="expiring">Expiring Soon</TabsTrigger>
                    <TabsTrigger value="analytics">Analytics</TabsTrigger>
                </TabsList>

                <TabsContent value="materials" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Raw Materials Inventory</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {ingredients.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    No ingredients found
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {(() => {
                                        const totalPages = Math.ceil(ingredients.length / ITEMS_PER_PAGE_MATERIALS) || 1;
                                        const startIndex = (materialsPage - 1) * ITEMS_PER_PAGE_MATERIALS;
                                        const currentItems = ingredients.slice(startIndex, startIndex + ITEMS_PER_PAGE_MATERIALS);

                                        const getPageNumbers = () => {
                                            const pages: (number | string)[] = [];
                                            if (totalPages <= 7) {
                                                for (let i = 1; i <= totalPages; i++) pages.push(i);
                                            } else if (materialsPage <= 4) {
                                                pages.push(1, 2, 3, 4, 5, '...', totalPages);
                                            } else if (materialsPage >= totalPages - 3) {
                                                pages.push(
                                                    1,
                                                    '...',
                                                    totalPages - 4,
                                                    totalPages - 3,
                                                    totalPages - 2,
                                                    totalPages - 1,
                                                    totalPages
                                                );
                                            } else {
                                                pages.push(
                                                    1,
                                                    '...',
                                                    materialsPage - 1,
                                                    materialsPage,
                                                    materialsPage + 1,
                                                    '...',
                                                    totalPages
                                                );
                                            }
                                            return { pages, totalPages };
                                        };

                                        return (
                                            <>
                                                {currentItems.map((ing) => {
                                        const stock = getStockLevel(ing);
                                        return (
                                            <motion.div
                                                key={ing._id}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <div>
                                                        <h4 className="font-medium">{ing.ingredientName}</h4>
                                                        <p className="text-sm text-muted-foreground">
                                                            Unit: {ing.unit} • Cost: {ing.costPrice?.toLocaleString()}đ
                                                        </p>
                                                    </div>
                                                    <Badge variant={stock.color as any}>{stock.level}</Badge>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="flex-1">
                                                        <div className="flex justify-between text-sm mb-1">
                                                            <span>Stock Level</span>
                                                            <span>{ing.totalQuantity} / {ing.warningThreshold} {ing.unit}</span>
                                                        </div>
                                                        <div className="h-2 bg-background rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full transition-all ${stock.color === 'destructive' ? 'bg-red-500' :
                                                                    stock.color === 'warning' ? 'bg-orange-500' : 'bg-green-500'
                                                                    }`}
                                                                style={{ width: `${stock.percentage}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                                        </motion.div>
                                                    );
                                                })}

                                                {ingredients.length > ITEMS_PER_PAGE_MATERIALS && (
                                                    <div className="mt-4 flex select-none items-center justify-end gap-2">
                                                        {(() => {
                                                            const { pages, totalPages } = getPageNumbers();
                                                            return (
                                                                <>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            if (materialsPage <= 1) return;
                                                                            setMaterialsPage(materialsPage - 1);
                                                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                                                        }}
                                                                        disabled={materialsPage === 1}
                                                                        className="flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary disabled:opacity-30 disabled:hover:bg-transparent"
                                                                    >
                                                                        <span className="material-symbols-outlined text-[18px]">
                                                                            chevron_left
                                                                        </span>
                                                                        Trước
                                                                    </button>
                                                                    <div className="flex items-center gap-1">
                                                                        {pages.map((page, idx) =>
                                                                            page === '...' ? (
                                                                                <span
                                                                                    key={`dots-${idx}`}
                                                                                    className="px-2 text-xs text-muted-foreground"
                                                                                >
                                                                                    ...
                                                                                </span>
                                                                            ) : (
                                                                                <button
                                                                                    key={idx}
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        setMaterialsPage(page as number);
                                                                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                                                                    }}
                                                                                    className={`h-8 min-w-[32px] rounded-lg px-2 text-xs font-semibold transition-all ${
                                                                                        materialsPage === page
                                                                                            ? 'bg-primary text-primary-foreground shadow-sm'
                                                                                            : 'bg-secondary text-muted-foreground hover:bg-primary/10 hover:text-foreground'
                                                                                    }`}
                                                                                >
                                                                                    {page}
                                                                                </button>
                                                                            )
                                                                        )}
                                                                    </div>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            if (materialsPage >= totalPages) return;
                                                                            setMaterialsPage(materialsPage + 1);
                                                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                                                        }}
                                                                        disabled={materialsPage === totalPages}
                                                                        className="flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary disabled:opacity-30 disabled:hover:bg-transparent"
                                                                    >
                                                                        Sau
                                                                        <span className="material-symbols-outlined text-[18px]">
                                                                            chevron_right
                                                                        </span>
                                                                    </button>
                                                                </>
                                                            );
                                                        })()}
                                                    </div>
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="ingredient-batches" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>All Ingredient Batches</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center py-8 text-muted-foreground">
                                <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p>Ingredient batch management coming soon</p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="expiring" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Items Expiring Soon</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center py-8 text-muted-foreground">
                                <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p>Expiring items tracking coming soon</p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="batches" className="mt-6">
                    <Card>
                        <CardHeader>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <CardTitle>Production Batches</CardTitle>
                                <div className="relative min-w-[180px]">
                                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <select
                                        className="flex h-9 w-full rounded-lg border border-input bg-white/60 dark:bg-white/5 px-4 py-2 pl-9 text-sm appearance-none cursor-pointer"
                                        value={selectedProduct}
                                        onChange={(e) => setSelectedProduct(e.target.value)}
                                    >
                                        <option value="">All Products</option>
                                        {products.map((product) => (
                                            <option key={product._id} value={product._id}>
                                                {product.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {batches.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    No batches found
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {(() => {
                                        const totalPages = Math.ceil(batches.length / ITEMS_PER_PAGE_BATCHES) || 1;
                                        const startIndex = (batchesPage - 1) * ITEMS_PER_PAGE_BATCHES;
                                        const currentItems = batches.slice(startIndex, startIndex + ITEMS_PER_PAGE_BATCHES);

                                        const getPageNumbers = () => {
                                            const pages: (number | string)[] = [];
                                            if (totalPages <= 7) {
                                                for (let i = 1; i <= totalPages; i++) pages.push(i);
                                            } else if (batchesPage <= 4) {
                                                pages.push(1, 2, 3, 4, 5, '...', totalPages);
                                            } else if (batchesPage >= totalPages - 3) {
                                                pages.push(
                                                    1,
                                                    '...',
                                                    totalPages - 4,
                                                    totalPages - 3,
                                                    totalPages - 2,
                                                    totalPages - 1,
                                                    totalPages
                                                );
                                            } else {
                                                pages.push(
                                                    1,
                                                    '...',
                                                    batchesPage - 1,
                                                    batchesPage,
                                                    batchesPage + 1,
                                                    '...',
                                                    totalPages
                                                );
                                            }
                                            return { pages, totalPages };
                                        };

                                        return (
                                            <>
                                                {currentItems.map((batch) => {
                                        const status = getBatchStatus(batch);
                                        const productName = typeof batch.productId === 'string'
                                            ? 'Product'
                                            : batch.productId?.name || 'Unknown';
                                        return (
                                            <motion.div
                                                key={batch._id}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <h4 className="font-medium">{batch.batchCode}</h4>
                                                        <p className="text-sm text-muted-foreground">
                                                            {productName}
                                                        </p>
                                                    </div>
                                                    <Badge variant={status.variant}>{status.status}</Badge>
                                                </div>
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-3 text-sm">
                                                    <div>
                                                        <p className="text-muted-foreground">Quantity</p>
                                                        <p className="font-medium">{batch.currentQuantity} / {batch.initialQuantity}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-muted-foreground">MFG Date</p>
                                                        <p className="font-medium">{new Date(batch.mfgDate).toLocaleDateString()}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-muted-foreground">EXP Date</p>
                                                        <p className="font-medium">{new Date(batch.expDate).toLocaleDateString()}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-muted-foreground">Status</p>
                                                        <p className="font-medium">{batch.status}</p>
                                                    </div>
                                                    </div>
                                                </motion.div>
                                            );
                                        })}

                                                {batches.length > ITEMS_PER_PAGE_BATCHES && (
                                                    <div className="mt-4 flex select-none items-center justify-end gap-2">
                                                        {(() => {
                                                            const { pages, totalPages } = getPageNumbers();
                                                            return (
                                                                <>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            if (batchesPage <= 1) return;
                                                                            setBatchesPage(batchesPage - 1);
                                                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                                                        }}
                                                                        disabled={batchesPage === 1}
                                                                        className="flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary disabled:opacity-30 disabled:hover:bg-transparent"
                                                                    >
                                                                        <span className="material-symbols-outlined text-[18px]">
                                                                            chevron_left
                                                                        </span>
                                                                        Trước
                                                                    </button>
                                                                    <div className="flex items-center gap-1">
                                                                        {pages.map((page, idx) =>
                                                                            page === '...' ? (
                                                                                <span
                                                                                    key={`dots-${idx}`}
                                                                                    className="px-2 text-xs text-muted-foreground"
                                                                                >
                                                                                    ...
                                                                                </span>
                                                                            ) : (
                                                                                <button
                                                                                    key={idx}
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        setBatchesPage(page as number);
                                                                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                                                                    }}
                                                                                    className={`h-8 min-w-[32px] rounded-lg px-2 text-xs font-semibold transition-all ${
                                                                                        batchesPage === page
                                                                                            ? 'bg-primary text-primary-foreground shadow-sm'
                                                                                            : 'bg-secondary text-muted-foreground hover:bg-primary/10 hover:text-foreground'
                                                                                    }`}
                                                                                >
                                                                                    {page}
                                                                                </button>
                                                                            )
                                                                        )}
                                                                    </div>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            if (batchesPage >= totalPages) return;
                                                                            setBatchesPage(batchesPage + 1);
                                                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                                                        }}
                                                                        disabled={batchesPage === totalPages}
                                                                        className="flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary disabled:opacity-30 disabled:hover:bg-transparent"
                                                                    >
                                                                        Sau
                                                                        <span className="material-symbols-outlined text-[18px]">
                                                                            chevron_right
                                                                        </span>
                                                                    </button>
                                                                </>
                                                            );
                                                        })()}
                                                    </div>
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="analytics" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Stock Levels by Ingredient</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                        <XAxis dataKey="name" className="text-xs" />
                                        <YAxis className="text-xs" />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: 'hsl(var(--card))',
                                                border: '1px solid hsl(var(--border))',
                                                borderRadius: '8px'
                                            }}
                                        />
                                        <Bar
                                            dataKey="quantity"
                                            fill="hsl(24, 95%, 53%)"
                                            radius={[4, 4, 0, 0]}
                                            name="Current Stock"
                                        />
                                        <Bar
                                            dataKey="threshold"
                                            fill="hsl(0, 84%, 60%)"
                                            radius={[4, 4, 0, 0]}
                                            name="Warning Threshold"
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <Modal
                isOpen={isImportOpen}
                onClose={closeImportModal}
                title="Import Stock"
                description="Nhập kho nguyên liệu (tạo lô nguyên liệu mới)"
                size="lg"
                footer={
                    <>
                        <Button variant="outline" onClick={closeImportModal} disabled={importLoading}>
                            Cancel
                        </Button>
                        <Button
                            className="bg-gradient-to-r from-orange-600 to-amber-600"
                            onClick={handleImport}
                            isLoading={importLoading}
                            disabled={
                                importLoading ||
                                !importIngredientId ||
                                !importSupplierId ||
                                !importBatchCode.trim() ||
                                !importExpiryDate ||
                                importInitialQty <= 0
                            }
                        >
                            Import
                        </Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Nguyên liệu *</label>
                            <Select value={importIngredientId} onValueChange={setImportIngredientId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Chọn nguyên liệu" />
                                </SelectTrigger>
                                <SelectContent>
                                    {ingredients.map((ing) => (
                                        <SelectItem key={ing._id} value={ing._id}>
                                            {ing.ingredientName} ({ing.unit})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Nhà cung cấp *</label>
                            <Select value={importSupplierId} onValueChange={setImportSupplierId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Chọn nhà cung cấp" />
                                </SelectTrigger>
                                <SelectContent>
                                    {suppliers.map((s) => (
                                        <SelectItem key={s._id} value={s._id}>
                                            {s.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Mã lô *</label>
                            <Input
                                placeholder="VD: ING-20260228-001"
                                value={importBatchCode}
                                onChange={(e) => setImportBatchCode(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Giá nhập</label>
                            <Input
                                type="number"
                                min={0}
                                value={importPrice}
                                onChange={(e) => setImportPrice(Number(e.target.value) || 0)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Ngày nhận</label>
                            <Input
                                type="date"
                                value={importReceivedDate}
                                onChange={(e) => setImportReceivedDate(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Hạn sử dụng *</label>
                            <Input
                                type="date"
                                value={importExpiryDate}
                                onChange={(e) => setImportExpiryDate(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Số lượng nhập *</label>
                            <Input
                                type="number"
                                min={1}
                                value={importInitialQty}
                                onChange={(e) => setImportInitialQty(Number(e.target.value) || 0)}
                            />
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default InventoryReportsPage;
