import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Truck, CheckCircle2, Clock, XCircle, Search, Loader2, Plus, Eye, Trash2, Package } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/Tabs';
import { Modal } from '../components/ui/Modal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select';
import { transferApi } from '@/api/TransferApi';
import { storeApi } from '@/api/StoreApi';
import { batchApi } from '@/api/BatchApi';
import type { Transfer } from '@/api/TransferApi';
import type { Store } from '@/api/StoreApi';
import type { Batch } from '@/api/BatchApi';

interface TransferItem {
    productId: string;
    batchId: string;
    quantity: number;
    productName?: string;
    batchCode?: string;
}

const OrdersShipmentsPage = () => {
    const navigate = useNavigate();
    const [transfers, setTransfers] = useState<Transfer[]>([]);
    const [stores, setStores] = useState<Store[]>([]);
    const [batches, setBatches] = useState<Batch[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Create modal state
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [createLoading, setCreateLoading] = useState(false);
    const [toStoreId, setToStoreId] = useState('');
    const [note, setNote] = useState('');
    const [transferItems, setTransferItems] = useState<TransferItem[]>([]);
    const [selectedBatch, setSelectedBatch] = useState('');
    const [selectedProduct, setSelectedProduct] = useState('');
    const [quantity, setQuantity] = useState<number>(1);

    const fetchTransfers = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await transferApi.getAll();
            const data = (response as any)?.data || response || [];
            setTransfers(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error fetching transfers:', err);
            setError('Failed to load transfers');
        } finally {
            setLoading(false);
        }
    };

    const fetchStores = async () => {
        try {
            const response = await storeApi.getAll();
            const data = (response as any)?.data || response || [];
            setStores(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error fetching stores:', err);
        }
    };

    const fetchBatches = async () => {
        try {
            const response = await batchApi.getAll({ status: 'Active' });
            const data = (response as any)?.data || response || [];
            setBatches(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error fetching batches:', err);
        }
    };

    useEffect(() => {
        fetchTransfers();
        fetchStores();
        fetchBatches();
    }, []);

    // Stats
    const stats = {
        pending: transfers.filter(t => t.status === 'Pending').length,
        shipped: transfers.filter(t => t.status === 'Shipped').length,
        received: transfers.filter(t => t.status === 'Received').length,
        cancelled: transfers.filter(t => t.status === 'Cancelled').length,
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Pending':
                return (
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                        <Clock className="w-3 h-3 mr-1" />
                        Pending
                    </Badge>
                );
            case 'Shipped':
                return (
                    <Badge className="bg-blue-500 text-white">
                        <Truck className="w-3 h-3 mr-1" />
                        Shipped
                    </Badge>
                );
            case 'Received':
                return (
                    <Badge variant="success" className="bg-green-500 text-white">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Received
                    </Badge>
                );
            case 'Cancelled':
                return (
                    <Badge variant="destructive">
                        <XCircle className="w-3 h-3 mr-1" />
                        Cancelled
                    </Badge>
                );
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const getStoreName = (transfer: Transfer) => {
        if (typeof transfer.toStoreId === 'string') return 'Unknown Store';
        return transfer.toStoreId?.storeName || 'Unknown Store';
    };

    const getStoreAddress = (transfer: Transfer) => {
        if (typeof transfer.toStoreId === 'string') return '';
        return transfer.toStoreId?.address || '';
    };

    const getCreatorName = (transfer: Transfer) => {
        if (typeof transfer.createdBy === 'string') return 'Unknown';
        return transfer.createdBy?.fullName || transfer.createdBy?.username || 'Unknown';
    };

    const getTotalItems = (transfer: Transfer) => {
        return transfer.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
    };

    const filterTransfers = (status: string) => {
        let filtered = transfers;

        // Filter by status
        if (status !== 'all') {
            filtered = filtered.filter(t => t.status === status);
        }

        // Filter by search query
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(t =>
                t.transferCode?.toLowerCase().includes(query) ||
                getStoreName(t).toLowerCase().includes(query)
            );
        }

        return filtered;
    };

    const handleShip = async (id: string) => {
        try {
            await transferApi.updateStatus(id, { status: 'Shipped' });
            fetchTransfers();
        } catch (err) {
            console.error('Error shipping transfer:', err);
        }
    };

    const handleReceive = async (id: string) => {
        try {
            await transferApi.updateStatus(id, { status: 'Received' });
            fetchTransfers();
        } catch (err) {
            console.error('Error receiving transfer:', err);
        }
    };

    const handleCancel = async (id: string) => {
        try {
            await transferApi.updateStatus(id, { status: 'Cancelled' });
            fetchTransfers();
        } catch (err) {
            console.error('Error cancelling transfer:', err);
        }
    };

    // Transfer creation functions
    const openCreateModal = () => {
        setIsCreateModalOpen(true);
        setToStoreId('');
        setNote('');
        setTransferItems([]);
    };

    const closeCreateModal = () => {
        setIsCreateModalOpen(false);
        setCreateLoading(false);
        setToStoreId('');
        setNote('');
        setTransferItems([]);
    };

    const getSelectedBatchInfo = () => {
        if (!selectedBatch) return null;
        const batch = batches.find(b => b._id === selectedBatch);
        if (!batch) return null;
        const product = typeof batch.productId === 'object' ? batch.productId : null;
        return {
            batch,
            productName: product?.name || 'Unknown Product',
            batchCode: batch.batchCode,
            availableQuantity: batch.currentQuantity
        };
    };

    const addItemToTransfer = () => {
        if (!selectedBatch || !selectedProduct || quantity <= 0) return;

        const batchInfo = getSelectedBatchInfo();
        if (!batchInfo) return;

        // Check if batch already added
        const existingIndex = transferItems.findIndex(item => item.batchId === selectedBatch);
        if (existingIndex >= 0) {
            const updatedItems = [...transferItems];
            updatedItems[existingIndex].quantity += quantity;
            setTransferItems(updatedItems);
        } else {
            setTransferItems([...transferItems, {
                productId: selectedProduct,
                batchId: selectedBatch,
                quantity,
                productName: batchInfo.productName,
                batchCode: batchInfo.batchCode
            }]);
        }

        setSelectedBatch('');
        setSelectedProduct('');
        setQuantity(1);
    };

    const removeItemFromTransfer = (index: number) => {
        const updatedItems = [...transferItems];
        updatedItems.splice(index, 1);
        setTransferItems(updatedItems);
    };

    const handleCreateTransfer = async () => {
        if (!toStoreId || transferItems.length === 0) {
            alert('Please select a store and add at least one item');
            return;
        }

        setCreateLoading(true);
        try {
            await transferApi.create({
                toStoreId,
                items: transferItems.map(item => ({
                    productId: item.productId,
                    batchId: item.batchId,
                    quantity: item.quantity
                })),
                note
            });
            closeCreateModal();
            fetchTransfers();
        } catch (err) {
            console.error('Error creating transfer:', err);
            alert('Failed to create transfer');
        } finally {
            setCreateLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                <span className="ml-2 text-muted-foreground">Loading transfers...</span>
            </div>
        );
    }

    const renderTransferList = (filteredTransfers: Transfer[]) => (
        <div className="space-y-4 mt-4">
            {filteredTransfers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                    No transfers found
                </div>
            ) : (
                filteredTransfers.map((transfer) => (
                    <motion.div
                        key={transfer._id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                    >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <h3 className="font-semibold text-lg">{transfer.transferCode}</h3>
                                    {getStatusBadge(transfer.status)}
                                </div>
                                <div className="space-y-1 text-sm text-muted-foreground">
                                    <p><strong>To:</strong> {getStoreName(transfer)}</p>
                                    {getStoreAddress(transfer) && (
                                        <p className="text-xs">{getStoreAddress(transfer)}</p>
                                    )}
                                    <p><strong>Created by:</strong> {getCreatorName(transfer)}</p>
                                    <p><strong>Items:</strong> {transfer.items?.length || 0} products ({getTotalItems(transfer)} units)</p>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2 text-sm">
                                <div>
                                    <p className="text-muted-foreground">Created</p>
                                    <p className="font-medium">{new Date(transfer.createdAt).toLocaleDateString()}</p>
                                </div>
                                {transfer.shippedDate && (
                                    <div>
                                        <p className="text-muted-foreground">Shipped</p>
                                        <p className="font-medium">{new Date(transfer.shippedDate).toLocaleDateString()}</p>
                                    </div>
                                )}
                                {transfer.receivedDate && (
                                    <div>
                                        <p className="text-muted-foreground">Received</p>
                                        <p className="font-medium">{new Date(transfer.receivedDate).toLocaleDateString()}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Items preview */}
                        {transfer.items && transfer.items.length > 0 && (
                            <div className="mt-3 pt-3 border-t space-y-2">
                                {transfer.items.slice(0, 2).map((item, idx) => {
                                    const batch = typeof item.batchId === 'string' ? null : item.batchId;
                                    const productName = batch?.productId?.name || 'Unknown Product';
                                    const batchCode = batch?.batchCode || 'Unknown Batch';

                                    return (
                                        <div key={idx} className="flex items-center justify-between text-sm bg-background/50 p-2 rounded-lg">
                                            <div>
                                                <span className="font-medium">{productName}</span>
                                                <span className="text-muted-foreground ml-2">({batchCode})</span>
                                            </div>
                                            <span className="font-medium">{item.quantity} units</span>
                                        </div>
                                    );
                                })}
                                {transfer.items.length > 2 && (
                                    <p className="text-xs text-muted-foreground text-center">
                                        +{transfer.items.length - 2} more items
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2 mt-4">
                            <Button variant="outline" size="sm" onClick={() => navigate(`/manager/orders/${transfer._id}`)}>
                                <Eye className="w-4 h-4 mr-1" />
                                View Details
                            </Button>
                            {transfer.status === 'Pending' && (
                                <>
                                    <Button size="sm" className="bg-blue-500 hover:bg-blue-600" onClick={() => handleShip(transfer._id)}>
                                        <Truck className="w-4 h-4 mr-1" />
                                        Ship
                                    </Button>
                                    <Button variant="destructive" size="sm" onClick={() => handleCancel(transfer._id)}>
                                        <XCircle className="w-4 h-4 mr-1" />
                                        Cancel
                                    </Button>
                                </>
                            )}
                            {transfer.status === 'Shipped' && (
                                <Button size="sm" className="bg-green-500 hover:bg-green-600" onClick={() => handleReceive(transfer._id)}>
                                    <CheckCircle2 className="w-4 h-4 mr-1" />
                                    Receive
                                </Button>
                            )}
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
                    <Button className="bg-gradient-to-r from-orange-600 to-amber-600" onClick={openCreateModal}>
                        <Plus className="w-4 h-4 mr-2" />
                        New Transfer
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                                <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Pending</p>
                                <p className="text-2xl font-bold">{stats.pending}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                                <Truck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Shipped</p>
                                <p className="text-2xl font-bold">{stats.shipped}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Received</p>
                                <p className="text-2xl font-bold text-green-600">{stats.received}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                                <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Cancelled</p>
                                <p className="text-2xl font-bold">{stats.cancelled}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {error && (
                <div className="text-center py-4 text-red-500">
                    {error}
                    <Button onClick={fetchTransfers} variant="link" className="ml-2">Retry</Button>
                </div>
            )}

            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by transfer code or store..."
                                className="pl-10"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className="grid w-full grid-cols-5">
                            <TabsTrigger value="all">All ({transfers.length})</TabsTrigger>
                            <TabsTrigger value="Pending">Pending ({stats.pending})</TabsTrigger>
                            <TabsTrigger value="Shipped">Shipped ({stats.shipped})</TabsTrigger>
                            <TabsTrigger value="Received">Received ({stats.received})</TabsTrigger>
                            <TabsTrigger value="Cancelled">Cancelled ({stats.cancelled})</TabsTrigger>
                        </TabsList>
                        <TabsContent value="all">
                            {renderTransferList(filterTransfers('all'))}
                        </TabsContent>
                        <TabsContent value="Pending">
                            {renderTransferList(filterTransfers('Pending'))}
                        </TabsContent>
                        <TabsContent value="Shipped">
                            {renderTransferList(filterTransfers('Shipped'))}
                        </TabsContent>
                        <TabsContent value="Received">
                            {renderTransferList(filterTransfers('Received'))}
                        </TabsContent>
                        <TabsContent value="Cancelled">
                            {renderTransferList(filterTransfers('Cancelled'))}
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            {/* Create Transfer Modal */}
            <Modal
                isOpen={isCreateModalOpen}
                onClose={closeCreateModal}
                title="Create New Transfer"
                size="lg"
                footer={
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={closeCreateModal} disabled={createLoading}>
                            Cancel
                        </Button>
                        <Button
                            className="bg-gradient-to-r from-orange-600 to-amber-600"
                            onClick={handleCreateTransfer}
                            disabled={createLoading || !toStoreId || transferItems.length === 0}
                        >
                            {createLoading ? 'Creating...' : 'Create Transfer'}
                        </Button>
                    </div>
                }
            >
                <div className="space-y-4">
                    {/* Store Selection */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Destination Store</label>
                        <Select value={toStoreId} onValueChange={setToStoreId}>
                            <SelectTrigger className="h-10">
                                <SelectValue placeholder="Select Store" />
                            </SelectTrigger>
                            <SelectContent>
                                {stores.map((store) => (
                                    <SelectItem key={store._id} value={store._id}>
                                        {store.storeName || store.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Add Items Section */}
                    <div className="border-t pt-4">
                        <h4 className="font-medium mb-2">Add Products</h4>
                        <div className="flex gap-2 mb-4">
                            <div className="flex-1">
                                <Select value={selectedBatch} onValueChange={(value) => {
                                    setSelectedBatch(value);
                                    const batch = batches.find(b => b._id === value);
                                    if (batch) {
                                        setSelectedProduct(typeof batch.productId === 'object' ? batch.productId._id : '');
                                    }
                                }}>
                                    <SelectTrigger className="h-10">
                                        <SelectValue placeholder="Select Batch" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {batches.map((batch) => {
                                            const product = typeof batch.productId === 'object' ? batch.productId : null;
                                            return (
                                                <SelectItem key={batch._id} value={batch._id}>
                                                    {product?.name || 'Unknown'} - {batch.batchCode} ({batch.currentQuantity} available)
                                                </SelectItem>
                                            );
                                        })}
                                    </SelectContent>
                                </Select>
                            </div>
                            <Input
                                type="number"
                                min={1}
                                className="w-24 h-10"
                                placeholder="Qty"
                                value={quantity}
                                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                            />
                            <Button
                                type="button"
                                variant="outline"
                                onClick={addItemToTransfer}
                                disabled={!selectedBatch || quantity <= 0}
                            >
                                <Plus className="w-4 h-4" />
                            </Button>
                        </div>

                        {/* Selected Items List */}
                        {transferItems.length > 0 ? (
                            <div className="space-y-2">
                                {transferItems.map((item, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                                    >
                                        <div>
                                            <p className="font-medium">{item.productName}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {item.batchCode} • {item.quantity} units
                                            </p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-red-500 hover:text-red-600"
                                            onClick={() => removeItemFromTransfer(index)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-4 text-muted-foreground text-sm">
                                <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p>No items added yet</p>
                            </div>
                        )}
                    </div>

                    {/* Note */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Note (Optional)</label>
                        <Input
                            placeholder="Add a note for this transfer..."
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                        />
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default OrdersShipmentsPage;
