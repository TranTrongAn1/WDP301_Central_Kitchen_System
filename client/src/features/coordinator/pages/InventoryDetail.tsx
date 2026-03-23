import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Boxes,
  Package,
  Loader2,
  ArrowLeft,
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import {
  inventoryApi,
  type StoreInventoryItem,
  type StoreInventoryResponse,
} from '@/api/InventoryApi';
import { storeApi, type Store as StoreType } from '@/api/StoreApi';
import { useThemeStore } from '@/shared/zustand/themeStore';
import toast from 'react-hot-toast';
import { cn } from '@/shared/lib/utils';
import { useAuthStore } from '@/shared/zustand/authStore';

export default function CoordinatorInventoryDetailPage() {
  const { storeId } = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const { darkMode } = useThemeStore();
  const { user } = useAuthStore();

  // Get base path based on user role
  const getBasePath = () => {
    const role = user?.role;
    if (role === 'Admin') return '/admin';
    if (role === 'Manager') return '/manager';
    return '/coordinator';
  };
  const basePath = getBasePath();

  const [loading, setLoading] = useState(true);
  const [store, setStore] = useState<{ id: string; name: string; address: string } | null>(null);
  const [items, setItems] = useState<StoreInventoryItem[]>([]);
  const [summary, setSummary] = useState<
    { productId: string; productName: string; productSku: string; totalQuantity: number; batches: number }[]
  >([]);
  const [storeInfo, setStoreInfo] = useState<StoreType | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!storeId) return;
    setLoading(true);
    setError(null);
    try {
      const [inventoryRes, storesRes] = await Promise.all([
        inventoryApi.getByStore(storeId).catch((err: unknown) => {
          const axiosErr = err as { response?: { status?: number } };
          if (axiosErr?.response?.status === 403) {
            throw new Error('BẠN_KHÔNG_CÓ_QUYỀN');
          }
          throw err;
        }),
        storeApi.getAllStores().catch(() => []),
      ]);

      // Set store info
      const storeFromRes = (inventoryRes as unknown as StoreInventoryResponse)?.store;
      if (storeFromRes) {
        setStore(storeFromRes);
      }

      // Find matching store from stores list
      const matchedStore = (storesRes as StoreType[]).find((s) => s._id === storeId);
      if (matchedStore && !storeFromRes) {
        setStore({
          id: matchedStore._id,
          name: matchedStore.storeName || matchedStore.name || 'Cửa hàng',
          address: matchedStore.address || '',
        });
      }
      setStoreInfo(matchedStore || null);

      // Set inventory data
      const data = (inventoryRes as unknown as StoreInventoryResponse)?.data || [];
      setItems(data);
      setSummary((inventoryRes as unknown as StoreInventoryResponse)?.summary || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'BẠN_KHÔNG_CÓ_QUYỀN') {
        setError('BẠN_KHÔNG_CÓ_QUYỀN');
      } else {
        toast.error('Không thể tải dữ liệu kho');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [storeId]);

  const filteredItems = useMemo(() => {
    if (!searchTerm) return items;
    const term = searchTerm.toLowerCase();
    return items.filter((item) => {
      const productName = typeof item.productId === 'object' ? item.productId.name : '';
      const batchCode = typeof item.batchId === 'object' ? item.batchId.batchCode : '';
      const sku = typeof item.productId === 'object' ? item.productId.sku : '';
      return (
        productName.toLowerCase().includes(term) ||
        batchCode.toLowerCase().includes(term) ||
        sku.toLowerCase().includes(term)
      );
    });
  }, [items, searchTerm]);

  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalBatches = summary.reduce((sum, s) => sum + s.batches, 0);

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
            <Boxes className="w-8 h-8 text-amber-600" />
          </div>
          <h3 className={cn(
            "text-lg font-semibold mb-2",
            darkMode ? "text-white" : "text-gray-900"
          )}>
            Bạn không có quyền truy cập
          </h3>
          <p className={cn(
            "text-sm mb-6 max-w-md mx-auto",
            darkMode ? "text-muted-foreground" : "text-gray-500"
          )}>
            Trang chi tiết kho chỉ dành cho Admin và Manager.
          </p>
          <button
            onClick={() => navigate(`${basePath}/finished-goods`)}
            className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            Quay lại kho thành phẩm
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-4 mb-1">
          <button
            onClick={() => navigate(`${basePath}/finished-goods`)}
            className={cn(
              'p-2.5 rounded-xl border transition-colors',
              darkMode ? 'bg-card border-border hover:bg-muted' : 'bg-white border-gray-200 hover:bg-gray-50'
            )}
          >
            <ArrowLeft className={cn(
              "h-5 w-5",
              darkMode ? "text-muted-foreground" : "text-gray-500"
            )} />
          </button>
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600">
            <Boxes className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className={cn(
              "text-2xl font-bold",
              darkMode ? "text-white" : "text-gray-900"
            )}>
              {store?.name || storeInfo?.storeName || storeInfo?.name || 'Chi tiết kho'}
            </h1>
            <p className={cn(
              "text-sm",
              darkMode ? "text-muted-foreground" : "text-gray-500"
            )}>
              {store?.address || storeInfo?.address || ''}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      {!loading && !error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          <div
            className={cn(
              'rounded-2xl border p-5',
              darkMode ? 'bg-card border-border' : 'bg-white border-gray-200 shadow-sm'
            )}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600">
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
            )}>
              {summary.length}
            </p>
          </div>

          <div
            className={cn(
              'rounded-2xl border p-5',
              darkMode ? 'bg-card border-border' : 'bg-white border-gray-200 shadow-sm'
            )}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600">
                <Boxes className="w-5 h-5 text-white" />
              </div>
              <span className={cn(
                "text-sm font-medium",
                darkMode ? "text-muted-foreground" : "text-gray-500"
              )}>Lô hàng</span>
            </div>
            <p className={cn(
              "text-3xl font-bold",
              darkMode ? "text-white" : "text-gray-900"
            )}>{totalBatches}</p>
          </div>

          <div
            className={cn(
              'rounded-2xl border p-5',
              darkMode ? 'bg-card border-border' : 'bg-white border-gray-200 shadow-sm'
            )}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600">
                <Package className="w-5 h-5 text-white" />
              </div>
              <span className={cn(
                "text-sm font-medium",
                darkMode ? "text-muted-foreground" : "text-gray-500"
              )}>Tổng tồn</span>
            </div>
            <p className={cn(
              "text-3xl font-bold",
              darkMode ? "text-white" : "text-gray-900"
            )}>
              {totalQuantity.toLocaleString()}
            </p>
          </div>
        </motion.div>
      )}

      {/* Summary Table */}
      {!loading && !error && summary.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className={cn(
            'rounded-2xl border overflow-hidden',
            darkMode ? 'bg-card border-border' : 'bg-white border-gray-200 shadow-sm'
          )}
        >
          <div
            className={cn(
              'px-6 py-4 border-b',
              darkMode ? 'border-border bg-muted/30' : 'border-gray-100 bg-gray-50'
            )}
          >
            <h3 className={cn(
              "font-semibold",
              darkMode ? "text-white" : "text-gray-900"
            )}>Tổng quan theo sản phẩm</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={cn(
                  "text-left border-b",
                  darkMode ? "border-border" : "border-gray-200"
                )}>
                  <th className={cn(
                    "px-6 py-3 font-medium",
                    darkMode ? "text-muted-foreground" : "text-gray-500"
                  )}>Sản phẩm</th>
                  <th className={cn(
                    "px-4 py-3 font-medium",
                    darkMode ? "text-muted-foreground" : "text-gray-500"
                  )}>SKU</th>
                  <th className={cn(
                    "px-4 py-3 font-medium text-center",
                    darkMode ? "text-muted-foreground" : "text-gray-500"
                  )}>
                    Số lô
                  </th>
                  <th className={cn(
                    "px-4 py-3 font-medium text-right",
                    darkMode ? "text-muted-foreground" : "text-gray-500"
                  )}>
                    Tổng tồn
                  </th>
                </tr>
              </thead>
              <tbody className={darkMode ? 'divide-y divide-gray-800' : 'divide-y divide-gray-100'}>
                {summary.map((s) => (
                  <tr className={cn(
                    "transition-colors",
                    darkMode ? "hover:bg-muted/50" : "hover:bg-gray-50"
                  )}>
                    <td className="px-6 py-3">
                      <span className={cn(
                        "font-semibold",
                        darkMode ? "text-white" : "text-gray-900"
                      )}>
                        {s.productName}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "font-mono text-xs",
                        darkMode ? "text-gray-400" : "text-gray-500"
                      )}>
                        {s.productSku}
                      </span>
                    </td>
                    <td className={cn(
                      "px-4 py-3 text-center",
                      darkMode ? "text-gray-400" : "text-gray-500"
                    )}>{s.batches}</td>
                    <td className={cn(
                      "px-4 py-3 text-right font-bold",
                      darkMode ? "text-emerald-400" : "text-emerald-600"
                    )}>
                      {s.totalQuantity.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Filters */}
      {!loading && !error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className={cn(
            'rounded-2xl border p-4 flex flex-col lg:flex-row gap-4 items-center justify-between',
            darkMode ? 'bg-card border-border' : 'bg-white border-gray-200 shadow-sm'
          )}
        >
          <div className="relative flex-1 w-full">
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
          <button
            onClick={fetchData}
            className={cn(
              'px-4 py-2.5 rounded-xl border text-sm font-medium flex items-center gap-2 transition-colors',
              darkMode
                ? 'bg-muted border-border hover:bg-muted/80 text-white'
                : 'bg-gray-50 border-gray-200 hover:bg-gray-100 text-gray-700'
            )}
          >
            <RefreshCw className="w-4 h-4" />
            Làm mới
          </button>
        </motion.div>
      )}

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
      ) : filteredItems.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            'rounded-2xl border p-12 text-center',
            darkMode ? 'bg-card border-border' : 'bg-white border-gray-200 shadow-sm'
          )}
        >
          <Package
            className={cn('h-16 w-16 mx-auto mb-4 opacity-40', darkMode ? 'text-gray-600' : 'text-gray-400')}
          />
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
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className={cn(
            'rounded-2xl border overflow-hidden',
            darkMode ? 'bg-card border-border' : 'bg-white border-gray-200 shadow-sm'
          )}
        >
          <div
            className={cn(
              'px-6 py-4 border-b',
              darkMode ? 'border-border bg-muted/30' : 'border-gray-100 bg-gray-50'
            )}
          >
            <h3 className={cn(
              "font-semibold",
              darkMode ? "text-white" : "text-gray-900"
            )}>
              Chi tiết tồn kho ({filteredItems.length} bản ghi)
            </h3>
          </div>
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
                  )}>SL tồn</th>
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
                {filteredItems.map((inv, idx) => {
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
      )}
    </div>
  );
}
