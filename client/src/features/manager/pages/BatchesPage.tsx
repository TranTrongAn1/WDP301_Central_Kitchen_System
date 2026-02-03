import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Package, Search, Loader2, RefreshCcw, ArrowLeft,
    AlertTriangle, Clock, CheckCircle2, XCircle, Filter, Eye
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/Tabs';
import { ErrorState } from '../components/ui/ErrorState';
import { EmptyState } from '../components/ui/EmptyState';
import { batchApi } from '@/api/BatchApi';
import { productApi } from '@/api/ProductApi';
import type { Batch } from '@/api/BatchApi';
import type { Product } from '@/api/ProductApi';

const BatchesPage = () => {
    const navigate = useNavigate();
    const [batches, setBatches] = useState<Batch[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedProduct, setSelectedProduct] = useState<string>('');
    const [activeTab, setActiveTab] = useState('all');

    const fetchBatches = async () => {
        try {
            setLoading(true);
            setError(null);
            const params = selectedProduct ? { productId: selectedProduct } : undefined;
            const response = await batchApi.getAll(params);
            const data = (response as any)?.data || response || [];
            setBatches(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error fetching batches:', err);
            setError('Failed to load batches');
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
        fetchProducts();
    }, []);

    useEffect(() => {
        fetchBatches();
    }, [selectedProduct]);

    const getStatusBadge = (status: string) => {
        const configs: Record<string, { className: string; icon: React.ReactNode }> = {
            Active: { className: 'bg-green-500 text-white', icon: <CheckCircle2 className="w-3 h-3 mr-1" /> },
            SoldOut: { className: 'bg-gray-500 text-white', icon: <Package className="w-3 h-3 mr-1" /> },
            Expired: { className: 'bg-red-500 text-white', icon: <XCircle className="w-3 h-3 mr-1" /> },
            Recalled: { className: 'bg-orange-500 text-white', icon: <AlertTriangle className="w-3 h-3 mr-1" /> },
        };
        const config = configs[status] || configs.Active;
        return (
            <Badge className={config.className}>
                {config.icon}
                {status}
            </Badge>
        );
    };

    const getProductName = (batch: Batch) => {
        if (typeof batch.productId === 'string') return 'Unknown Product';
        return batch.productId?.name || 'Unknown Product';
    };

    const getProductSku = (batch: Batch) => {
        if (typeof batch.productId === 'string') return batch.productId;
        return batch.productId?.sku || '';
    };

    const getDaysUntilExpiry = (expDate: string) => {
        const exp = new Date(expDate);
        const now = new Date();
        const diffTime = exp.getTime() - now.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    const filterBatches = (tab: string) => {
        let filtered = batches;

        if (searchQuery) {
            filtered = filtered.filter(batch =>
                batch.batchCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
                getProductName(batch).toLowerCase().includes(searchQuery.toLowerCase()) ||
                getProductSku(batch).toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        if (tab === 'all') return filtered;
        if (tab === 'expiring') {
            return filtered.filter(b => getDaysUntilExpiry(b.expDate) <= 7 && b.status === 'Active');
        }
        return filtered.filter(b => b.status === tab);
    };

    const stats = {
        total: batches.length,
        active: batches.filter(b => b.status === 'Active').length,
        expiring: batches.filter(b => getDaysUntilExpiry(b.expDate) <= 7 && b.status === 'Active').length,
        totalQuantity: batches.reduce((sum, b) => sum + b.currentQuantity, 0),
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                <span className="ml-2 text-muted-foreground">Loading batches...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-6">
                <Button variant="outline" onClick={() => navigate('/manager/production')}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Production
                </Button>
                <Card>
                    <CardContent className="p-6">
                        <ErrorState title="Failed to Load Batches" message={error} onRetry={fetchBatches} />
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="outline" onClick={() => navigate('/manager/production')}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                    </Button>
                    <div>
                        <p className="text-muted-foreground">Manage finished product batches</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                                <Package className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Total Batches</p>
                                <p className="text-xl font-bold">{stats.total}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Active</p>
                                <p className="text-xl font-bold text-green-600">{stats.active}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                                <AlertTriangle className="w-5 h-5 text-orange-600" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Expiring Soon</p>
                                <p className="text-xl font-bold text-orange-600">{stats.expiring}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                                <Package className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Total Units</p>
                                <p className="text-xl font-bold">{stats.totalQuantity}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by batch code, product name, or SKU..."
                                className="pl-10"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="relative min-w-[180px]">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <select
                                className="flex h-10 w-full rounded-xl border border-input bg-white/60 dark:bg-white/5 backdrop-blur-sm px-4 py-2 pl-10 text-base appearance-none cursor-pointer"
                                value={selectedProduct}
                                onChange={(e) => setSelectedProduct(e.target.value)}
                            >
                                <option value="">All Products</option>
                                {products.map((product) => (
                                    <option key={product._id} value={product._id}>
                                        {product.name} ({product.sku})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-4">
                            <TabsTrigger value="all">All ({stats.total})</TabsTrigger>
                            <TabsTrigger value="Active">Active ({stats.active})</TabsTrigger>
                            <TabsTrigger value="expiring">Expiring ({stats.expiring})</TabsTrigger>
                            <TabsTrigger value="SoldOut">Sold Out</TabsTrigger>
                        </TabsList>

                        {['all', 'Active', 'expiring', 'SoldOut'].map(tab => (
                            <TabsContent key={tab} value={tab}>
                                {filterBatches(tab).length === 0 ? (
                                    <EmptyState
                                        icon={Package}
                                        title="No Batches Found"
                                        message={searchQuery ? 'Try a different search term' : 'No batches in this category'}
                                    />
                                ) : (
                                    <div className="space-y-3 mt-4">
                                        {filterBatches(tab).map((batch) => {
                                            const daysUntilExpiry = getDaysUntilExpiry(batch.expDate);
                                            const isExpiringSoon = daysUntilExpiry <= 7 && daysUntilExpiry > 0;
                                            const isExpired = daysUntilExpiry <= 0;
                                            const stockPercentage = batch.initialQuantity > 0
                                                ? Math.round((batch.currentQuantity / batch.initialQuantity) * 100)
                                                : 0;

                                            return (
                                                <motion.div
                                                    key={batch._id}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className={`p-4 rounded-xl border transition-colors ${isExpired ? 'bg-red-50 dark:bg-red-900/20 border-red-200' :
                                                        isExpiringSoon ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200' :
                                                            'bg-muted/50 border-transparent hover:bg-muted'
                                                        }`}
                                                >
                                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${batch.status === 'Active' ? 'bg-gradient-to-br from-orange-400 to-amber-500' :
                                                                'bg-gray-400'
                                                                }`}>
                                                                <Package className="w-6 h-6 text-white" />
                                                            </div>
                                                            <div>
                                                                <h4 className="font-semibold">{batch.batchCode}</h4>
                                                                <p className="text-sm text-muted-foreground">
                                                                    {getProductName(batch)} • {getProductSku(batch)}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {getStatusBadge(batch.status)}
                                                            {isExpiringSoon && !isExpired && (
                                                                <Badge className="bg-orange-500 text-white">
                                                                    <Clock className="w-3 h-3 mr-1" />
                                                                    {daysUntilExpiry}d left
                                                                </Badge>
                                                            )}
                                                            {isExpired && (
                                                                <Badge className="bg-red-500 text-white">
                                                                    <XCircle className="w-3 h-3 mr-1" />
                                                                    Expired
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-4 text-sm">
                                                        <div>
                                                            <p className="text-muted-foreground">Initial</p>
                                                            <p className="font-semibold">{batch.initialQuantity}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-muted-foreground">Current</p>
                                                            <p className="font-semibold text-orange-500">{batch.currentQuantity}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-muted-foreground">MFG Date</p>
                                                            <p className="font-semibold">{new Date(batch.mfgDate).toLocaleDateString()}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-muted-foreground">EXP Date</p>
                                                            <p className={`font-semibold ${isExpired ? 'text-red-500' : isExpiringSoon ? 'text-orange-500' : ''}`}>
                                                                {new Date(batch.expDate).toLocaleDateString()}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-muted-foreground">Stock</p>
                                                            <div className="flex items-center gap-2">
                                                                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                                                    <div
                                                                        className={`h-full ${stockPercentage > 50 ? 'bg-green-500' : stockPercentage > 20 ? 'bg-orange-500' : 'bg-red-500'}`}
                                                                        style={{ width: `${stockPercentage}%` }}
                                                                    />
                                                                </div>
                                                                <span className="text-xs font-medium">{stockPercentage}%</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => navigate(`/manager/production/batches/${batch._id}`)}
                                                                title="View Details"
                                                            >
                                                                <Eye className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                )}
                            </TabsContent>
                        ))}
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
};

export default BatchesPage;
