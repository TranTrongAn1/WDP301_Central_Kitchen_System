import { useState, useEffect, useCallback } from 'react';
import { ingredientRequestApi } from '@/api/IngredientRequestApi';
import { useAuthStore } from '@/shared/zustand/authStore';
import { useThemeStore } from '@/shared/zustand/themeStore';
import toast from 'react-hot-toast';
import type { IngredientRequest, IngredientRequestStatus } from '@/shared/types/ingredientRequest';
import { CompleteRequestDialog } from '../components/CompleteRequestDialog';
import { CreateRequestDialog } from '../components/CreateRequestDialog';
import {
  Plus, Loader2, Calendar, ClipboardList, Clock, CheckCircle2,
  Package, TruckIcon, AlertTriangle, Search, X, Filter, ChevronDown,
  TrendingUp, BarChart3
} from 'lucide-react';

const STATUS_OPTIONS: { value: 'ALL' | IngredientRequestStatus; label: string }[] = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'PENDING', label: 'Chờ duyệt' },
  { value: 'APPROVED', label: 'Đã duyệt' },
  { value: 'REJECTED', label: 'Từ chối' },
  { value: 'COMPLETED', label: 'Hoàn tất' },
];

function getIngredientDisplay(req: IngredientRequest): { name: string; code?: string } {
  const ing = req.ingredientId;
  if (!ing) return { name: '—' };
  if (typeof ing === 'string') return { name: ing };
  const obj = ing as { name?: string; ingredientName?: string; code?: string; ingredientCode?: string };
  return {
    name: obj?.ingredientName ?? obj?.name ?? '—',
    code: obj?.code ?? obj?.ingredientCode
  };
}

function StatusBadge({ status }: { status: IngredientRequestStatus }) {
  const map: Record<IngredientRequestStatus, { variant: 'default' | 'secondary' | 'destructive' | 'warning' | 'success'; label: string; icon: string }> = {
    PENDING: { variant: 'warning', label: 'Chờ duyệt', icon: 'schedule' },
    APPROVED: { variant: 'secondary', label: 'Đã duyệt', icon: 'verified' },
    REJECTED: { variant: 'destructive', label: 'Từ chối', icon: 'cancel' },
    COMPLETED: { variant: 'success', label: 'Hoàn tất', icon: 'check_circle' },
  };
  const c = map[status] ?? { variant: 'secondary', label: status, icon: 'help' };
  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border ${
      status === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800' :
      status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800' :
      status === 'REJECTED' ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800' :
      status === 'COMPLETED' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' :
      'bg-gray-100 text-gray-700 border-gray-200'
    }`}>
      <span className="material-symbols-outlined text-[12px]">{c.icon}</span>
      {c.label}
    </div>
  );
}

function RequestTypeBadge({ type }: { type: 'URGENT' | 'PLANNED' }) {
  const isUrgent = type === 'URGENT';
  return (
    <div className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border w-fit uppercase tracking-tight flex items-center gap-1 ${
      isUrgent
        ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-950/30 dark:border-red-800 dark:text-red-400'
        : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-400'
    }`}>
      <span className="material-symbols-outlined text-[10px]">{isUrgent ? 'priority_high' : 'event'}</span>
      {isUrgent ? 'Mua Gấp' : 'Kế Hoạch'}
    </div>
  );
}

function formatDate(iso: string | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export default function IngredientRequestListPage() {
  const { hasRole } = useAuthStore();
  const { darkMode } = useThemeStore();

  const [list, setList] = useState<IngredientRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | IngredientRequestStatus>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'URGENT' | 'PLANNED'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const [completeRequest, setCompleteRequest] = useState<IngredientRequest | null>(null);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const canApproveReject = hasRole(['Coordinator', 'Admin', 'Manager']);
  const canCreate = hasRole(['KitchenStaff', 'Admin']);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await ingredientRequestApi.getList(
        statusFilter === 'ALL' ? undefined : { status: statusFilter }
      );
      setList(res?.data ?? []);
    } catch (err: any) {
      toast.error('Tải danh sách thất bại.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchList(); }, [fetchList]);

  const handleApprove = async (id: string, type: 'URGENT' | 'PLANNED', request: IngredientRequest) => {
    if (type === 'URGENT') {
      // For URGENT: Open the complete dialog to enter actual cost, expiry date
      setCompleteRequest(request);
      setCompleteOpen(true);
      return;
    }
    
    // For PLANNED: Approve directly with expectedDeliveryDate
    setActionId(id);
    try {
      // Use neededByDate as default expectedDeliveryDate if not set
      const expectedDate = request.neededByDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      await ingredientRequestApi.updateStatus(id, {
        status: 'APPROVED',
        expectedDeliveryDate: expectedDate,
      });
      toast.success('Đã duyệt phiếu kế hoạch');
      fetchList();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Thao tác thất bại.';
      toast.error(msg);
    } finally { setActionId(null); }
  };

  const handleReject = async (id: string) => {
    setActionId(id);
    try {
      await ingredientRequestApi.updateStatus(id, { status: 'REJECTED' });
      toast.success('Đã từ chối phiếu.');
      fetchList();
    } catch (err: any) {
      toast.error('Từ chối thất bại.');
    } finally { setActionId(null); }
  };

  // Stats
  const stats = {
    total: list.length,
    pending: list.filter(r => r.status === 'PENDING').length,
    approved: list.filter(r => r.status === 'APPROVED').length,
    completed: list.filter(r => r.status === 'COMPLETED').length,
    rejected: list.filter(r => r.status === 'REJECTED').length,
    urgent: list.filter(r => r.requestType === 'URGENT').length,
    planned: list.filter(r => r.requestType === 'PLANNED').length,
    totalQuantity: list.reduce((sum, r) => sum + (r.quantityRequested || 0), 0),
    pendingQuantity: list.filter(r => r.status === 'PENDING').reduce((sum, r) => sum + (r.quantityRequested || 0), 0),
  };

  // Filtered list
  const filteredList = list.filter(req => {
    if (typeFilter !== 'ALL' && req.requestType !== typeFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const ing = getIngredientDisplay(req);
      return (
        ing.name.toLowerCase().includes(term) ||
        ing.code?.toLowerCase().includes(term) ||
        req.note?.toLowerCase().includes(term)
      );
    }
    return true;
  });

  return (
    <div className={`min-h-screen ${!darkMode ? 'bg-gradient-to-br from-gray-50 to-orange-50/30' : ''}`}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className={`p-2.5 rounded-xl ${darkMode ? 'bg-primary/15' : 'bg-orange-50'}`}>
            <ClipboardList className={`w-6 h-6 ${darkMode ? 'text-primary' : 'text-orange-600'}`} />
          </div>
          <div>
            <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Yêu cầu nguyên liệu
            </h1>
            <p className="text-sm text-muted-foreground">Theo dõi và xử lý phê duyệt mua sắm nguyên liệu</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
        {/* Total */}
        <div className={`rounded-2xl border p-5 ${darkMode ? 'bg-card border-border' : 'bg-white border-gray-200 shadow-sm'}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2 rounded-lg ${darkMode ? 'bg-muted' : 'bg-orange-50'}`}>
              <ClipboardList className={`w-5 h-5 ${darkMode ? 'text-primary' : 'text-orange-600'}`} />
            </div>
            <span className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Tổng phiếu</span>
          </div>
          <p className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{stats.total}</p>
        </div>

        {/* Pending */}
        <div className={`rounded-2xl border p-5 ${darkMode ? 'bg-card border-border' : 'bg-white border-gray-200 shadow-sm'}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2 rounded-lg ${darkMode ? 'bg-amber-500/10' : 'bg-amber-50'}`}>
              <Clock className={`w-5 h-5 ${darkMode ? 'text-amber-400' : 'text-amber-600'}`} />
            </div>
            <span className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Chờ duyệt</span>
          </div>
          <p className={`text-3xl font-bold ${darkMode ? 'text-amber-400' : 'text-amber-600'}`}>{stats.pending}</p>
        </div>

        {/* Approved */}
        <div className={`rounded-2xl border p-5 ${darkMode ? 'bg-card border-border' : 'bg-white border-gray-200 shadow-sm'}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2 rounded-lg ${darkMode ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}>
              <CheckCircle2 className={`w-5 h-5 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
            </div>
            <span className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Đã duyệt</span>
          </div>
          <p className={`text-3xl font-bold ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>{stats.approved}</p>
        </div>

        {/* Completed */}
        <div className={`rounded-2xl border p-5 ${darkMode ? 'bg-card border-border' : 'bg-white border-gray-200 shadow-sm'}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2 rounded-lg ${darkMode ? 'bg-green-500/10' : 'bg-green-50'}`}>
              <Package className={`w-5 h-5 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
            </div>
            <span className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Hoàn tất</span>
          </div>
          <p className={`text-3xl font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>{stats.completed}</p>
        </div>

        {/* Urgent */}
        <div className={`rounded-2xl border p-5 ${darkMode ? 'bg-card border-border' : 'bg-white border-gray-200 shadow-sm'}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2 rounded-lg ${darkMode ? 'bg-red-500/10' : 'bg-red-50'}`}>
              <AlertTriangle className={`w-5 h-5 ${darkMode ? 'text-red-400' : 'text-red-600'}`} />
            </div>
            <span className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Mua gấp</span>
          </div>
          <p className={`text-3xl font-bold ${darkMode ? 'text-red-400' : 'text-red-600'}`}>{stats.urgent}</p>
        </div>
      </div>

      {/* Quantity Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className={`rounded-2xl border p-5 ${darkMode ? 'bg-card border-border' : 'bg-white border-gray-200 shadow-sm'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${darkMode ? 'bg-primary/15' : 'bg-orange-50'}`}>
              <TrendingUp className={`w-5 h-5 ${darkMode ? 'text-primary' : 'text-orange-600'}`} />
            </div>
            <div>
              <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Tổng số lượng</p>
              <p className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{stats.totalQuantity.toLocaleString()} đơn vị</p>
            </div>
          </div>
        </div>

        <div className={`rounded-2xl border p-5 ${darkMode ? 'bg-card border-border' : 'bg-white border-gray-200 shadow-sm'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${darkMode ? 'bg-amber-500/10' : 'bg-amber-50'}`}>
              <Clock className={`w-5 h-5 ${darkMode ? 'text-amber-400' : 'text-amber-600'}`} />
            </div>
            <div>
              <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Số lượng chờ duyệt</p>
              <p className={`text-xl font-bold ${darkMode ? 'text-amber-400' : 'text-amber-600'}`}>{stats.pendingQuantity.toLocaleString()} đơn vị</p>
            </div>
          </div>
        </div>

        <div className={`rounded-2xl border p-5 ${darkMode ? 'bg-card border-border' : 'bg-white border-gray-200 shadow-sm'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${darkMode ? 'bg-amber-500/10' : 'bg-amber-50'}`}>
              <BarChart3 className={`w-5 h-5 ${darkMode ? 'text-amber-400' : 'text-amber-600'}`} />
            </div>
            <div>
              <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Kế hoạch / Mua gấp</p>
              <p className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{stats.planned} / {stats.urgent}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className={`rounded-2xl border p-4 mb-6 ${darkMode ? 'bg-card border-border' : 'bg-white border-gray-200 shadow-sm'}`}>
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm nguyên liệu, mã phiếu..."
              className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm ${
                darkMode
                  ? 'bg-muted border-border text-white placeholder-muted-foreground'
                  : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'
              } focus:ring-2 focus:ring-primary/25 outline-none`}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className={`absolute right-3 top-1/2 -translate-y-1/2 ${darkMode ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Type Filter */}
          <div className="flex gap-2">
            {(['ALL', 'URGENT', 'PLANNED'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                  typeFilter === type
                    ? type === 'URGENT'
                      ? 'bg-red-500/10 border-red-300 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                      : type === 'PLANNED'
                        ? 'bg-amber-500/10 border-amber-300 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                        : 'bg-primary/15 border-orange-300 text-orange-700 dark:border-orange-700 dark:text-primary'
                    : darkMode
                      ? 'bg-muted border-border text-muted-foreground hover:border-border/80'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {type === 'ALL' ? 'Tất cả' : type === 'URGENT' ? 'Mua gấp' : 'Kế hoạch'}
              </button>
            ))}
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2.5 rounded-xl border text-sm font-medium flex items-center gap-2 ${
              showFilters
                ? darkMode
                  ? 'bg-primary/15 border-primary/40 text-primary'
                  : 'bg-orange-50 border-orange-300 text-orange-800'
                : darkMode
                  ? 'bg-muted border-border text-foreground'
                  : 'bg-gray-50 border-gray-200 text-gray-700'
            }`}
          >
            <Filter className="w-4 h-4" />
            Lọc theo trạng thái
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>

          {/* Create Button */}
          {canCreate && (
            <button
              onClick={() => setCreateOpen(true)}
              className="px-5 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white rounded-xl font-semibold text-sm transition-all flex items-center gap-2 shadow-lg shadow-orange-900/30">
              <Plus className="w-4 h-4" />
              Tạo phiếu
            </button>
          )}
        </div>

        {/* Status Tabs */}
        {showFilters && (
          <div className={`mt-4 pt-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setStatusFilter(opt.value)}
                  className={`px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
                    statusFilter === opt.value
                      ? 'bg-primary/15 border-orange-400/50 text-orange-800 dark:bg-primary/20 dark:text-primary dark:border-primary/40'
                      : darkMode
                        ? 'bg-muted border-border text-muted-foreground hover:border-border/80'
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {opt.label}
                  {opt.value !== 'ALL' && (
                    <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                      statusFilter === opt.value
                        ? 'bg-orange-200 text-orange-900 dark:bg-primary/30 dark:text-primary'
                        : darkMode
                          ? 'bg-gray-700 text-gray-400'
                          : 'bg-gray-200 text-gray-600'
                    }`}>
                      {opt.value === 'PENDING' ? stats.pending :
                       opt.value === 'APPROVED' ? stats.approved :
                       opt.value === 'COMPLETED' ? stats.completed :
                       opt.value === 'REJECTED' ? stats.rejected : 0}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Results Count */}
      <div className={`flex items-center justify-between mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
        <p className="text-sm font-medium">
          Hiển thị {filteredList.length} / {list.length} phiếu yêu cầu
        </p>
      </div>

      {/* Table */}
      <div className={`rounded-2xl border overflow-hidden ${darkMode ? 'bg-card border-border' : 'bg-white border-gray-200 shadow-sm'}`}>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest">Đang tải...</p>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="text-center py-16">
            <ClipboardList className={`w-16 h-16 mx-auto mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-300'}`} />
            <p className={`text-lg font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Không có phiếu yêu cầu nào
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px]">
              <thead>
                <tr className={`border-b ${darkMode ? 'bg-muted border-border' : 'bg-gray-50 border-gray-200'}`}>
                  <th className="px-6 py-4 text-left">
                    <span className={`text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Nguyên liệu</span>
                  </th>
                  <th className="px-4 py-4 text-center">
                    <span className={`text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Số lượng</span>
                  </th>
                  <th className="px-4 py-4 text-center">
                    <span className={`text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Loại</span>
                  </th>
                  <th className="px-4 py-4 text-center">
                    <span className={`text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Trạng thái</span>
                  </th>
                  <th className="px-4 py-4 text-center">
                    <span className={`text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Thời hạn</span>
                  </th>
                  <th className="px-4 py-4 text-left">
                    <span className={`text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Ghi chú</span>
                  </th>
                  <th className="px-6 py-4 text-right">
                    <span className={`text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Thao tác</span>
                  </th>
                </tr>
              </thead>
              <tbody className={`${darkMode ? 'divide-y divide-gray-800' : 'divide-y divide-gray-100'}`}>
                {filteredList.map((req: any) => {
                  const ing = getIngredientDisplay(req);
                  return (
                    <tr
                      key={req._id}
                      className={`transition-colors ${darkMode ? 'hover:bg-muted/80' : 'hover:bg-gray-50'}`}
                    >
                      {/* Ingredient */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {ing.name}
                          </span>
                          {ing.code && (
                            <span className={`text-xs font-mono ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                              Mã: {ing.code}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Quantity */}
                      <td className="px-4 py-4 text-center">
                        <div className="flex flex-col items-center">
                          <span className={`text-lg font-bold ${darkMode ? 'text-primary' : 'text-orange-600'}`}>
                            {req.quantityRequested?.toLocaleString() || 0}
                          </span>
                          <span className={`text-[10px] font-bold uppercase ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                            {req.unit || 'đơn vị'}
                          </span>
                        </div>
                      </td>

                      {/* Type */}
                      <td className="px-4 py-4 text-center">
                        <RequestTypeBadge type={req.requestType} />
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4 text-center">
                        <StatusBadge status={req.status} />
                      </td>

                      {/* Timeline */}
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-2 items-center">
                          <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border ${
                            req.neededByDate
                              ? darkMode
                                ? 'bg-orange-500/10 text-orange-400 border-orange-500/30'
                                : 'bg-orange-50 text-orange-600 border-orange-200'
                              : darkMode
                                ? 'bg-gray-700 text-gray-500 border-gray-600'
                                : 'bg-gray-100 text-gray-500 border-gray-200'
                          }`}>
                            <Clock className="w-3.5 h-3.5" />
                            CẦN: {req.neededByDate ? formatDate(req.neededByDate) : '--'}
                          </div>
                          {req.expectedDeliveryDate && (
                            <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border ${
                              darkMode
                                ? 'bg-teal-500/10 text-teal-400 border-teal-500/30'
                                : 'bg-teal-50 text-teal-700 border-teal-200'
                            }`}>
                              <TruckIcon className="w-3.5 h-3.5" />
                              GIAO: {formatDate(req.expectedDeliveryDate)}
                            </div>
                          )}
                          <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border ${
                            darkMode
                              ? 'bg-gray-700 text-gray-400 border-gray-600'
                              : 'bg-gray-100 text-gray-500 border-gray-200'
                          }`}>
                            <Calendar className="w-3.5 h-3.5" />
                            TẠO: {formatDate(req.createdAt)}
                          </div>
                        </div>
                      </td>

                      {/* Note */}
                      <td className="px-4 py-4">
                        <p className={`text-sm italic max-w-[200px] truncate ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {req.note || <span className={`${darkMode ? 'text-gray-600' : 'text-gray-300'}`}>—</span>}
                        </p>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end items-center gap-2">
                          {/* PENDING */}
                          {req.status === 'PENDING' && canApproveReject && (
                            <>
                              <button
                                className={`h-8 px-3 text-[11px] font-bold border rounded-lg transition-all ${
                                  req.requestType === 'URGENT'
                                    ? 'border-red-500/50 text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10'
                                    : 'border-green-500/50 text-green-600 hover:bg-green-50 dark:hover:bg-green-500/10'
                                } ${darkMode ? 'bg-muted' : 'bg-white'}`}
                                onClick={() => handleApprove(req._id, req.requestType, req)}
                                disabled={actionId === req._id}
                              >
                                {actionId === req._id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="w-3 h-3" />
                                )}
                                Duyệt
                              </button>
                              <button
                                className={`h-8 px-3 text-[11px] font-bold border rounded-lg transition-all ${
                                  darkMode
                                    ? 'border-red-500/30 text-red-400 hover:bg-red-500/10'
                                    : 'border-red-200 text-red-600 hover:bg-red-50'
                                }`}
                                onClick={() => handleReject(req._id)}
                                disabled={actionId === req._id}
                              >
                                Từ chối
                              </button>
                            </>
                          )}

                          {/* APPROVED PLANNED - Show Chốt hàng */}
                          {req.status === 'APPROVED' && req.requestType === 'PLANNED' && (
                            <button
                              className="h-8 px-3 text-[11px] font-bold bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white rounded-lg transition-all flex items-center gap-1 shadow-sm"
                              onClick={() => { setCompleteRequest(req); setCompleteOpen(true); }}
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              Chốt hàng
                            </button>
                          )}

                          {/* COMPLETED */}
                          {req.status === 'COMPLETED' && (
                            <div className={`flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-lg border ${
                              darkMode
                                ? 'bg-green-500/10 text-green-400 border-green-500/30'
                                : 'bg-green-50 text-green-600 border-green-200'
                            }`}>
                              <CheckCircle2 className="w-3 h-3" />
                              Hoàn tất
                            </div>
                          )}

                          {/* REJECTED */}
                          {req.status === 'REJECTED' && (
                            <span className={`text-[11px] font-bold uppercase opacity-40 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                              Đã từ chối
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CompleteRequestDialog
        open={completeOpen}
        onOpenChange={setCompleteOpen}
        request={completeRequest}
        onSuccess={fetchList}
      />

      <CreateRequestDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={fetchList}
      />
    </div>
  );
}
