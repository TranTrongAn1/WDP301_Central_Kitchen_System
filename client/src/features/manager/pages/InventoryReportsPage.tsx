import { useState, useEffect } from 'react';
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

const InventoryReportsPage = () => {
    const [activeTab, setActiveTab] = useState('materials');
    const [ingredients, setIngredients] = useState<Ingredient[]>([]);
    const [batches, setBatches] = useState<Batch[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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
                    <Button className="bg-gradient-to-r from-orange-600 to-amber-600">
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
                                    {ingredients.map((ing) => {
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
                                    {batches.map((batch) => {
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
        </div>
    );
};

export default InventoryReportsPage;
