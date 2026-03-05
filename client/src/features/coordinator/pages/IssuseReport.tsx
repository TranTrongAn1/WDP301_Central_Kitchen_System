import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Search, Loader2, Package, Eye } from 'lucide-react';
import { OrderApi, type Order } from '@/api/OrderApi';
import toast from 'react-hot-toast';
import { cn } from '@/shared/lib/utils';

interface DiscrepancyItem {
  orderId: string;
  orderCode: string;
  storeName: string;
  receivedDate: string;
  productName: string;
  quantityRequested: number;
  quantityApproved: number;
  quantityReceived: number;
  discrepancyReason: string;
  note: string;
}

export default function IssueReportPage() {
  const [loading, setLoading] = useState(true);
  const [issues, setIssues] = useState<DiscrepancyItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    fetchIssues();
  }, []);

  const fetchIssues = async () => {
    setLoading(true);
    try {
      // Get received orders that might have discrepancies
      const allOrders = await OrderApi.getAllOrders({ status: 'Received' });
      const issueItems: DiscrepancyItem[] = [];

      for (const order of allOrders) {
        if (!Array.isArray(order.items)) continue;

        for (const item of order.items) {
          const requested = item.quantityRequested ?? item.quantity ?? 0;
          const approved = item.approvedQuantity ?? item.quantity ?? requested;
          const received = item.receivedQuantity ?? 0;

          // If there's a discrepancy (received != approved or has notes)
          if (received > 0 && (received < approved || item.discrepancyReason || item.note)) {
            const product = typeof item.productId === 'object' ? item.productId : null;
            const store = typeof order.storeId === 'object' ? order.storeId : null;

            issueItems.push({
              orderId: order._id,
              orderCode: order.orderCode || order.orderNumber || order._id,
              storeName: store?.storeName || 'Unknown',
              receivedDate: order.receivedDate || order.updatedAt || '',
              productName: product?.name || 'Unknown Product',
              quantityRequested: requested,
              quantityApproved: approved,
              quantityReceived: received,
              discrepancyReason: item.discrepancyReason || '',
              note: item.note || '',
            });
          }
        }
      }

      setIssues(issueItems);
    } catch {
      toast.error('Failed to load issue reports');
    } finally {
      setLoading(false);
    }
  };

  const filteredIssues = issues.filter((issue) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      issue.orderCode.toLowerCase().includes(term) ||
      issue.storeName.toLowerCase().includes(term) ||
      issue.productName.toLowerCase().includes(term) ||
      issue.discrepancyReason.toLowerCase().includes(term)
    );
  });

  const handleViewOrder = async (orderId: string) => {
    try {
      const order = await OrderApi.getOrderById(orderId);
      setSelectedOrder(order);
      setShowDetail(true);
    } catch {
      toast.error('Failed to load order details');
    }
  };

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString('vi-VN'); } catch { return d; }
  };

  const getReasonBadge = (reason: string) => {
    switch (reason) {
      case 'Missing':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'Damaged':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 rounded-xl bg-gradient-to-br from-red-500 to-rose-600">
            <AlertTriangle className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Issue Reports</h1>
        </div>
        <p className="text-muted-foreground text-sm">Delivery discrepancies and receiving issues</p>
      </motion.div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-2xl font-bold text-foreground">{loading ? '—' : issues.length}</p>
          <p className="text-xs text-muted-foreground">Total Issues</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-2xl font-bold text-amber-600">{loading ? '—' : issues.filter(i => i.discrepancyReason === 'Missing').length}</p>
          <p className="text-xs text-muted-foreground">Missing Items</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-2xl font-bold text-red-600">{loading ? '—' : issues.filter(i => i.discrepancyReason === 'Damaged').length}</p>
          <p className="text-xs text-muted-foreground">Damaged Items</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by order, store, product..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredIssues.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p className="text-lg font-medium">No issues found</p>
          <p className="text-sm">All deliveries were received without discrepancies</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground bg-secondary/30">
                  <th className="px-5 py-3 font-medium">Order</th>
                  <th className="px-3 py-3 font-medium">Store</th>
                  <th className="px-3 py-3 font-medium">Product</th>
                  <th className="px-3 py-3 font-medium text-center">Approved</th>
                  <th className="px-3 py-3 font-medium text-center">Received</th>
                  <th className="px-3 py-3 font-medium text-center">Diff</th>
                  <th className="px-3 py-3 font-medium">Reason</th>
                  <th className="px-3 py-3 font-medium">Date</th>
                  <th className="px-3 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredIssues.map((issue, idx) => {
                  const diff = issue.quantityApproved - issue.quantityReceived;
                  return (
                    <tr key={`${issue.orderId}-${idx}`} className="border-b border-border/50 hover:bg-secondary/10">
                      <td className="px-5 py-2.5 font-mono text-xs font-medium">{issue.orderCode}</td>
                      <td className="px-3 py-2.5">{issue.storeName}</td>
                      <td className="px-3 py-2.5">{issue.productName}</td>
                      <td className="px-3 py-2.5 text-center">{issue.quantityApproved}</td>
                      <td className="px-3 py-2.5 text-center font-medium">{issue.quantityReceived}</td>
                      <td className="px-3 py-2.5 text-center">
                        {diff > 0 && (
                          <span className="text-red-600 font-semibold">-{diff}</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {issue.discrepancyReason && (
                          <span className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                            getReasonBadge(issue.discrepancyReason)
                          )}>
                            {issue.discrepancyReason}
                          </span>
                        )}
                        {issue.note && (
                          <p className="text-xs text-muted-foreground mt-0.5">{issue.note}</p>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-xs">{issue.receivedDate ? formatDate(issue.receivedDate) : '—'}</td>
                      <td className="px-3 py-2.5">
                        <button
                          onClick={() => handleViewOrder(issue.orderId)}
                          className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                          title="View Order"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {showDetail && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowDetail(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card border border-border rounded-2xl shadow-2xl max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-bold">Order Details</h3>
              <p className="text-sm text-muted-foreground">{selectedOrder.orderCode || selectedOrder.orderNumber}</p>
            </div>
            <div className="p-6 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium">{selectedOrder.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Received Date</span>
                <span>{selectedOrder.receivedDate ? formatDate(selectedOrder.receivedDate) : '—'}</span>
              </div>
              <div className="border-t border-border pt-3 mt-3">
                <p className="font-medium mb-2">Items</p>
                {selectedOrder.items?.map((it: any, idx: number) => {
                  const product = typeof it.productId === 'object' ? it.productId : null;
                  return (
                    <div key={idx} className="flex justify-between py-1.5 border-b border-border/50 last:border-0">
                      <span>{product?.name || 'Product'}</span>
                      <span className="text-xs">
                        Req: {it.quantityRequested ?? it.quantity} / Rcv: {it.receivedQuantity ?? '—'}
                        {it.discrepancyReason && (
                          <span className={cn('ml-2 px-1.5 py-0.5 rounded text-[10px]', getReasonBadge(it.discrepancyReason))}>
                            {it.discrepancyReason}
                          </span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="p-4 border-t border-border flex justify-end">
              <button
                onClick={() => setShowDetail(false)}
                className="px-4 py-2 rounded-lg bg-secondary text-sm font-medium hover:bg-secondary/80"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}