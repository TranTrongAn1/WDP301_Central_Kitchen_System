import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UtensilsCrossed, Plus, Search, Loader2, RefreshCcw, Package, Eye, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { ErrorState } from '../components/ui/ErrorState';
import { EmptyState } from '../components/ui/EmptyState';
import { productApi } from '@/api/ProductApi';
import { categoryApi, type Category } from '@/api/CategoryApi';
import type { Product } from '@/api/ProductApi';

const ProductsRecipesPage = () => {
    const navigate = useNavigate();
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [categoryLoading, setCategoryLoading] = useState(false);

    const fetchProducts = async () => {
        try {
            setLoading(true);
            setError(null);
            const params = selectedCategory ? { categoryId: selectedCategory } : undefined;
            const response = await productApi.getAll(params);
            const data = (response as any)?.data || response || [];
            setProducts(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error fetching products:', err);
            setError('Failed to load products');
        } finally {
            setLoading(false);
        }
    };

    const fetchCategories = async () => {
        try {
            setCategoryLoading(true);
            const response = await categoryApi.getAll();
            const data = (response as any)?.data || response || [];
            setCategories(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error fetching categories:', err);
        } finally {
            setCategoryLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    useEffect(() => {
        fetchProducts();
    }, [selectedCategory]);

    const filteredProducts = products.filter(product =>
        product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getCategoryName = (product: Product) => {
        if (typeof product.categoryId === 'string') return 'Uncategorized';
        return product.categoryId?.name || 'Uncategorized';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                <span className="ml-2 text-muted-foreground">Loading products...</span>
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
                            title="Failed to Load Products"
                            message={error}
                            onRetry={fetchProducts}
                        />
                    </CardContent>
                </Card>
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
                        Add Product
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-orange-100 dark:bg-orange-900/30">
                                <UtensilsCrossed className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Total Products</p>
                                <p className="text-2xl font-bold">{products.length}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/30">
                                <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">With Recipes</p>
                                <p className="text-2xl font-bold">{products.filter(p => p.recipe && p.recipe.length > 0).length}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-purple-100 dark:bg-purple-900/30">
                                <Package className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Bundle Products</p>
                                <p className="text-2xl font-bold">{products.filter(p => p.bundleItems && p.bundleItems.length > 0).length}</p>
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
                                placeholder="Search products by name or SKU..."
                                className="pl-10"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="relative min-w-[180px]">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <select
                                className="flex h-10 w-full rounded-xl border border-input bg-white/60 dark:bg-white/5 backdrop-blur-sm px-4 py-2 pl-10 text-base appearance-none cursor-pointer"
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                            >
                                <option value="">All Categories</option>
                                {categories.map((cat) => (
                                    <option key={cat._id} value={cat._id}>
                                        {cat.categoryName}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {filteredProducts.length === 0 ? (
                        <EmptyState
                            icon={UtensilsCrossed}
                            title="No Products Found"
                            message={searchQuery ? 'Try a different search term' : 'Add your first product to get started'}
                            actionLabel={!searchQuery ? "Add Product" : undefined}
                            onAction={!searchQuery ? () => { } : undefined}
                        />
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {filteredProducts.map((product) => (
                                <motion.div
                                    key={product._id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="p-4 rounded-xl bg-muted/50 hover:bg-muted transition-all hover:shadow-md group cursor-pointer"
                                    onClick={() => navigate(`/manager/products/${product._id}`)}
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            {product.image ? (
                                                <img
                                                    src={product.image}
                                                    alt={product.name}
                                                    className="w-12 h-12 rounded-lg object-cover"
                                                />
                                            ) : (
                                                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center">
                                                    <UtensilsCrossed className="w-6 h-6 text-white" />
                                                </div>
                                            )}
                                            <div>
                                                <h4 className="font-semibold">{product.name}</h4>
                                                <p className="text-sm text-muted-foreground">{product.sku}</p>
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigate(`/manager/products/${product._id}`);
                                            }}
                                        >
                                            <Eye className="w-4 h-4" />
                                        </Button>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">Category</span>
                                            <Badge variant="outline">{getCategoryName(product)}</Badge>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">Price</span>
                                            <span className="font-semibold text-orange-500">
                                                {product.price?.toLocaleString()}đ
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">Shelf Life</span>
                                            <span>{product.shelfLifeDays} days</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">Recipe</span>
                                            <span>{product.recipe?.length || 0} ingredients</span>
                                        </div>
                                    </div>

                                    {product.bundleItems && product.bundleItems.length > 0 && (
                                        <div className="mt-3 pt-3 border-t">
                                            <Badge variant="secondary" className="w-full justify-center">
                                                Bundle: {product.bundleItems.length} items
                                            </Badge>
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default ProductsRecipesPage;
