import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UtensilsCrossed, Plus, Search, Loader2, Package, Eye, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { ErrorState } from '../components/ui/ErrorState';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { productApi } from '@/api/ProductApi';
import { categoryApi, type Category } from '@/api/CategoryApi';
import type { Product, CreateProductRequest } from '@/api/ProductApi';
import { useManagerReadOnly } from '@/shared/hooks/useManagerReadOnly';
import { useAuthStore } from '@/shared/zustand/authStore';
import { uploadProductImage } from '@/shared/lib/firebase';
import toast from 'react-hot-toast';
import { ingredientApi, type Ingredient } from '@/api/InventoryApi';
import { Trash2 } from 'lucide-react';
const ProductsRecipesPage = () => {
    const navigate = useNavigate();
    const { isManagerReadOnly } = useManagerReadOnly();
    const { user } = useAuthStore();
    const isAdmin = user?.role === 'Admin';
    const productsBasePath = isAdmin ? '/admin/products' : '/manager/products';
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [_categoryLoading, setCategoryLoading] = useState(false);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [createLoading, setCreateLoading] = useState(false);
    const [createForm, setCreateForm] = useState<CreateProductRequest>({
        name: '',
        sku: '',
        categoryId: '',
        price: 0,
        shelfLifeDays: 1,
        weight: 0.5,
        weightUnit: 'kg',
        image: undefined,
    });
    const [createImageFile, setCreateImageFile] = useState<File | null>(null);
    
    // 👇 THÊM STATE NÀY
    const [allIngredients, setAllIngredients] = useState<Ingredient[]>([]);

    // 👇 THÊM HÀM NÀY
    const fetchIngredients = async () => {
        try {
            const response = await ingredientApi.getAll();
            const data = (response as any)?.data || response || [];
            setAllIngredients(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error fetching ingredients:', err);
        }
    };
    const ITEMS_PER_PAGE = 9;
    const [currentPage, setCurrentPage] = useState(1);

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
            setError('Không thể tải danh sách sản phẩm');
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
        fetchIngredients();
    }, []);

    useEffect(() => {
        fetchProducts();
    }, [selectedCategory]);

    const filteredProducts = products.filter(product =>
        product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE) || 1;
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const currentProducts = filteredProducts.slice(
        startIndex,
        startIndex + ITEMS_PER_PAGE
    );

    const handlePageChange = (next: number) => {
        if (next < 1 || next > totalPages) return;
        setCurrentPage(next);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const getPageNumbers = () => {
        const pages: (number | string)[] = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else if (currentPage <= 4) {
            pages.push(1, 2, 3, 4, 5, '...', totalPages);
        } else if (currentPage >= totalPages - 3) {
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
                currentPage - 1,
                currentPage,
                currentPage + 1,
                '...',
                totalPages
            );
        }
        return pages;
    };

    const getCategoryName = (product: Product) => {
    if (typeof product.categoryId === 'string') return 'Chưa phân loại';
    return product.categoryId?.name || 'Chưa phân loại';
    };

const openCreate = () => {
        if (isManagerReadOnly) return;
        setCreateForm({
            name: '',
            sku: '',
            categoryId: categories[0]?._id || '',
            price: 0,
            shelfLifeDays: 1,
            weight: 0.5,
            weightUnit: 'kg',
            image: undefined,
            recipe: [], // 👇 THÊM DÒNG NÀY VÀO
        } as any); // Thêm "as any" nếu TypeScript báo lỗi kiểu CreateProductRequest
        setCreateImageFile(null);
        setIsCreateOpen(true);
    };

const handleCreate = async () => {
        if (isManagerReadOnly) return;

        // --- BẮT ĐẦU VALIDATION ---
        const name = createForm.name.trim();
        const sku = createForm.sku.trim();

        if (!name || name.length < 2 || name.length > 100) {
            toast.error('Tên sản phẩm bắt buộc phải có và từ 2 đến 100 ký tự.');
            return;
        }
        if (!sku || sku.length < 3 || sku.length > 50) {
            toast.error('Mã SKU bắt buộc phải có và từ 3 đến 50 ký tự.');
            return;
        }
        // Validate khoảng trắng trong SKU (SKU không nên có dấu cách)
        if (/\s/.test(sku)) {
            toast.error('Mã SKU không được chứa khoảng trắng.');
            return;
        }
        if (!createForm.categoryId) {
            toast.error('Vui lòng chọn danh mục sản phẩm.');
            return;
        }
        if (createForm.price < 0 || createForm.price > 500000000) {
            toast.error('Giá sản phẩm không hợp lệ (Phải từ 0đ - 500.000.000đ).');
            return;
        }
        if (createForm.shelfLifeDays < 1 || createForm.shelfLifeDays > 3650) {
            toast.error('Hạn sử dụng không hợp lệ (Phải từ 1 ngày - 3650 ngày).');
            return;
        }
        if ((createForm.weight ?? 0) <= 0 || (createForm.weight ?? 0) > 1000) {
            toast.error('Khối lượng sản phẩm phải lớn hơn 0 và tối đa 1000kg.');
            return;
        }
        // --- KẾT THÚC VALIDATION ---
    
        try {
            setCreateLoading(true);
            let imageUrl: string | undefined = undefined;
            if (createImageFile) {
                imageUrl = await uploadProductImage(createImageFile);
            }
            
            // 👇 LỌC BỎ NGUYÊN LIỆU TRỐNG HOẶC SỐ LƯỢNG = 0
            const cleanedRecipe = (createForm as any).recipe?.filter((r: any) => r.ingredientId && r.quantity > 0) || [];

            const payload: any = { // Dùng any tạm nếu type chưa update
                ...createForm,
                name: name,
                sku: sku.toUpperCase(),
                price: Number(createForm.price) || 0,
                shelfLifeDays: Number(createForm.shelfLifeDays) || 1,
                weight: createForm.weight != null ? Number(createForm.weight) || 0.5 : 0.5,
                weightUnit: createForm.weightUnit || 'kg',
                image: imageUrl,
                recipe: cleanedRecipe, // 👇 THÊM VÀO PAYLOAD Ở ĐÂY
            };
            await productApi.create(payload);
            toast.success('Đã tạo sản phẩm.');
            setIsCreateOpen(false);
            await fetchProducts();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Không tạo được sản phẩm.');
        } finally {
            setCreateLoading(false);
        }
    };
    if (loading) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                <span className="ml-2 text-muted-foreground">Đang tải danh sách sản phẩm...</span>
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
                            title="Không thể tải danh sách sản phẩm"
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
                    <Button
                        className="bg-gradient-to-r from-orange-600 to-amber-600"
                        disabled={isManagerReadOnly}
                        onClick={openCreate}
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Thêm sản phẩm
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
                                <p className="text-sm text-muted-foreground">Tổng số sản phẩm</p>
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
                                <p className="text-sm text-muted-foreground">Có công thức</p>
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
                                <p className="text-sm text-muted-foreground">Sản phẩm gộp</p>
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
                                placeholder="Tìm kiếm theo tên hoặc SKU..."
                                className="pl-10"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="relative min-w-[200px]">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <select
                                className="flex h-10 w-full rounded-xl border border-input bg-background text-foreground dark:bg-neutral-900 dark:text-foreground px-4 py-2 pl-10 text-sm appearance-none cursor-pointer shadow-sm"
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                            >
                                <option value="">Tất cả danh mục</option>
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
                            title="Không tìm thấy sản phẩm"
                            message={searchQuery ? 'Hãy thử từ khóa khác' : 'Thêm sản phẩm đầu tiên để bắt đầu quản lý'}
                                actionLabel={!searchQuery && !isManagerReadOnly ? "Thêm sản phẩm" : undefined}
                                onAction={!searchQuery && !isManagerReadOnly ? openCreate : undefined}
                        />
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {currentProducts.map((product) => (
                                <motion.div
                                    key={product._id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="p-4 rounded-xl bg-muted/50 hover:bg-muted transition-all hover:shadow-md group cursor-pointer"
                                    onClick={() => navigate(`${productsBasePath}/${product._id}`)}
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
                                                navigate(`${productsBasePath}/${product._id}`);
                                            }}
                                        >
                                            <Eye className="w-4 h-4" />
                                        </Button>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">Danh mục</span>
                                            <Badge variant="outline">{getCategoryName(product)}</Badge>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">Giá</span>
                                            <span className="font-semibold text-orange-500">
                                                {product.price?.toLocaleString()}đ
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">Hạn sử dụng</span>
                                            <span>{product.shelfLifeDays} ngày</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">Công thức</span>
                                            <span>{product.recipe?.length || 0} nguyên liệu</span>
                                        </div>
                                    </div>

                                    {product.bundleItems && product.bundleItems.length > 0 && (
                                        <div className="mt-3 pt-3 border-t">
                                            <Badge variant="secondary" className="w-full justify-center">
                                                Gói: {product.bundleItems.length} sản phẩm
                                            </Badge>
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {totalPages > 1 && filteredProducts.length > 0 && (
                <div className="mt-4 flex select-none items-center justify-end gap-2">
                    <button
                        type="button"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                        <span className="material-symbols-outlined text-[18px]">
                            chevron_left
                        </span>
                        Trước
                    </button>
                    <div className="flex items-center gap-1">
                        {getPageNumbers().map((page, idx) =>
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
                                    onClick={() => handlePageChange(page as number)}
                                    className={`h-8 min-w-[32px] rounded-lg px-2 text-xs font-semibold transition-all ${
                                        currentPage === page
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
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                        Sau
                        <span className="material-symbols-outlined text-[18px]">
                            chevron_right
                        </span>
                    </button>
                </div>
            )}

            <Modal
                isOpen={isCreateOpen}
                onClose={() => !createLoading && setIsCreateOpen(false)}
                title="Tạo sản phẩm"
                description="Nhập thông tin cơ bản và tải ảnh lên Firebase Storage"
                size="lg"
                footer={
                    <>
                        <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={createLoading}>
                            Hủy
                        </Button>
                        <Button
                            className="bg-gradient-to-r from-orange-600 to-amber-600"
                            onClick={handleCreate}
                            disabled={createLoading || isManagerReadOnly}
                        >
                            {createLoading ? 'Đang tạo...' : 'Tạo'}
                        </Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label className="text-sm font-medium mb-1 block">Tên *</label>
                            <Input
                                maxLength={100} // Thêm dòng này
                                value={createForm.name}
                                onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
                                placeholder="Ví dụ: Bánh mì (tối đa 100 ký tự)"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">SKU *</label>
                            <Input
                                maxLength={50} // Thêm dòng này
                                value={createForm.sku}
                                onChange={(e) => setCreateForm((p) => ({ ...p, sku: e.target.value }))}
                                placeholder="VD: SKU-001 (tối đa 50 ký tự)"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">Category *</label>
                            <select
                                className="flex h-10 w-full rounded-xl border border-input bg-white/60 dark:bg-white/5 backdrop-blur-sm px-4 py-2 text-base appearance-none cursor-pointer"
                                value={createForm.categoryId}
                                onChange={(e) => setCreateForm((p) => ({ ...p, categoryId: e.target.value }))}
                            >
                                {categories.map((c) => (
                                    <option key={c._id} value={c._id}>
                                        {c.categoryName}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">Giá (VND)</label>
                            <Input
                                type="number"
                                min={0}
                                value={createForm.price}
                                onChange={(e) => setCreateForm((p) => ({ ...p, price: Number(e.target.value) || 0 }))}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">Hạn sử dụng (ngày)</label>
                            <Input
                                type="number"
                                min={1}
                                value={createForm.shelfLifeDays}
                                onChange={(e) => setCreateForm((p) => ({ ...p, shelfLifeDays: Number(e.target.value) || 1 }))}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">Khối lượng (kg / đơn vị)</label>
                            <Input
                                type="number"
                                min={0}
                                step={0.01}
                                value={createForm.weight ?? 0}
                                onChange={(e) =>
                                    setCreateForm((p) => ({
                                        ...p,
                                        weight: Number(e.target.value) || 0,
                                    }))
                                }
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">Ảnh sản phẩm</label>
                            <Input
                                type="file"
                                accept="image/*"
                                onChange={(e) => setCreateImageFile(e.target.files?.[0] ?? null)}
                            />
                            <p className="mt-1 text-xs text-muted-foreground">
                                Nếu chọn ảnh, hệ thống sẽ upload lên Firebase và lưu URL vào trường <code>image</code>.
                            </p>
                        </div>
                        <div className="mt-6 pt-4 border-t border-border md:col-span-2">
                        <label className="text-sm font-bold mb-3 flex items-center gap-2 text-orange-600">
                            <UtensilsCrossed className="w-4 h-4" /> Công thức nguyên liệu (Tuỳ chọn)
                        </label>
                        
                        <div className="space-y-3 bg-muted/30 p-4 rounded-xl border border-border">
                            {(createForm as any).recipe?.length === 0 && (
                                <p className="text-sm text-muted-foreground italic text-center py-2">Sản phẩm chưa có công thức.</p>
                            )}
                            
                            {(createForm as any).recipe?.map((item: any, idx: number) => (
                                <div key={idx} className="flex items-center gap-3">
                                    <select
    className="flex-1 px-3 py-2 rounded-lg border border-input bg-white dark:bg-[#1C1C21] text-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-orange-500 transition-all"
    value={item.ingredientId || ''}
                                        onChange={(e) => {
                                            const newRecipe = [...((createForm as any).recipe || [])];
                                            newRecipe[idx].ingredientId = e.target.value;
                                            setCreateForm((p: any) => ({ ...p, recipe: newRecipe }));
                                        }}
                                    >
                                        <option value="" disabled>Chọn nguyên liệu...</option>
                                        {allIngredients.map(ing => (
                                            <option key={ing._id} value={ing._id}>
                                                {ing.ingredientName || (ing as any).name} 
                                                {ing.unit ? ` (${ing.unit})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                    
                                    <Input
                                        type="number"
                                        min={0}
                                        step={0.01}
                                        placeholder="SL"
                                        className="w-24 text-right"
                                        value={item.quantity}
                                        onChange={(e) => {
                                            const newRecipe = [...((createForm as any).recipe || [])];
                                            newRecipe[idx].quantity = Number(e.target.value) || 0;
                                            setCreateForm((p: any) => ({ ...p, recipe: newRecipe }));
                                        }}
                                    />
                                    
                                    <Button
                                        variant="outline"
                                        className="px-2 border-red-200 text-red-500 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/20 bg-transparent"
                                        onClick={() => {
                                            const newRecipe = (createForm as any).recipe?.filter((_: any, i: number) => i !== idx);
                                            setCreateForm((p: any) => ({ ...p, recipe: newRecipe }));
                                        }}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}

                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full border-dashed border-2 text-orange-600 border-orange-200 hover:bg-orange-50 hover:border-orange-300 dark:text-orange-400 dark:border-orange-500/30 dark:hover:bg-orange-500/20 dark:hover:border-orange-400 mt-2 bg-transparent"
                                onClick={() => {
                                    setCreateForm((p: any) => ({
                                        ...p,
                                        recipe: [...(p.recipe || []), { ingredientId: '', quantity: 1 }]
                                    }));
                                }}
                            >
                                <Plus className="w-4 h-4 mr-2" /> Thêm nguyên liệu
                            </Button>
                        </div>
                    </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default ProductsRecipesPage;
