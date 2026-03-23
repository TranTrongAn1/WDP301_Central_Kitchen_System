import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Boxes,
  Search,
  Store,
  Package,
  Loader2,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronRight,
} from 'lucide-react';
import { inventoryApi, type StoreInventoryItem, type AllInventoryResponse } from '@/api/InventoryApi';
import { storeApi, type Store as StoreType } from '@/api/StoreApi';
import { useThemeStore } from '@/shared/zustand/themeStore';
import toast from 'react-hot-toast';
import { cn } from '@/shared/lib/utils';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/shared/zustand/authStore';

interface StoreInventoryGroup {
  store: { id: string; name: string; address: string };
  items: StoreInventoryItem[];
  totalQuantity: number;
}

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

export default function CoordinatorInventoryPage() {
  const { darkMode } = useThemeStore();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);

  // Get base path based on user role
  const getBasePath = () => {
    const role = user?.role;
    if (role === 'Admin') return '/admin';
    if (role === 'Manager') return '/manager';
    return '/coordinator'; // Fallback for other roles
  };
  const basePath = getBasePath();
  const [storeGroups, setStoreGroups] = useState<StoreInventoryGroup[]>([]);
  const [stores, setStores] = useState<StoreType[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [inventoryRes, storesRes] = await Promise.all([
        inventoryApi.getAll().catch((err: unknown) => {
          const axiosErr = err as { response?: { status?: number } };
          if (axiosErr?.response?.status === 403) {
            throw new Error('BẠN_KHÔNG_CÓ_QUYỀN');
          }
          throw err;
        }),
        storeApi.getAllStores().catch(() => []),
      ]);

      setStores(storesRes);

      if (inventoryRes && typeof inventoryRes === 'object') {
        const res = inventoryRes as unknown as AllInventoryResponse;
        if (res.success && Array.isArray(res.data)) {
          setStoreGroups(res.data);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'BẠN_KHÔNG_CÓ_QUYỀN') {
        setError('BẠN_KHÔNG_CÓ_QUYỀN');
      } else {
        toast.error('Không thể tải dữ liệu tồn kho');
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredGroups = useMemo(() => {
    return storeGroups
      .filter((g) => selectedStoreId === 'all' || g.store.id === selectedStoreId)
      .map((g) => ({
        ...g,
        items: g.items.filter((item) => {
          if (!searchTerm) return true;
          const term = searchTerm.toLowerCase();
          const productName = typeof item.productId === 'object' ? item.productId.name : '';
          const batchCode = typeof item.batchId === 'object' ? item.batchId.batchCode : '';
          const sku = typeof item.productId === 'object' ? item.productId.sku : '';
          return (
            productName.toLowerCase().includes(term) ||
            batchCode.toLowerCase().includes(term) ||
            sku.toLowerCase().includes(term)
          );
        }),
      }))
      .filter((g) => g.items.length > 0);
  }, [storeGroups, selectedStoreId, searchTerm]);

  const totalStores = storeGroups.length;
  const totalProducts = storeGroups.reduce((sum, g) => sum + g.items.length, 0);
  const totalQuantity = storeGroups.reduce((sum, g) => sum + g.totalQuantity, 0);

  const formatDate = (d: string) => {
    if (!d) return '—';
    try {
      return new Date(d).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return d;
    }
  };

  const isExpiringSoon = (expDate: string) => {
    if (!expDate) return false;
    const diff = new Date(expDate).getTime() - Date.now();
    return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000;
  };

  const isExpired = (expDate: string) => {
    if (!expDate) return false;
    return new Date(expDate).getTime() < Date.now();
  };

  if (error === 'BẠN_KHÔNG_CÓ_QUYỀN') {
    return (
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600">
            <Boxes className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Kho thành phẩm tại cửa hàng
            </h1>
            <p className={cn(
              "text-sm",
              darkMode ? "text-muted-foreground" : "text-gray-500"
            )}>
              Tổng quan tồn kho thành phẩm tại các cửa hàng
            </p>
          </div>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            'rounded-2xl border p-12 text-center',
            darkMode ? 'bg-card border-border' : 'bg-white border-gray-200 shadow-sm'
          )}
        >
          <div
            className={cn(
              'w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4',
              darkMode ? 'bg-amber-500/20' : 'bg-amber-100'
            )}
          >
            <AlertCircle className="w-8 h-8 text-amber-600" />
          </div>
          <h3 className={cn(
            "text-lg font-semibold mb-2",
            darkMode ? "text-white" : "text-gray-900"
          )}>
            Bạn không có quyền truy cập
          </h3>
          <p className={cn(
            "text-sm mb-4 max-w-md mx-auto",
            darkMode ? "text-muted-foreground" : "text-gray-500"
          )}>
            Trang Kho thành phẩm chỉ dành cho Admin và Manager. Vui lòng liên hệ quản trị viên
            nếu bạn cần quyền truy cập.
          </p>
          <p className={cn(
            "text-xs",
            darkMode ? "text-muted-foreground" : "text-gray-500"
          )}>
            API: <code className={cn(
              "px-1.5 py-0.5 rounded",
              darkMode ? "bg-gray-800 text-gray-300" : "bg-gray-100 text-gray-700"
            )}>GET /api/inventory/all</code> — Permissions: Admin, Manager only
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600">
            <Boxes className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className={cn(
              "text-2xl font-bold",
              darkMode ? "text-white" : "text-gray-900"
            )}>
              Kho thành phẩm tại cửa hàng
            </h1>
            <p className={cn(
              "text-sm",
              darkMode ? "text-muted-foreground" : "text-gray-500"
            )}>
              Tổng quan tồn kho thành phẩm tại các cửa hàng
            </p>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      {!loading && error !== 'BẠN_KHÔNG_CÓ_QUYỀN' && (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          <motion.div
            variants={item}
            className={cn(
              'rounded-2xl border p-5',
              darkMode ? 'bg-card border-border' : 'bg-white border-gray-200 shadow-sm'
            )}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600">
                <Store className="w-5 h-5 text-white" />
              </div>
              <span className={cn(
                "text-sm font-medium",
                darkMode ? "text-muted-foreground" : "text-gray-500"
              )}>Cửa hàng</span>
            </div>
            <p className={cn(
              "text-3xl font-bold",
              darkMode ? "text-white" : "text-gray-900"
            )}>{totalStores}</p>
          </motion.div>

          <motion.div
            variants={item}
            className={cn(
              'rounded-2xl border p-5',
              darkMode ? 'bg-card border-border' : 'bg-white border-gray-200 shadow-sm'
            )}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600">
                <Package className="w-5 h-5 text-white" />
              </div>
              <span className={cn(
                "text-sm font-medium",
                darkMode ? "text-muted-foreground" : "text-gray-500"
              )}>Sản phẩm</span>
            </div>
            <p className={cn(
              "text-3xl font-bold",
              darkMode ? "text-white" : "text-gray-900"
            )}>{totalProducts}</p>
          </motion.div>

          <motion.div
            variants={item}
            className={cn(
              'rounded-2xl border p-5',
              darkMode ? 'bg-card border-border' : 'bg-white border-gray-200 shadow-sm'
            )}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600">
                <Boxes className="w-5 h-5 text-white" />
              </div>
              <span className={cn(
                "text-sm font-medium",
                darkMode ? "text-muted-foreground" : "text-gray-500"
              )}>Tổng tồn kho</span>
            </div>
            <p className={cn(
              "text-3xl font-bold",
              darkMode ? "text-white" : "text-gray-900"
            )}>
              {totalQuantity.toLocaleString()}
            </p>
          </motion.div>
        </motion.div>
      )}

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className={cn(
          'rounded-2xl border p-4',
          darkMode ? 'bg-card border-border' : 'bg-white border-gray-200 shadow-sm'
        )}
      >
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search
              className={cn(
                'absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5',
                darkMode ? 'text-gray-500' : 'text-gray-400'
              )}
            />
            <input
              type="text"
              placeholder="Tìm kiếm sản phẩm, SKU, lô hàng..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={cn(
                'w-full pl-10 pr-4 py-3 rounded-xl border text-sm',
                darkMode
                  ? 'bg-muted border-border text-white placeholder-muted-foreground'
                  : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'
              )}
            />
          </div>

          {/* Store Filter */}
          <select
            value={selectedStoreId}
            onChange={(e) => setSelectedStoreId(e.target.value)}
            className={cn(
              'px-4 py-3 rounded-xl border text-sm font-medium',
              darkMode
                ? 'bg-muted border-border text-white'
                : 'bg-gray-50 border-gray-200 text-gray-700'
            )}
          >
            <option value="all">Tất cả cửa hàng</option>
            {stores.map((s) => (
              <option key={s._id} value={s._id}>
                {s.storeName || s.name || s.storeCode || s._id}
              </option>
            ))}
          </select>
        </div>
      </motion.div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className={cn(
            "text-sm font-medium uppercase tracking-widest",
            darkMode ? "text-muted-foreground" : "text-gray-500"
          )}>
            Đang tải dữ liệu...
          </p>
        </div>
      ) : filteredGroups.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            'rounded-2xl border p-12 text-center',
            darkMode ? 'bg-card border-border' : 'bg-white border-gray-200 shadow-sm'
          )}
        >
          <Package className={cn('h-16 w-16 mx-auto mb-4 opacity-40', darkMode ? 'text-gray-600' : 'text-gray-400')} />
          <p className={cn(
            "text-lg font-medium",
            darkMode ? "text-muted-foreground" : "text-gray-500"
          )}>Không có dữ liệu tồn kho</p>
          <p className={cn(
            "text-sm mt-1",
            darkMode ? "text-muted-foreground" : "text-gray-500"
          )}>
            Không có sản phẩm nào khớp với bộ lọc hiện tại
          </p>
        </motion.div>
      ) : (
        <div className="space-y-6">
          {filteredGroups.map((group, groupIdx) => (
            <motion.div
              key={group.store.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: groupIdx * 0.05 }}
              className={cn(
                'rounded-2xl border overflow-hidden',
                darkMode ? 'bg-card border-border' : 'bg-white border-gray-200 shadow-sm'
              )}
            >
              {/* Store Header */}
              <div
                className={cn(
                  'px-6 py-4 border-b flex items-center justify-between',
                  darkMode
                    ? 'bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-border'
                    : 'bg-gradient-to-r from-emerald-50 to-teal-50 border-gray-200'
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
                    <Store className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h3 className={cn(
                      "font-semibold",
                      darkMode ? "text-white" : "text-gray-900"
                    )}>
                      {group.store.name}
                    </h3>
                    <p className={cn(
                      "text-xs",
                      darkMode ? "text-muted-foreground" : "text-gray-500"
                    )}>{group.store.address}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className={cn(
                      "text-xs",
                      darkMode ? "text-muted-foreground" : "text-gray-500"
                    )}>Sản phẩm</p>
                    <p className={cn(
                      "font-bold",
                      darkMode ? "text-emerald-400" : "text-emerald-600"
                    )}>
                      {group.items.length}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      "text-xs",
                      darkMode ? "text-muted-foreground" : "text-gray-500"
                    )}>Tổng tồn</p>
                    <p className={cn(
                      "font-bold",
                      darkMode ? "text-white" : "text-gray-900"
                    )}>
                      {group.totalQuantity.toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => navigate(`${basePath}/finished-goods/${group.store.id}`)}
                    className="ml-2 p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white hover:opacity-90 transition-opacity"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Items Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr
                      className={cn(
                        'border-b text-left',
                        darkMode ? 'bg-muted/50 border-border' : 'bg-gray-50 border-gray-100'
                      )}
                    >
                      <th className={cn(
                        "px-6 py-3 font-medium",
                        darkMode ? "text-muted-foreground" : "text-gray-500"
                      )}>Sản phẩm</th>
                      <th className={cn(
                        "px-4 py-3 font-medium",
                        darkMode ? "text-muted-foreground" : "text-gray-500"
                      )}>SKU</th>
                      <th className={cn(
                        "px-4 py-3 font-medium",
                        darkMode ? "text-muted-foreground" : "text-gray-500"
                      )}>Lô hàng</th>
                      <th className={cn(
                        "px-4 py-3 font-medium text-center",
                        darkMode ? "text-muted-foreground" : "text-gray-500"
                      )}>
                        SL tồn
                      </th>
                      <th className={cn(
                        "px-4 py-3 font-medium",
                        darkMode ? "text-muted-foreground" : "text-gray-500"
                      )}>NSX</th>
                      <th className={cn(
                        "px-4 py-3 font-medium",
                        darkMode ? "text-muted-foreground" : "text-gray-500"
                      )}>HSD</th>
                      <th className={cn(
                        "px-4 py-3 font-medium",
                        darkMode ? "text-muted-foreground" : "text-gray-500"
                      )}>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className={darkMode ? 'divide-y divide-gray-800' : 'divide-y divide-gray-100'}>
                    {group.items.map((inv, idx) => {
                      const product = typeof inv.productId === 'object' ? inv.productId : null;
                      const batch = typeof inv.batchId === 'object' ? inv.batchId : null;
                      const expDate = batch?.expDate || '';
                      const expired = isExpired(expDate);
                      const expiring = isExpiringSoon(expDate);

                      return (
                        <tr
                          key={inv._id || idx}
                          className={cn(
                            'transition-colors',
                            darkMode ? 'hover:bg-muted/50' : 'hover:bg-gray-50'
                          )}
                        >
                          <td className="px-6 py-3">
                            <span className={cn(
                              "font-semibold",
                              darkMode ? "text-white" : "text-gray-900"
                            )}>
                              {product?.name || '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={cn(
                              "font-mono text-xs",
                              darkMode ? "text-gray-400" : "text-gray-500"
                            )}>
                              {product?.sku || '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={cn(
                              "font-mono text-xs",
                              darkMode ? "text-gray-400" : "text-gray-500"
                            )}>
                              {batch?.batchCode || '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={cn(
                                'font-bold',
                                expired
                                  ? darkMode ? 'text-red-400' : 'text-red-600'
                                  : expiring
                                    ? darkMode ? 'text-amber-400' : 'text-amber-600'
                                    : darkMode ? 'text-emerald-400' : 'text-emerald-600'
                              )}
                            >
                              {inv.quantity}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={cn(
                              "text-xs",
                              darkMode ? "text-gray-400" : "text-gray-500"
                            )}>
                              {batch?.mfgDate ? formatDate(batch.mfgDate) : '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={cn(
                                'text-xs font-medium',
                                expired
                                  ? darkMode ? 'text-red-400' : 'text-red-600'
                                  : expiring
                                    ? darkMode ? 'text-amber-400' : 'text-amber-600'
                                    : darkMode ? "text-muted-foreground" : "text-gray-500"
                              )}
                            >
                              {expDate ? formatDate(expDate) : '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              {expired ? (
                                <>
                                  <XCircle className={cn(
                                    "w-3.5 h-3.5",
                                    darkMode ? "text-red-400" : "text-red-600"
                                  )} />
                                  <span className={cn(
                                    "text-xs font-medium",
                                    darkMode ? "text-red-400" : "text-red-600"
                                  )}>
                                    Hết hạn
                                  </span>
                                </>
                              ) : expiring ? (
                                <>
                                  <Clock className={cn(
                                    "w-3.5 h-3.5",
                                    darkMode ? "text-amber-400" : "text-amber-600"
                                  )} />
                                  <span className={cn(
                                    "text-xs font-medium",
                                    darkMode ? "text-amber-400" : "text-amber-600"
                                  )}>
                                    Sắp hết hạn
                                  </span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className={cn(
                                    "w-3.5 h-3.5",
                                    darkMode ? "text-emerald-400" : "text-emerald-600"
                                  )} />
                                  <span className={cn(
                                    "text-xs font-medium",
                                    darkMode ? "text-emerald-400" : "text-emerald-600"
                                  )}>
                                    Còn tốt
                                  </span>
                                </>
                              )}
                            </div>
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
