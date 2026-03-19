import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ArrowLeft, Loader2, Package, Tag, Clock,
    DollarSign, Layers, Edit, Trash2, FlaskConical, Plus
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ErrorState } from '../components/ui/ErrorState';
import { ConfirmModal, Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { productApi, type UpdateProductRequest } from '@/api/ProductApi';
import { ingredientApi } from '@/api/InventoryApi';
import { categoryApi } from '@/api/CategoryApi';
import type { Product } from '@/api/ProductApi';
import type { Ingredient } from '@/api/InventoryApi';
import { useManagerReadOnly } from '@/shared/hooks/useManagerReadOnly';
import { useAuthStore } from '@/shared/zustand/authStore';
import { uploadProductImage } from '@/shared/lib/firebase';
import toast from 'react-hot-toast';

const ProductDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { isManagerReadOnly } = useManagerReadOnly();
    const { user } = useAuthStore();
    const isAdmin = user?.role === 'Admin';
    const productsBasePath = isAdmin ? '/admin/products' : '/manager/products';
    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [categoryName, setCategoryName] = useState<string>('');
    const [ingredientMap, setIngredientMap] = useState<Record<string, string>>({});

    // MỚI: State lưu toàn bộ danh sách nguyên liệu để đổ vào Dropdown lúc sửa
    const [allIngredients, setAllIngredients] = useState<Ingredient[]>([]);

    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editLoading, setEditLoading] = useState(false);
    const [editForm, setEditForm] = useState<any>({
        name: '',
        sku: '',
        price: 0,
        shelfLifeDays: 1,
        weight: 0.5,
        weightUnit: 'kg',
        image: undefined,
        recipe: [] // Thêm recipe vào form state
    });
    const [editImageFile, setEditImageFile] = useState<File | null>(null);

    const fetchProduct = async () => {
        if (!id) return;
        try {
            setLoading(true);
            setError(null);
            const response = await productApi.getById(id);
            const data = (response as any)?.data || response;
            setProduct(data);

            // Map mảng recipe từ DB ra dạng { ingredientId: string, quantity: number }
            const mappedRecipe = data?.recipe?.map((r: any) => ({
                ingredientId: typeof r.ingredientId === 'string' ? r.ingredientId : r.ingredientId?._id,
                quantity: r.quantity || 0
            })) || [];

            setEditForm({
                name: data?.name,
                sku: data?.sku,
                categoryId: typeof data?.categoryId === 'string' ? data?.categoryId : data?.categoryId?._id,
                price: data?.price,
                shelfLifeDays: data?.shelfLifeDays,
                weight: data?.weight ?? 0.5,
                weightUnit: data?.weightUnit ?? 'kg',
                image: data?.image,
                recipe: mappedRecipe, // Gán recipe vào form
            });

            // Fetch all ingredients once
            try {
                const ingResponse = await ingredientApi.getAll();
                const ingData = (ingResponse as any)?.data || ingResponse || [];

                // MỚI: Lưu toàn bộ nguyên liệu vào state
                setAllIngredients(Array.isArray(ingData) ? ingData : []);

                const map: Record<string, string> = {};
                (Array.isArray(ingData) ? ingData : []).forEach((ing: Ingredient) => {
                    if (ing._id) {
                        map[ing._id] = ing.ingredientName || (ing as any).name || ing._id;
                    }
                });
                setIngredientMap(map);
            } catch (ingErr) {
                console.error('Error fetching ingredients:', ingErr);
            }

            // Fetch category name
            const catId = typeof data?.categoryId === 'string'
                ? data.categoryId
                : data?.categoryId?._id;

            if (catId) {
                try {
                    const catResponse = await categoryApi.getById(catId);
                    const catData = (catResponse as any)?.data?.data || (catResponse as any)?.data;
                    setCategoryName(catData?.categoryName || catData?.name || catData?._id || '');
                } catch (catErr) {
                    console.error('Error fetching category:', catErr);
                }
            }
        } catch (err) {
            console.error('Error fetching product:', err);
            setError('Không thể tải chi tiết sản phẩm');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProduct();
    }, [id]);

    const handleDelete = async () => {
        if (!id) return;
        if (isManagerReadOnly) {
            toast.error('Manager không được phép xóa sản phẩm.');
            return;
        }
        try {
            setDeleteLoading(true);
            await productApi.delete(id);
            navigate(productsBasePath);
        } catch (err) {
            console.error('Error deleting product:', err);
            toast.error('Không xóa được sản phẩm. Có thể đang được dùng trong bundle.');
        } finally {
            setDeleteLoading(false);
        }
    };

    const openEdit = () => {
        if (isManagerReadOnly) return;
        setEditImageFile(null);
        setIsEditOpen(true);
    };

    const handleUpdate = async () => {
        if (!id) return;
        if (isManagerReadOnly) return;
        try {
            setEditLoading(true);
            let imageUrl = editForm.image;
            if (editImageFile) {
                imageUrl = await uploadProductImage(editImageFile, id);
            }

            // Lọc bỏ những nguyên liệu chưa chọn ID hoặc số lượng = 0
            const cleanedRecipe = editForm.recipe?.filter((r: any) => r.ingredientId && r.quantity > 0) || [];

            const payload: UpdateProductRequest = {
                ...editForm,
                image: imageUrl,
                price: Number(editForm.price) || 0,
                shelfLifeDays: Number(editForm.shelfLifeDays) || 1,
                weight: editForm.weight != null ? Number(editForm.weight) || 0.5 : undefined,
                weightUnit: editForm.weightUnit || 'kg',
                recipe: cleanedRecipe // Gửi recipe đã lọc lên Backend
            };

            await productApi.update(id, payload);
            toast.success('Đã cập nhật sản phẩm.');
            setIsEditOpen(false);
            await fetchProduct();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Không cập nhật được sản phẩm.');
        } finally {
            setEditLoading(false);
        }
    };

    const getCategoryDisplayName = () => {
        if (categoryName) return categoryName;
        if (!product?.categoryId) return 'Chưa phân loại';
        if (typeof product.categoryId === 'string') return product.categoryId;
        const cat = product.categoryId;
        return (cat as any).name || (cat as any).categoryName || 'Chưa phân loại';
    };

    const getIngredientName = (ingredient: any) => {
        if (typeof ingredient.ingredientId === 'object') {
            const ingData = ingredient.ingredientId;
            if (ingData?.ingredientName) return ingData.ingredientName;
            if (ingData?.name) return ingData.name;
        }
        if (typeof ingredient.ingredientId === 'string') {
            return ingredientMap[ingredient.ingredientId] || `Nguyên liệu (${ingredient.ingredientId.substring(0, 8)}...)`;
        }
        if (typeof ingredient.ingredientId === 'object') {
            const ingId = ingredient.ingredientId?._id;
            if (ingId) {
                return ingredientMap[ingId] || `Nguyên liệu (${ingId.substring(0, 8)}...)`;
            }
        }
        return 'Không xác định';
    };

    const getIngredientUnit = (ingredient: any) => {
        if (typeof ingredient.ingredientId === 'string') return '';
        return ingredient.ingredientId?.unit || '';
    };

    const getIngredientCost = (ingredient: any) => {
        if (typeof ingredient.ingredientId === 'string') return 0;
        return ingredient.ingredientId?.costPrice || 0;
    };

    const getChildProductName = (bundle: any) => {
        if (typeof bundle.childProductId === 'string') return 'Sản phẩm không xác định';
        return bundle.childProductId?.name || 'Không xác định';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                <span className="ml-2 text-muted-foreground">Đang tải sản phẩm...</span>
            </div>
        );
    }

    if (error || !product) {
        return (
            <div className="space-y-6">
                <Button variant="outline" onClick={() => navigate(productsBasePath)}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Quay lại danh sách sản phẩm
                </Button>
                <Card>
                    <CardContent className="p-6">
                        <ErrorState
                            title="Không thể tải sản phẩm"
                            message={error || 'Không tìm thấy sản phẩm'}
                            onRetry={fetchProduct}
                        />
                    </CardContent>
                </Card>
            </div>
        );
    }

    const totalRecipeCost = product.recipe?.reduce((sum, r) => {
        return sum + (getIngredientCost(r) * r.quantity);
    }, 0) || 0;

    const isBundle = product.bundleItems && product.bundleItems.length > 0;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="outline" onClick={() => navigate(productsBasePath)}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Quay lại
                    </Button>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold">{product.name}</h1>
                        <p className="text-muted-foreground">SKU: {product.sku}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled={isManagerReadOnly} onClick={openEdit}>
                        <Edit className="w-4 h-4 mr-1" />
                        Sửa
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="text-red-500"
                        onClick={() => setIsDeleteModalOpen(true)}
                        disabled={isManagerReadOnly}
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Package className="w-5 h-5" />
                                Thông tin sản phẩm
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col sm:flex-row gap-6">
                                {product.image && (
                                    <div className="w-full sm:w-48 h-48 rounded-xl overflow-hidden bg-muted">
                                        <img
                                            src={product.image}
                                            alt={product.name}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                )}
                                <div className="flex-1 grid grid-cols-2 gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                                            <Tag className="w-4 h-4 text-orange-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">Danh mục</p>
                                            <p className="font-semibold">{getCategoryDisplayName()}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                                            <DollarSign className="w-4 h-4 text-green-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">Giá bán</p>
                                            <p className="font-semibold text-green-600">{product.price?.toLocaleString()}đ</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                                            <Clock className="w-4 h-4 text-blue-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">Hạn sử dụng</p>
                                            <p className="font-semibold">{product.shelfLifeDays} ngày</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                                            <Package className="w-4 h-4 text-emerald-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">Khối lượng</p>
                                            <p className="font-semibold">
                                                {(product.weight ?? 0.5)} {product.weightUnit ?? 'kg'} / sản phẩm
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                                            <Layers className="w-4 h-4 text-purple-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">Loại sản phẩm</p>
                                            <p className="font-semibold">{isBundle ? 'Gói/Combo' : 'Sản phẩm đơn lẻ'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {!isBundle && product.recipe && product.recipe.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <FlaskConical className="w-5 h-5" />
                                    Công thức ({product.recipe.length} nguyên liệu)
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b">
                                                <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Nguyên liệu</th>
                                                <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Số lượng</th>
                                                <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Đơn vị</th>
                                                <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Giá đơn vị</th>
                                                <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Thành tiền</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {product.recipe.map((item, idx) => {
                                                const unitCost = getIngredientCost(item);
                                                const totalCost = unitCost * item.quantity;
                                                return (
                                                    <motion.tr
                                                        key={idx}
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        transition={{ delay: idx * 0.05 }}
                                                        className="border-b last:border-0 hover:bg-muted/50"
                                                    >
                                                        <td className="py-3 px-2 font-medium">{getIngredientName(item)}</td>
                                                        <td className="py-3 px-2 text-right">{item.quantity}</td>
                                                        <td className="py-3 px-2 text-right text-muted-foreground">{getIngredientUnit(item)}</td>
                                                        <td className="py-3 px-2 text-right">{unitCost.toLocaleString()}đ</td>
                                                        <td className="py-3 px-2 text-right text-orange-500 font-medium">{totalCost.toLocaleString()}đ</td>
                                                    </motion.tr>
                                                );
                                            })}
                                        </tbody>
                                        <tfoot>
                                            <tr className="bg-muted/50">
                                                <td colSpan={4} className="py-3 px-2 font-semibold">Tổng chi phí nguyên liệu</td>
                                                <td className="py-3 px-2 text-right font-bold text-orange-600">{totalRecipeCost.toLocaleString()}đ</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {isBundle && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Layers className="w-5 h-5" />
                                    Sản phẩm trong combo ({product.bundleItems?.length} sản phẩm)
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {product.bundleItems?.map((item, idx) => (
                                        <motion.div
                                            key={idx}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.1 }}
                                            className="flex items-center justify-between p-3 rounded-xl bg-muted/50"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center">
                                                    <Package className="w-5 h-5 text-white" />
                                                </div>
                                                <div>
                                                    <p className="font-medium">{getChildProductName(item)}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {typeof item.childProductId !== 'string' && item.childProductId?.sku}
                                                    </p>
                                                </div>
                                            </div>
                                            <Badge variant="secondary">x{item.quantity}</Badge>
                                        </motion.div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Tổng quan</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Giá bán</span>
                                <span className="font-bold text-green-600">{product.price?.toLocaleString()}đ</span>
                            </div>
                            {!isBundle && (
                                <>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Chi phí nguyên liệu</span>
                                        <span className="font-semibold">{totalRecipeCost.toLocaleString()}đ</span>
                                    </div>
                                    <div className="flex justify-between pt-2 border-t">
                                        <span className="text-muted-foreground">Lợi nhuận</span>
                                        <span className="font-bold text-orange-500">
                                            {(product.price - totalRecipeCost).toLocaleString()}đ
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Tỷ suất lợi nhuận</span>
                                        <span className="font-bold">
                                            {product.price > 0 ? Math.round(((product.price - totalRecipeCost) / product.price) * 100) : 0}%
                                        </span>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Thông tin hệ thống</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Ngày tạo</span>
                                <span>{new Date(product.createdAt).toLocaleDateString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Cập nhật lần cuối</span>
                                <span>{new Date(product.updatedAt).toLocaleDateString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Mã sản phẩm</span>
                                <span className="font-mono text-xs">{product._id}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <ConfirmModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDelete}
                title="Xóa sản phẩm"
                message={`Bạn có chắc chắn muốn xóa "${product.name}"? Hành động này không thể hoàn tác.`}
                confirmLabel="Xóa"
                variant="danger"
                loading={deleteLoading}
            />

            <Modal
                isOpen={isEditOpen}
                onClose={() => !editLoading && setIsEditOpen(false)}
                title="Sửa sản phẩm"
                description="Cập nhật thông tin và nguyên liệu"
                size="lg"
                footer={
                    <>
                        <Button variant="outline" onClick={() => setIsEditOpen(false)} disabled={editLoading}>
                            Hủy
                        </Button>
                        <Button
                            className="bg-gradient-to-r from-orange-600 to-amber-600"
                            onClick={handleUpdate}
                            disabled={editLoading || isManagerReadOnly}
                        >
                            {editLoading ? 'Đang lưu...' : 'Lưu'}
                        </Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label className="text-sm font-medium mb-1 block">Tên</label>
                            <Input
                                value={editForm.name ?? ''}
                                onChange={(e) => setEditForm((p: any) => ({ ...p, name: e.target.value }))}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">SKU</label>
                            <Input
                                value={editForm.sku ?? ''}
                                onChange={(e) => setEditForm((p: any) => ({ ...p, sku: e.target.value }))}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">Giá (VND)</label>
                            <Input
                                type="number"
                                min={0}
                                value={Number(editForm.price ?? 0)}
                                onChange={(e) => setEditForm((p: any) => ({ ...p, price: Number(e.target.value) || 0 }))}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">Hạn sử dụng (ngày)</label>
                            <Input
                                type="number"
                                min={1}
                                value={Number(editForm.shelfLifeDays ?? 1)}
                                onChange={(e) => setEditForm((p: any) => ({ ...p, shelfLifeDays: Number(e.target.value) || 1 }))}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">Khối lượng (kg / đơn vị)</label>
                            <Input
                                type="number"
                                min={0}
                                step={0.01}
                                value={Number(editForm.weight ?? 0)}
                                onChange={(e) =>
                                    setEditForm((p: any) => ({
                                        ...p,
                                        weight: Number(e.target.value) || 0,
                                    }))
                                }
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="text-sm font-medium mb-1 block">Ảnh sản phẩm (upload mới)</label>
                            <Input
                                type="file"
                                accept="image/*"
                                onChange={(e) => setEditImageFile(e.target.files?.[0] ?? null)}
                            />
                            <p className="mt-1 text-xs text-muted-foreground">
                                Nếu không chọn ảnh mới, hệ thống giữ nguyên URL ảnh hiện tại.
                            </p>
                        </div>
                    </div>

                    {/* KHU VỰC CHỈNH SỬA CÔNG THỨC (Chỉ hiện cho sản phẩm thường) */}
                    {!isBundle && (
                        <div className="mt-6 pt-4 border-t border-border">
                            <label className="text-sm font-bold mb-3 flex items-center gap-2 text-orange-600">
                                <FlaskConical className="w-4 h-4" /> Công thức nguyên liệu
                            </label>

                            <div className="space-y-3 bg-muted/30 p-4 rounded-xl border border-border">
                                {editForm.recipe?.length === 0 && (
                                    <p className="text-sm text-muted-foreground italic text-center py-2">Sản phẩm chưa có công thức.</p>
                                )}

                                {editForm.recipe?.map((item: any, idx: number) => (
                                    <div key={idx} className="flex items-center gap-3">
                                        <select
                                            className="flex-1 px-3 py-2 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                                            value={item.ingredientId || ''}
                                            onChange={(e) => {
                                                const newRecipe = [...(editForm.recipe || [])];
                                                newRecipe[idx].ingredientId = e.target.value;
                                                setEditForm((p: any) => ({ ...p, recipe: newRecipe }));
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
                                                const newRecipe = [...(editForm.recipe || [])];
                                                newRecipe[idx].quantity = Number(e.target.value) || 0;
                                                setEditForm((p: any) => ({ ...p, recipe: newRecipe }));
                                            }}
                                        />

                                        <Button
                                            variant="outline"
                                            className="px-2 border-red-200 text-red-500 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/20 bg-transparent"
                                            onClick={() => {
                                                const newRecipe = editForm.recipe?.filter((_: any, i: number) => i !== idx);
                                                setEditForm((p: any) => ({ ...p, recipe: newRecipe }));
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
                                        setEditForm((p: any) => ({
                                            ...p,
                                            recipe: [...(p.recipe || []), { ingredientId: '', quantity: 1 }]
                                        }));
                                    }}
                                >
                                    <Plus className="w-4 h-4 mr-2" /> Thêm nguyên liệu
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
};

export default ProductDetailPage;