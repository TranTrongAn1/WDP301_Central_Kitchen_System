import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Store as StoreIcon, Plus, Search, Loader2, MapPin, Phone, Edit, Eye, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { ErrorState } from '../components/ui/ErrorState';
import { EmptyState } from '../components/ui/EmptyState';
import { storeApi } from '@/api/StoreApi';
import type { Store, CreateStoreRequest } from '@/api/StoreApi';
import { paymentApi, type WalletInfo } from '@/api/PaymentApi';
import { useManagerReadOnly } from '@/shared/hooks/useManagerReadOnly';

const StoresPage = () => {
    const { isManagerReadOnly } = useManagerReadOnly();
    const [stores, setStores] = useState<Store[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedStore, setSelectedStore] = useState<Store | null>(null);
    const [formLoading, setFormLoading] = useState(false);

    const [selectedStoreWallet, setSelectedStoreWallet] = useState<WalletInfo | null>(null);
    const [walletLoading, setWalletLoading] = useState(false);

    const ITEMS_PER_PAGE = 9;
    const [currentPage, setCurrentPage] = useState(1);

    const [formData, setFormData] = useState<CreateStoreRequest>({
        storeName: '',
        storeCode: '',
        address: '',
        phone: '',
        standardDeliveryMinutes: 30,
        status: 'Active'
    });

    const fetchStores = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await storeApi.getAll();
            const data = (response as any)?.data || response || [];
            setStores(Array.isArray(data) ? data : []);
        } catch (err: unknown) {
            console.error('Error fetching stores:', err);
            setError('Failed to load stores');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStores();
    }, []);

    const resetForm = () => {
        setFormData({
            storeName: '',
            storeCode: '',
            address: '',
            phone: '',
            standardDeliveryMinutes: 30,
            status: 'Active'
        });
    };

    const handleCreateStore = async () => {
        if (isManagerReadOnly) return;
        try {
            setFormLoading(true);
            await storeApi.create(formData);
            setIsCreateModalOpen(false);
            resetForm();
            fetchStores();
        } catch (err) {
            console.error('Error creating store:', err);
            alert('Failed to create store');
        } finally {
            setFormLoading(false);
        }
    };

    const handleEditStore = async () => {
        if (!selectedStore) return;
        if (isManagerReadOnly) return;
        try {
            setFormLoading(true);
            await storeApi.update(selectedStore._id, formData);
            setIsEditModalOpen(false);
            setSelectedStore(null);
            resetForm();
            fetchStores();
        } catch (err) {
            console.error('Error updating store:', err);
            alert('Failed to update store');
        } finally {
            setFormLoading(false);
        }
    };

    const openEditModal = (store: Store) => {
        setSelectedStore(store);
        setFormData({
            storeName: store.name || store.storeName || '',
            storeCode: store.store_code || store.storeCode || '',
            address: store.address || store.adress || '',
            phone: store.phone_number || store.phone || '',
            standardDeliveryMinutes: store.standardDeliveryMinutes ?? 30,
            status: store.status === 'Active' || store.status === true ? 'Active' : 'Inactive'
        });
        setIsEditModalOpen(true);
    };

    const openDetailModal = (store: Store) => {
        setSelectedStore(store);
        if (store._id) {
            setWalletLoading(true);
            paymentApi
                .getWallet(store._id)
                .then((w) => setSelectedStoreWallet(w))
                .catch(() => setSelectedStoreWallet(null))
                .finally(() => setWalletLoading(false));
        }
        setIsDetailModalOpen(true);
    };

    const filteredStores = stores.filter(store =>
        (store.name || store.storeName)?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (store.store_code || store.storeCode)?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (store.address || store.adress)?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const totalPages = Math.ceil(filteredStores.length / ITEMS_PER_PAGE) || 1;
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const currentStores = filteredStores.slice(startIndex, startIndex + ITEMS_PER_PAGE);

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

    const activeStores = stores.filter(s => s.status === 'Active' || s.status === true).length;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                <span className="ml-2 text-muted-foreground">Loading stores...</span>
            </div>
        );
    }

    if (error) {
        return (
            <ErrorState
                title="Failed to load stores"
                message={error}
                onRetry={fetchStores}
            />
        );
    }

    const StoreForm = () => (
        <div className="space-y-4">
            <div>
                <label className="text-sm font-medium mb-1 block">Store Name *</label>
                <Input
                    placeholder="Enter store name"
                    value={formData.storeName}
                    onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                />
            </div>
            <div>
                <label className="text-sm font-medium mb-1 block">Store Code *</label>
                <Input
                    placeholder="e.g. KD-D1-001"
                    value={formData.storeCode}
                    onChange={(e) => setFormData({ ...formData, storeCode: e.target.value })}
                />
            </div>
            <div>
                <label className="text-sm font-medium mb-1 block">Address *</label>
                <Input
                    placeholder="Enter full address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
            </div>
            <div>
                <label className="text-sm font-medium mb-1 block">Phone *</label>
                <Input
                    placeholder="e.g. 0901234567"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
            </div>
            <div>
                <label className="text-sm font-medium mb-1 block">Thời gian giao chuẩn (phút)</label>
                <Input
                    type="number"
                    min={1}
                    max={120}
                    placeholder="30"
                    value={formData.standardDeliveryMinutes ?? ''}
                    onChange={(e) => setFormData({ ...formData, standardDeliveryMinutes: e.target.value ? parseInt(e.target.value, 10) : undefined })}
                />
            </div>
            <div>
                <label className="text-sm font-medium mb-1 block">Status</label>
                <select
                    className="flex h-12 w-full rounded-xl border border-input bg-white/60 dark:bg-white/5 backdrop-blur-sm px-4 py-2 text-base"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as 'Active' | 'Inactive' })}
                >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                </select>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                </div>
                <div className="flex gap-2">
                    <Button
                        className="bg-gradient-to-r from-orange-600 to-amber-600"
                        onClick={() => {
                            if (isManagerReadOnly) return;
                            resetForm();
                            setIsCreateModalOpen(true);
                        }}
                        disabled={isManagerReadOnly}
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Store
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-orange-100 dark:bg-orange-900/30">
                                <StoreIcon className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Total Stores</p>
                                <p className="text-2xl font-bold">{stores.length}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-green-100 dark:bg-green-900/30">
                                <StoreIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Active Stores</p>
                                <p className="text-2xl font-bold text-green-600">{activeStores}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-gray-100 dark:bg-gray-900/30">
                                <StoreIcon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Inactive Stores</p>
                                <p className="text-2xl font-bold">{stores.length - activeStores}</p>
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
                                placeholder="Search stores by name, code, or address..."
                                className="pl-10"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {filteredStores.length === 0 ? (
                        <EmptyState
                            icon={StoreIcon}
                            title="No Stores Found"
                            message={searchQuery ? 'Try a different search term' : 'Add your first store to get started'}
                            actionLabel={!searchQuery ? "Add Store" : undefined}
                            onAction={!searchQuery ? () => setIsCreateModalOpen(true) : undefined}
                        />
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {currentStores.map((store) => {
                                const isActive = store.status === 'Active' || store.status === true;
                                const storeName = store.name || store.storeName || 'Unknown Store';
                                const storeAddress = store.address || store.adress || 'No address';

                                return (
                                    <motion.div
                                        key={store._id}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="p-4 rounded-xl bg-muted/50 hover:bg-muted transition-all hover:shadow-md group"
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${isActive
                                                    ? 'bg-gradient-to-br from-orange-400 to-amber-500'
                                                    : 'bg-gray-400'
                                                    }`}>
                                                    <StoreIcon className="w-6 h-6 text-white" />
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold">{storeName}</h4>
                                                    <p className="text-sm text-muted-foreground">{store.store_code || store.storeCode}</p>
                                                </div>
                                            </div>
                                            <Badge variant={isActive ? 'success' : 'secondary'}>
                                                {isActive ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex items-start gap-2 text-sm">
                                                <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                                                <span className="text-muted-foreground">{storeAddress}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm">
                                                <Phone className="w-4 h-4 text-muted-foreground" />
                                                <span className="text-muted-foreground">{store.phone_number || 'No phone'}</span>
                                            </div>
                                        </div>

                                        <div className="flex gap-2 mt-4">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="flex-1"
                                                onClick={() => openDetailModal(store)}
                                            >
                                                <Eye className="w-4 h-4 mr-1" />
                                                View Details
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => openEditModal(store)}
                                                disabled={isManagerReadOnly}
                                            >
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {totalPages > 1 && filteredStores.length > 0 && (
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
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                title="Add New Store"
                description="Create a new store location"
                size="md"
                footer={
                    <>
                        <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            className="bg-gradient-to-r from-orange-600 to-amber-600"
                            onClick={handleCreateStore}
                            disabled={formLoading || !formData.storeName || !formData.storeCode}
                        >
                            {formLoading ? 'Creating...' : 'Create Store'}
                        </Button>
                    </>
                }
            >
                <StoreForm />
            </Modal>

            <Modal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title="Edit Store"
                description="Update store information"
                size="md"
                footer={
                    <>
                        <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            className="bg-gradient-to-r from-orange-600 to-amber-600"
                            onClick={handleEditStore}
                            disabled={formLoading}
                        >
                            {formLoading ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </>
                }
            >
                <StoreForm />
            </Modal>

            {/* Store Detail Modal */}
            <Modal
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                title="Store Details"
                size="md"
                footer={
                    <Button variant="outline" onClick={() => setIsDetailModalOpen(false)}>
                        Close
                    </Button>
                }
            >
                {selectedStore && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${(selectedStore.status === 'Active' || selectedStore.status === true)
                                    ? 'bg-gradient-to-br from-orange-400 to-amber-500'
                                    : 'bg-gray-400'
                                }`}>
                                <StoreIcon className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold">{selectedStore.name || selectedStore.storeName}</h3>
                                <p className="text-muted-foreground">{selectedStore.store_code || selectedStore.storeCode}</p>
                                <Badge variant={(selectedStore.status === 'Active' || selectedStore.status === true) ? 'success' : 'secondary'}>
                                    {(selectedStore.status === 'Active' || selectedStore.status === true) ? 'Active' : 'Inactive'}
                                </Badge>
                            </div>
                        </div>

                        <div className="grid gap-4 py-4">
                            <div className="flex items-center gap-3">
                                <MapPin className="w-5 h-5 text-muted-foreground" />
                                <div>
                                    <p className="text-sm text-muted-foreground">Address</p>
                                    <p className="font-medium">{selectedStore.address || selectedStore.adress || 'N/A'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Phone className="w-5 h-5 text-muted-foreground" />
                                <div>
                                    <p className="text-sm text-muted-foreground">Phone Number</p>
                                    <p className="font-medium">{selectedStore.phone_number || 'N/A'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Calendar className="w-5 h-5 text-muted-foreground" />
                                <div>
                                    <p className="text-sm text-muted-foreground">Created At</p>
                                    <p className="font-medium">
                                        {selectedStore.createdAt
                                            ? new Date(selectedStore.createdAt).toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })
                                            : 'N/A'}
                                    </p>
                                </div>
                            </div>
                            {selectedStoreWallet && (
                                <div className="flex items-center gap-3">
                                    <StoreIcon className="w-5 h-5 text-muted-foreground" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">Wallet Balance</p>
                                        <p className="font-medium">
                                            {new Intl.NumberFormat('vi-VN', {
                                                style: 'currency',
                                                currency: 'VND',
                                            }).format(selectedStoreWallet.balance)}
                                        </p>
                                    </div>
                                </div>
                            )}
                            {walletLoading && !selectedStoreWallet && (
                                <p className="text-xs text-muted-foreground">Đang tải số dư ví...</p>
                            )}
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default StoresPage;
