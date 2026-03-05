import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Boxes, Search, Store, Package, Loader2 } from 'lucide-react';
import { inventoryApi, type StoreInventoryItem, type AllInventoryResponse } from '@/api/InventoryApi';
import { storeApi, type Store as StoreType } from '@/api/StoreApi';
import toast from 'react-hot-toast';
import { cn } from '@/shared/lib/utils';

interface StoreInventoryGroup {
  store: { id: string; name: string; address: string };
  items: StoreInventoryItem[];
  totalQuantity: number;
}

export default function CoordinatorInventoryPage() {
  const [loading, setLoading] = useState(true);
  const [storeGroups, setStoreGroups] = useState<StoreInventoryGroup[]>([]);
  const [stores, setStores] = useState<StoreType[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [inventoryRes, storesRes] = await Promise.all([
        inventoryApi.getAll().catch(() => null),
        storeApi.getAllStores().catch(() => []),
      ]);

      setStores(storesRes);

      if (inventoryRes && typeof inventoryRes === 'object') {
        const body = 'data' in inventoryRes ? (inventoryRes as unknown as AllInventoryResponse) : null;
        if (body && Array.isArray(body.data)) {
          setStoreGroups(body.data);
        }
      }
    } catch {
      toast.error('Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  };

  const filteredGroups = storeGroups
    .filter((g) => selectedStoreId === 'all' || g.store.id === selectedStoreId)
    .map((g) => ({
      ...g,
      items: g.items.filter((item) => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        const productName = typeof item.productId === 'object' ? item.productId.name : '';
        const batchCode = typeof item.batchId === 'object' ? item.batchId.batchCode : '';
        return productName.toLowerCase().includes(term) || batchCode.toLowerCase().includes(term);
      }),
    }))
    .filter((g) => g.items.length > 0);

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString('vi-VN'); } catch { return d; }
  };

  const isExpiringSoon = (expDate: string) => {
    const diff = new Date(expDate).getTime() - Date.now();
    return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000;
  };

  const isExpired = (expDate: string) => {
    return new Date(expDate).getTime() < Date.now();
  };

  return (
    <div className="p-6 space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600">
            <Boxes className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Store Inventory</h1>
        </div>
        <p className="text-muted-foreground text-sm">Overview of product inventory across all stores</p>
      </motion.div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search product or batch..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <select
          value={selectedStoreId}
          onChange={(e) => setSelectedStoreId(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="all">All Stores</option>
          {stores.map((s) => (
            <option key={s._id} value={s._id}>
              {s.storeName || s.name || s.storeCode || s._id}
            </option>
          ))}
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p className="text-lg font-medium">No inventory data</p>
          <p className="text-sm">No items match your filters</p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredGroups.map((group) => (
            <motion.div
              key={group.store.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-border bg-card overflow-hidden"
            >
              {/* Store header */}
              <div className="px-5 py-3 bg-secondary/30 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Store className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-sm">{group.store.name}</span>
                  <span className="text-xs text-muted-foreground">• {group.store.address}</span>
                </div>
                <span className="text-xs font-medium text-muted-foreground">
                  {group.items.length} items • Total: {group.totalQuantity}
                </span>
              </div>

              {/* Items table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="px-5 py-2.5 font-medium">Product</th>
                      <th className="px-3 py-2.5 font-medium">SKU</th>
                      <th className="px-3 py-2.5 font-medium">Batch</th>
                      <th className="px-3 py-2.5 font-medium">Qty</th>
                      <th className="px-3 py-2.5 font-medium">MFG</th>
                      <th className="px-3 py-2.5 font-medium">EXP</th>
                      <th className="px-3 py-2.5 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.items.map((inv, idx) => {
                      const product = typeof inv.productId === 'object' ? inv.productId : null;
                      const batch = typeof inv.batchId === 'object' ? inv.batchId : null;
                      const expDate = batch?.expDate || '';
                      const expired = expDate ? isExpired(expDate) : false;
                      const expiring = expDate ? isExpiringSoon(expDate) : false;

                      return (
                        <tr key={inv._id || idx} className="border-b border-border/50 hover:bg-secondary/10">
                          <td className="px-5 py-2 font-medium">{product?.name || '—'}</td>
                          <td className="px-3 py-2 font-mono text-xs">{product?.sku || '—'}</td>
                          <td className="px-3 py-2 font-mono text-xs">{batch?.batchCode || '—'}</td>
                          <td className="px-3 py-2 font-semibold">{inv.quantity}</td>
                          <td className="px-3 py-2 text-xs">{batch?.mfgDate ? formatDate(batch.mfgDate) : '—'}</td>
                          <td className="px-3 py-2 text-xs">{expDate ? formatDate(expDate) : '—'}</td>
                          <td className="px-3 py-2">
                            <span className={cn(
                              'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                              expired
                                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                : expiring
                                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            )}>
                              {expired ? 'Expired' : expiring ? 'Expiring Soon' : 'Good'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}