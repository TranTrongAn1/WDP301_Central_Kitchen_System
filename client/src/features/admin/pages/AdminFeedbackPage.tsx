import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { feedbackApi, type Feedback } from '@/api/FeedbackApi';
import { returnsApi, type ReturnRequest } from '@/api/ReturnsApi';
import { useThemeStore } from '@/shared/zustand/themeStore';
import {
  MessageSquare, Star, Loader2, Filter, Search, X, ChevronDown,
  AlertTriangle, CheckCircle, Package, Store, Calendar, TrendingUp,
  ThumbsUp, ThumbsDown, ArrowUpDown, BarChart3, ImageIcon,
  RefreshCw, ArrowLeftRight, Clock, CheckCircle2, XCircle,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { feedbackActionBtnClass, feedbackStatusBadgeClass } from '@/shared/lib/statusLabels';
import toast from 'react-hot-toast';

// Extend Feedback interface to include tags
interface FeedbackExtended extends Feedback {
  tags?: string[];
  images?: string[];
  storeId?: { _id: string; storeName: string; storeCode?: string };
}

/** Tag chips: nền màu đậm rõ + chữ trắng — luôn tương phản tốt cả light lẫn dark */
const ALL_TAGS = [
  { value: 'Vận chuyển tốt', label: 'Vận chuyển tốt', color: 'bg-emerald-500 text-white border border-emerald-600' },
  { value: 'Thái độ phục vụ tốt', label: 'Thái độ phục vụ tốt', color: 'bg-teal-500 text-white border border-teal-600' },
  { value: 'Vận chuyển thiếu hàng', label: 'Thiếu hàng', color: 'bg-red-500 text-white border border-red-600' },
  { value: 'Hàng hư hỏng', label: 'Hàng hư hỏng', color: 'bg-red-600 text-white border border-red-700' },
  { value: 'Giao chậm', label: 'Giao chậm', color: 'bg-amber-500 text-white border border-amber-600' },
  { value: 'Sai sản phẩm', label: 'Sai sản phẩm', color: 'bg-orange-500 text-white border border-orange-600' },
  { value: 'Khác', label: 'Khác', color: 'bg-slate-500 text-white border border-slate-600' },
];

type SortField = 'createdAt' | 'rating';
type SortOrder = 'asc' | 'desc';

function getImageUrl(url: string | undefined): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `https://res.cloudinary.com/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'demo'}/image/upload/${url}`;
}

function FeedbackImage({ src, alt }: { src: string; alt: string }) {
  const [error, setError] = useState(false);
  const { darkMode } = useThemeStore();

  if (error || !src) {
    return (
      <div className={`w-20 h-20 rounded-xl flex items-center justify-center border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-200'}`}>
        <ImageIcon className={`w-6 h-6 ${darkMode ? 'text-gray-600' : 'text-gray-300'}`} />
      </div>
    );
  }

  return (
    <img
      src={getImageUrl(src)}
      alt={alt}
      className="w-20 h-20 rounded-xl object-cover border cursor-pointer hover:opacity-80 transition-opacity"
      onClick={() => window.open(getImageUrl(src), '_blank')}
      onError={() => setError(true)}
    />
  );
}

export default function AdminFeedbackPage() {
  const navigate = useNavigate();
  const { darkMode } = useThemeStore();

  const [activeTab, setActiveTab] = useState<'feedback' | 'returns'>('feedback');

  // Feedback states
  const [feedbackList, setFeedbackList] = useState<FeedbackExtended[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(true);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  // Returns states
  const [returnsList, setReturnsList] = useState<ReturnRequest[]>([]);
  const [returnsLoading, setReturnsLoading] = useState(true);
  const [returnsError, setReturnsError] = useState<string | null>(null);

  // Common filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedRatings, setSelectedRatings] = useState<number[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Process feedback
  const fetchFeedback = async () => {
    setFeedbackLoading(true);
    setFeedbackError(null);
    try {
      const data = await feedbackApi.getList();
      setFeedbackList(data as FeedbackExtended[]);
    } catch (e) {
      console.error(e);
      setFeedbackError('Không thể tải danh sách phản hồi.');
    } finally {
      setFeedbackLoading(false);
    }
  };

  // Process returns
  const fetchReturns = async () => {
    setReturnsLoading(true);
    setReturnsError(null);
    try {
      const result = await returnsApi.getList();
      setReturnsList(result.items);
    } catch (e) {
      console.error(e);
      setReturnsError('Không thể tải danh sách đổi trả.');
    } finally {
      setReturnsLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
    fetchReturns();
  }, []);

  // Returns actions
  const handleApproveReturn = async (id: string) => {
    try {
      await returnsApi.approve(id);
      toast.success('Đã duyệt yêu cầu đổi trả');
      fetchReturns();
    } catch {
      toast.error('Không thể duyệt yêu cầu đổi trả');
    }
  };

  const handleRejectReturn = async (id: string) => {
    try {
      await returnsApi.reject(id);
      toast.success('Đã từ chối yêu cầu đổi trả');
      fetchReturns();
    } catch {
      toast.error('Không thể từ chối yêu cầu đổi trả');
    }
  };

  // Helpers
  const getOrderId = (fb: FeedbackExtended) =>
    typeof fb.orderId === 'object' && fb.orderId !== null
      ? (fb.orderId as any)._id
      : String(fb.orderId);

  const getOrderCode = (fb: FeedbackExtended) =>
    typeof fb.orderId === 'object' && fb.orderId !== null
      ? (fb.orderId as any).orderCode
      : getOrderId(fb).slice(-8).toUpperCase();

  const getCreatorName = (fb: FeedbackExtended) =>
    typeof fb.createdBy === 'object' && fb.createdBy !== null
      ? (fb.createdBy as any).fullName || (fb.createdBy as any).email || '—'
      : '—';

  const getStoreName = (fb: FeedbackExtended) => {
    if (fb.storeId && typeof fb.storeId === 'object') {
      return fb.storeId.storeName || '—';
    }
    return '—';
  };

  // Feedback Stats
  const feedbackStats = useMemo(() => {
    const total = feedbackList.length;
    const avgRating = total > 0
      ? (feedbackList.reduce((sum, fb) => sum + fb.rating, 0) / total).toFixed(1)
      : '0.0';
    const positiveCount = feedbackList.filter(fb =>
      fb.tags?.some(t => t === 'Vận chuyển tốt' || t === 'Thái độ phục vụ tốt')
    ).length;
    const negativeCount = feedbackList.filter(fb =>
      fb.tags?.some(t => ['Vận chuyển thiếu hàng', 'Hàng hư hỏng'].includes(t))
    ).length;

    const ratingDistribution = [5, 4, 3, 2, 1].map(r => ({
      rating: r,
      count: feedbackList.filter(fb => fb.rating === r).length,
      percentage: total > 0 ? Math.round((feedbackList.filter(fb => fb.rating === r).length / total) * 100) : 0
    }));

    const tagCounts = ALL_TAGS.map(tag => ({
      ...tag,
      count: feedbackList.filter(fb => fb.tags?.includes(tag.value)).length
    }));

    return { total, avgRating, positiveCount, negativeCount, ratingDistribution, tagCounts };
  }, [feedbackList]);

  // Returns Stats
  const returnsStats = useMemo(() => {
    const total = returnsList.length;
    const pending = returnsList.filter(r => r.status === 'pending').length;
    const approved = returnsList.filter(r => r.status === 'approved').length;
    const rejected = returnsList.filter(r => r.status === 'rejected').length;
    const completed = returnsList.filter(r => r.status === 'completed').length;

    const byReason = returnsList.reduce((acc, r) => {
      const reason = r.reason || 'Khác';
      acc[reason] = (acc[reason] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return { total, pending, approved, rejected, completed, byReason };
  }, [returnsList]);

  // Filtered feedback
  const filteredFeedback = useMemo(() => {
    let result = [...feedbackList];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(fb =>
        getOrderCode(fb).toLowerCase().includes(term) ||
        getCreatorName(fb).toLowerCase().includes(term) ||
        getStoreName(fb).toLowerCase().includes(term) ||
        fb.content?.toLowerCase().includes(term) ||
        fb.tags?.some(t => t.toLowerCase().includes(term))
      );
    }

    if (selectedTags.length > 0) {
      result = result.filter(fb => fb.tags?.some(t => selectedTags.includes(t)));
    }

    if (selectedRatings.length > 0) {
      result = result.filter(fb => selectedRatings.includes(fb.rating));
    }

    result.sort((a, b) => {
      if (sortField === 'createdAt') {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      } else {
        return sortOrder === 'asc' ? a.rating - b.rating : b.rating - a.rating;
      }
    });

    return result;
  }, [feedbackList, searchTerm, selectedTags, selectedRatings, sortField, sortOrder]);

  // Filtered returns
  const filteredReturns = useMemo(() => {
    let result = [...returnsList];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(r => {
        const orderCode = typeof r.orderId === 'object' ? (r.orderId as any)?.orderCode || (r.orderId as any)?._id : r.orderId;
        const storeName = typeof r.storeId === 'object' ? (r.storeId as any)?.storeName || (r.storeId as any)?._id : r.storeId;
        const createdByName = typeof r.createdBy === 'object' ? (r.createdBy as any)?.fullName || (r.createdBy as any)?.email : '';
        return (
          (orderCode || '').toLowerCase().includes(term) ||
          (storeName || '').toLowerCase().includes(term) ||
          (createdByName || '').toLowerCase().includes(term) ||
          (r.reason || '').toLowerCase().includes(term)
        );
      });
    }

    if (selectedStatuses.length > 0) {
      result = result.filter(r => selectedStatuses.includes(r.status));
    }

    result.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });

    return result;
  }, [returnsList, searchTerm, selectedStatuses, sortOrder]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const toggleRating = (rating: number) => {
    setSelectedRatings(prev => prev.includes(rating) ? prev.filter(r => r !== rating) : [...prev, rating]);
  };

  const toggleStatus = (status: string) => {
    setSelectedStatuses(prev => prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedTags([]);
    setSelectedRatings([]);
    setSelectedStatuses([]);
  };

  const hasActiveFilters = searchTerm || selectedTags.length > 0 || selectedRatings.length > 0 || selectedStatuses.length > 0;

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });

  const getReturnStatusBadge = (status: string) => feedbackStatusBadgeClass(status);

  const getReturnStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Chờ duyệt';
      case 'approved': return 'Đã duyệt';
      case 'rejected': return 'Từ chối';
      case 'completed': return 'Hoàn thành';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'approved': return <CheckCircle2 className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  const isLoading = activeTab === 'feedback' ? feedbackLoading : returnsLoading;
  const error = activeTab === 'feedback' ? feedbackError : returnsError;
  const refresh = activeTab === 'feedback' ? fetchFeedback : fetchReturns;

  return (
    <div className={`min-h-screen ${!darkMode ? 'bg-gradient-to-br from-gray-50 to-orange-50/30' : ''}`}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className={`p-2.5 rounded-xl ${darkMode ? 'bg-primary/15' : 'bg-orange-50'}`}>
            <MessageSquare className={`w-6 h-6 ${darkMode ? 'text-primary' : 'text-orange-600'}`} />
          </div>
          <div>
            <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Phản hồi & Đổi trả
            </h1>
            <p className="text-sm text-muted-foreground">Quản lý phản hồi khách hàng và yêu cầu đổi trả</p>
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className={`flex rounded-xl border overflow-hidden mb-6 ${darkMode ? 'bg-card border-border' : 'bg-white border-gray-200'}`}>
        <button
          onClick={() => setActiveTab('feedback')}
          className={cn(
            'flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2',
            activeTab === 'feedback'
              ? darkMode ? 'bg-primary text-primary-foreground' : 'bg-orange-500 text-white'
              : darkMode ? 'text-muted-foreground hover:text-foreground hover:bg-muted' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          )}
        >
          <MessageSquare className="w-4 h-4" />
          Phản hồi
          <span className={cn(
            'px-2 py-0.5 rounded-full text-xs font-bold',
            activeTab === 'feedback' ? 'bg-white/20' : darkMode ? 'bg-muted' : 'bg-gray-200'
          )}>
            {feedbackList.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('returns')}
          className={cn(
            'flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2',
            activeTab === 'returns'
              ? darkMode ? 'bg-primary text-primary-foreground' : 'bg-orange-500 text-white'
              : darkMode ? 'text-muted-foreground hover:text-foreground hover:bg-muted' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          )}
        >
          <ArrowLeftRight className="w-4 h-4" />
          Đổi trả
          {returnsStats.pending > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-500 text-white animate-pulse">
              {returnsStats.pending}
            </span>
          )}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {activeTab === 'feedback' ? (
          <>
            <div className={cn('rounded-2xl border p-5', darkMode ? 'bg-card border-border' : 'bg-white border-gray-200 shadow-sm')}>
              <div className="flex items-center gap-3 mb-3">
                <div className={cn('p-2 rounded-lg', darkMode ? 'bg-muted' : 'bg-orange-50')}>
                  <MessageSquare className={cn('w-5 h-5', darkMode ? 'text-primary' : 'text-orange-600')} />
                </div>
                <span className={cn('text-sm font-medium', darkMode ? 'text-gray-400' : 'text-gray-500')}>Tổng phản hồi</span>
              </div>
              <p className={cn('text-3xl font-bold', darkMode ? 'text-white' : 'text-gray-900')}>{feedbackStats.total}</p>
            </div>

            <div className={cn('rounded-2xl border p-5', darkMode ? 'bg-card border-border' : 'bg-white border-gray-200 shadow-sm')}>
              <div className="flex items-center gap-3 mb-3">
                <div className={cn('p-2 rounded-lg', darkMode ? 'bg-amber-500/10' : 'bg-amber-50')}>
                  <Star className={cn('w-5 h-5', darkMode ? 'text-amber-400' : 'text-amber-600')} />
                </div>
                <span className={cn('text-sm font-medium', darkMode ? 'text-gray-400' : 'text-gray-500')}>Đánh giá TB</span>
              </div>
              <div className="flex items-center gap-2">
                <p className={cn('text-3xl font-bold', darkMode ? 'text-amber-400' : 'text-amber-600')}>{feedbackStats.avgRating}</p>
                <span className={cn('text-sm', darkMode ? 'text-gray-400' : 'text-gray-500')}>/ 5</span>
              </div>
            </div>

            <div className={cn('rounded-2xl border p-5', darkMode ? 'bg-card border-border' : 'bg-white border-gray-200 shadow-sm')}>
              <div className="flex items-center gap-3 mb-3">
                <div className={cn('p-2 rounded-lg', darkMode ? 'bg-green-500/10' : 'bg-green-50')}>
                  <ThumbsUp className={cn('w-5 h-5', darkMode ? 'text-green-400' : 'text-green-600')} />
                </div>
                <span className={cn('text-sm font-medium', darkMode ? 'text-gray-400' : 'text-gray-500')}>Phản hồi tích cực</span>
              </div>
              <p className={cn('text-3xl font-bold', darkMode ? 'text-green-400' : 'text-green-600')}>{feedbackStats.positiveCount}</p>
            </div>

            <div className={cn('rounded-2xl border p-5', darkMode ? 'bg-card border-border' : 'bg-white border-gray-200 shadow-sm')}>
              <div className="flex items-center gap-3 mb-3">
                <div className={cn('p-2 rounded-lg', darkMode ? 'bg-red-500/10' : 'bg-red-50')}>
                  <ThumbsDown className={cn('w-5 h-5', darkMode ? 'text-red-400' : 'text-red-600')} />
                </div>
                <span className={cn('text-sm font-medium', darkMode ? 'text-gray-400' : 'text-gray-500')}>Khiếu nại</span>
              </div>
              <p className={cn('text-3xl font-bold', darkMode ? 'text-red-400' : 'text-red-600')}>{feedbackStats.negativeCount}</p>
            </div>
          </>
        ) : (
          <>
            <div className={cn('rounded-2xl border p-5', darkMode ? 'bg-card border-border' : 'bg-white border-gray-200 shadow-sm')}>
              <div className="flex items-center gap-3 mb-3">
                <div className={cn('p-2 rounded-lg', darkMode ? 'bg-muted' : 'bg-orange-50')}>
                  <ArrowLeftRight className={cn('w-5 h-5', darkMode ? 'text-primary' : 'text-orange-600')} />
                </div>
                <span className={cn('text-sm font-medium', darkMode ? 'text-gray-400' : 'text-gray-500')}>Tổng đổi trả</span>
              </div>
              <p className={cn('text-3xl font-bold', darkMode ? 'text-white' : 'text-gray-900')}>{returnsStats.total}</p>
            </div>

            <div className={cn('rounded-2xl border p-5', darkMode ? 'bg-card border-border' : 'bg-white border-gray-200 shadow-sm')}>
              <div className="flex items-center gap-3 mb-3">
                <div className={cn('p-2 rounded-lg', darkMode ? 'bg-amber-500/10' : 'bg-amber-50')}>
                  <Clock className={cn('w-5 h-5', darkMode ? 'text-amber-400' : 'text-amber-600')} />
                </div>
                <span className={cn('text-sm font-medium', darkMode ? 'text-gray-400' : 'text-gray-500')}>Chờ duyệt</span>
              </div>
              <p className={cn('text-3xl font-bold', darkMode ? 'text-amber-400' : 'text-amber-600')}>{returnsStats.pending}</p>
            </div>

            <div className={cn('rounded-2xl border p-5', darkMode ? 'bg-card border-border' : 'bg-white border-gray-200 shadow-sm')}>
              <div className="flex items-center gap-3 mb-3">
                <div className={cn('p-2 rounded-lg', darkMode ? 'bg-blue-500/10' : 'bg-blue-50')}>
                  <CheckCircle2 className={cn('w-5 h-5', darkMode ? 'text-blue-400' : 'text-blue-600')} />
                </div>
                <span className={cn('text-sm font-medium', darkMode ? 'text-gray-400' : 'text-gray-500')}>Đã duyệt</span>
              </div>
              <p className={cn('text-3xl font-bold', darkMode ? 'text-blue-400' : 'text-blue-600')}>{returnsStats.approved + returnsStats.completed}</p>
            </div>

            <div className={cn('rounded-2xl border p-5', darkMode ? 'bg-card border-border' : 'bg-white border-gray-200 shadow-sm')}>
              <div className="flex items-center gap-3 mb-3">
                <div className={cn('p-2 rounded-lg', darkMode ? 'bg-red-500/10' : 'bg-red-50')}>
                  <XCircle className={cn('w-5 h-5', darkMode ? 'text-red-400' : 'text-red-600')} />
                </div>
                <span className={cn('text-sm font-medium', darkMode ? 'text-gray-400' : 'text-gray-500')}>Từ chối</span>
              </div>
              <p className={cn('text-3xl font-bold', darkMode ? 'text-red-400' : 'text-red-600')}>{returnsStats.rejected}</p>
            </div>
          </>
        )}
      </div>

      {/* Rating Distribution & Tag Stats (Feedback only) */}
      {activeTab === 'feedback' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className={cn('rounded-2xl border p-6', darkMode ? 'bg-card border-border' : 'bg-white border-gray-200 shadow-sm')}>
            <div className="flex items-center gap-3 mb-5">
              <div className={cn('p-2 rounded-lg', darkMode ? 'bg-amber-500/10' : 'bg-amber-50')}>
                <BarChart3 className={cn('w-5 h-5', darkMode ? 'text-amber-400' : 'text-amber-600')} />
              </div>
              <div>
                <h3 className={cn('font-bold', darkMode ? 'text-white' : 'text-gray-900')}>Phân bố đánh giá</h3>
                <p className="text-xs text-muted-foreground">Biểu đồ số sao</p>
              </div>
            </div>

            <div className="space-y-3">
              {feedbackStats.ratingDistribution.map(({ rating, count, percentage }) => (
                <div key={rating} className="flex items-center gap-3">
                  <div className="flex items-center gap-1 w-16">
                    <span className={cn('text-sm font-medium', darkMode ? 'text-gray-400' : 'text-gray-500')}>{rating}</span>
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  </div>
                  <div className="flex-1 h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className={cn('text-sm font-mono w-12 text-right', darkMode ? 'text-gray-400' : 'text-gray-500')}>
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className={cn('rounded-2xl border p-6', darkMode ? 'bg-card border-border' : 'bg-white border-gray-200 shadow-sm')}>
            <div className="flex items-center gap-3 mb-5">
              <div className={cn('p-2 rounded-lg', darkMode ? 'bg-amber-500/10' : 'bg-amber-50')}>
                <TrendingUp className={cn('w-5 h-5', darkMode ? 'text-amber-400' : 'text-amber-600')} />
              </div>
              <div>
                <h3 className={cn('font-bold', darkMode ? 'text-white' : 'text-gray-900')}>Thống kê theo tag</h3>
                <p className="text-xs text-muted-foreground">Phân loại phản hồi</p>
              </div>
            </div>

            <div className="space-y-2">
              {feedbackStats.tagCounts.map((tag) => (
                <div
                  key={tag.value}
                  className={cn('flex items-center justify-between p-3 rounded-xl', darkMode ? 'bg-muted' : 'bg-gray-50')}
                >
                  <div className="flex items-center gap-3">
                    <span className={cn('px-2.5 py-1 rounded-lg text-xs font-semibold border', tag.color)}>
                      {tag.label}
                    </span>
                  </div>
                  <span className={cn('font-bold', darkMode ? 'text-white' : 'text-gray-900')}>
                    {tag.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filters & Search */}
      <div className={cn('rounded-2xl border p-4 mb-6', darkMode ? 'bg-card border-border' : 'bg-white border-gray-200 shadow-sm')}>
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className={cn('absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5', darkMode ? 'text-gray-500' : 'text-gray-400')} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={activeTab === 'feedback' ? 'Tìm kiếm theo mã đơn, cửa hàng, nội dung...' : 'Tìm kiếm theo mã đơn, cửa hàng, lý do...'}
              className={cn(
                'w-full pl-10 pr-4 py-3 rounded-xl border text-sm',
                darkMode
                  ? 'bg-muted border-border text-white placeholder-muted-foreground'
                  : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'
              )}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className={cn('absolute right-3 top-1/2 -translate-y-1/2', darkMode ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600')}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'px-4 py-3 rounded-xl border text-sm font-medium flex items-center gap-2',
              showFilters || hasActiveFilters
                ? darkMode ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-amber-50 border-amber-300 text-amber-600'
                : darkMode ? 'bg-muted border-border text-foreground' : 'bg-gray-50 border-gray-200 text-gray-700'
            )}
          >
            <Filter className="w-4 h-4" />
            Bộ lọc
            {hasActiveFilters && (
              <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-xs flex items-center justify-center">
                {selectedTags.length + selectedRatings.length + selectedStatuses.length + (searchTerm ? 1 : 0)}
              </span>
            )}
            <ChevronDown className={cn('w-4 h-4 transition-transform', showFilters ? 'rotate-180' : '')} />
          </button>

          <button
            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
            className={cn('px-4 py-3 rounded-xl border text-sm font-medium flex items-center gap-2', darkMode ? 'bg-muted border-border text-foreground' : 'bg-gray-50 border-gray-200 text-gray-700')}
          >
            <ArrowUpDown className="w-4 h-4" />
            {sortField === 'createdAt' ? 'Ngày' : 'Sao'} {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
          <button
            onClick={() => setSortField(prev => prev === 'createdAt' ? 'rating' : 'createdAt')}
            className={cn('px-4 py-3 rounded-xl border text-sm font-medium flex items-center gap-2', darkMode ? 'bg-muted border-border text-foreground hover:bg-muted/80' : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100')}
          >
            <BarChart3 className="w-4 h-4" />
            {sortField === 'createdAt' ? ' Theo ngày' : ' Theo sao'}
          </button>

          <button
            onClick={refresh}
            className={cn('px-4 py-3 rounded-xl border text-sm font-medium flex items-center gap-2', darkMode ? 'bg-muted border-border text-foreground' : 'bg-gray-50 border-gray-200 text-gray-700')}
          >
            <RefreshCw className={cn('w-4 h-4', isLoading ? 'animate-spin' : '')} />
            Làm mới
          </button>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className={cn(
                'px-4 py-3 rounded-xl border text-sm font-medium flex items-center gap-2',
                darkMode ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/30' : 'bg-red-500 text-white border-red-600 hover:bg-red-600'
              )}
            >
              <X className="w-4 h-4" />
              Xóa lọc
            </button>
          )}
        </div>

        {showFilters && (
          <div className={cn('mt-4 pt-4 border-t', darkMode ? 'border-gray-700' : 'border-gray-200')}>
            {activeTab === 'feedback' ? (
              <>
                {/* Rating Filter */}
                <div className="mb-4">
                  <label className={cn('text-xs font-semibold uppercase tracking-wider mb-2 block', darkMode ? 'text-gray-400' : 'text-gray-500')}>
                    Lọc theo số sao
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[5, 4, 3, 2, 1].map((rating) => (
                      <button
                        key={rating}
                        onClick={() => toggleRating(rating)}
                        className={cn(
                          'px-3 py-2 rounded-lg border text-sm font-medium flex items-center gap-1 transition-all',
                          selectedRatings.includes(rating)
                            ? darkMode ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' : 'bg-amber-50 border-amber-300 text-amber-600'
                            : darkMode ? 'bg-muted border-border text-muted-foreground hover:border-border/80' : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300'
                        )}
                      >
                        <Star className={cn('w-4 h-4', selectedRatings.includes(rating) ? 'fill-amber-400 text-amber-400' : '')} />
                        {rating}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tag Filter */}
                <div>
                  <label className={cn('text-xs font-semibold uppercase tracking-wider mb-2 block', darkMode ? 'text-gray-400' : 'text-gray-500')}>
                    Lọc theo tag
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {ALL_TAGS.map((tag) => (
                      <button
                        key={tag.value}
                        onClick={() => toggleTag(tag.value)}
                        className={cn(
                          'px-3 py-2 rounded-lg border text-sm font-medium transition-all',
                          selectedTags.includes(tag.value)
                            ? tag.color
                            : darkMode ? 'bg-muted border-border text-muted-foreground hover:border-border/80' : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300'
                        )}
                      >
                        {tag.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div>
                <label className={cn('text-xs font-semibold uppercase tracking-wider mb-2 block', darkMode ? 'text-gray-400' : 'text-gray-500')}>
                  Lọc theo trạng thái
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 'pending', label: 'Chờ duyệt', color: 'bg-amber-500 text-white border border-amber-600' },
                    { value: 'approved', label: 'Đã duyệt', color: 'bg-blue-500 text-white border border-blue-600' },
                    { value: 'rejected', label: 'Từ chối', color: 'bg-red-500 text-white border border-red-600' },
                    { value: 'completed', label: 'Hoàn thành', color: 'bg-emerald-500 text-white border border-emerald-600' },
                  ].map((status) => (
                    <button
                      key={status.value}
                      onClick={() => toggleStatus(status.value)}
                      className={cn(
                        'px-3 py-2 rounded-lg border text-sm font-medium transition-all',
                        selectedStatuses.includes(status.value)
                          ? status.color
                          : darkMode ? 'bg-muted border-border text-muted-foreground hover:border-border/80' : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300'
                      )}
                    >
                      {status.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Results Count */}
      <div className={cn('flex items-center justify-between mb-4', darkMode ? 'text-gray-400' : 'text-gray-500')}>
        <p className="text-sm font-medium">
          Hiển thị {activeTab === 'feedback' ? filteredFeedback.length : filteredReturns.length} / {activeTab === 'feedback' ? feedbackList.length : returnsList.length}
          {activeTab === 'feedback' ? ' phản hồi' : ' yêu cầu đổi trả'}
        </p>
      </div>

      {/* Loading / Error States */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[400px] gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          <span className="text-muted-foreground font-medium">Đang tải dữ liệu...</span>
        </div>
      ) : error ? (
        <div className={cn('rounded-2xl border p-12 text-center', darkMode ? 'bg-card border-border' : 'bg-white border-gray-200')}>
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <p className="text-red-500 font-medium mb-4">{error}</p>
          <button
            onClick={refresh}
            className="px-4 py-2 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition-colors"
          >
            Thử lại
          </button>
        </div>
      ) : (
        <>
          {/* Feedback List */}
          {activeTab === 'feedback' && (
            filteredFeedback.length === 0 ? (
              <div className={cn('text-center py-16 rounded-2xl border', darkMode ? 'bg-card border-border' : 'bg-white border-gray-200')}>
                <MessageSquare className={cn('w-16 h-16 mx-auto mb-4', darkMode ? 'text-gray-600' : 'text-gray-300')} />
                <p className={cn('text-lg font-medium', darkMode ? 'text-gray-400' : 'text-gray-500')}>
                  {hasActiveFilters ? 'Không tìm thấy phản hồi phù hợp' : 'Chưa có phản hồi nào'}
                </p>
                {hasActiveFilters && (
                  <button onClick={clearFilters} className="mt-4 px-4 py-2 text-amber-500 font-medium hover:underline">
                    Xóa bộ lọc
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredFeedback.map((fb) => (
                  <div
                    key={fb._id}
                    className={cn(
                      'rounded-2xl border p-6 transition-all hover:shadow-lg cursor-pointer',
                      darkMode ? 'bg-card border-border hover:border-border/80' : 'bg-white border-gray-200 hover:border-amber-300 shadow-sm',
                      fb.rating <= 2 && 'border-l-4 border-l-red-500'
                    )}
                    onClick={() => navigate(`/admin/orders/${getOrderId(fb)}`)}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-4">
                        <div className={cn('p-3 rounded-xl', darkMode ? 'bg-muted' : 'bg-orange-50')}>
                          <Store className={cn('w-5 h-5', darkMode ? 'text-primary' : 'text-orange-600')} />
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <span className={cn('font-mono font-bold text-lg', darkMode ? 'text-white' : 'text-gray-900')}>
                              {getOrderCode(fb)}
                            </span>
                            <div className="flex items-center gap-0.5">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={cn('w-4 h-4',
                                    star <= fb.rating ? 'fill-amber-400 text-amber-400' : darkMode ? 'fill-gray-700 text-gray-600' : 'fill-gray-200 text-gray-200'
                                  )}
                                />
                              ))}
                            </div>
                            <span className={cn('font-bold text-lg', darkMode ? 'text-amber-400' : 'text-amber-600')}>
                              {fb.rating}/5
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-4 text-sm">
                            <div className="flex items-center gap-1.5">
                              <Store className={cn('w-4 h-4', darkMode ? 'text-gray-500' : 'text-gray-400')} />
                              <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>{getStoreName(fb)}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Calendar className={cn('w-4 h-4', darkMode ? 'text-gray-500' : 'text-gray-400')} />
                              <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>{formatDate(fb.createdAt)}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Package className={cn('w-4 h-4', darkMode ? 'text-gray-500' : 'text-gray-400')} />
                              <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>{getCreatorName(fb)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className={cn('text-xs', darkMode ? 'text-gray-600' : 'text-gray-400')}>Xem đơn hàng →</div>
                    </div>

                    {fb.content && (
                      <div className={cn('mb-4 p-4 rounded-xl', darkMode ? 'bg-muted' : 'bg-gray-50')}>
                        <p className={cn('text-sm leading-relaxed', darkMode ? 'text-gray-300' : 'text-gray-700')}>
                          &quot;{fb.content}&quot;
                        </p>
                      </div>
                    )}

                    {fb.tags && fb.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {fb.tags.map((tag, index) => {
                          const tagInfo = ALL_TAGS.find(t => t.value === tag);
                          const isNegative = ['Vận chuyển thiếu hàng', 'Hàng hư hỏng'].includes(tag);
                          return (
                            <span
                              key={index}
                              className={cn(
                                'px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5',
                                tagInfo?.color ||
                                (isNegative ? 'bg-red-500 text-white border border-red-600' : 'bg-slate-500 text-white border border-slate-600')
                              )}
                            >
                              {isNegative ? <AlertTriangle className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                              {tag}
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {fb.images && fb.images.length > 0 && (
                      <div className="flex gap-2">
                        {fb.images.map((img, index) => (
                          <FeedbackImage key={index} src={img} alt={`Hình ảnh ${index + 1}`} />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          )}

          {/* Returns List */}
          {activeTab === 'returns' && (
            filteredReturns.length === 0 ? (
              <div className={cn('text-center py-16 rounded-2xl border', darkMode ? 'bg-card border-border' : 'bg-white border-gray-200')}>
                <ArrowLeftRight className={cn('w-16 h-16 mx-auto mb-4', darkMode ? 'text-gray-600' : 'text-gray-300')} />
                <p className={cn('text-lg font-medium', darkMode ? 'text-gray-400' : 'text-gray-500')}>
                  {hasActiveFilters ? 'Không tìm thấy yêu cầu phù hợp' : 'Chưa có yêu cầu đổi trả nào'}
                </p>
                {hasActiveFilters && (
                  <button onClick={clearFilters} className="mt-4 px-4 py-2 text-amber-500 font-medium hover:underline">
                    Xóa bộ lọc
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredReturns.map((ret) => {
                  const orderCode = typeof ret.orderId === 'object' ? (ret.orderId as any)?.orderCode || (ret.orderId as any)?._id : ret.orderId;
                  const storeName = typeof ret.storeId === 'object' ? (ret.storeId as any)?.storeName || (ret.storeId as any)?._id : ret.storeId;
                  const createdByName = typeof ret.createdBy === 'object' ? (ret.createdBy as any)?.fullName || (ret.createdBy as any)?.email : '—';
                  const isPending = ret.status === 'pending';

                  return (
                    <motion.div
                      key={ret._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        'rounded-2xl border p-6 transition-all',
                        darkMode ? 'bg-card border-border' : 'bg-white border-gray-200 shadow-sm',
                        isPending && 'border-l-4 border-l-amber-500'
                      )}
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start gap-4">
                          <div className={cn(
                            'p-3 rounded-xl',
                            ret.status === 'pending' ? (darkMode ? 'bg-amber-500/10' : 'bg-amber-50') :
                            ret.status === 'approved' || ret.status === 'completed' ? (darkMode ? 'bg-emerald-500/10' : 'bg-emerald-50') :
                            ret.status === 'rejected' ? (darkMode ? 'bg-red-500/10' : 'bg-red-50') :
                            (darkMode ? 'bg-muted' : 'bg-gray-50')
                          )}>
                            {getStatusIcon(ret.status)}
                            {(() => {
                              const iconColor = ret.status === 'pending' ? (darkMode ? 'text-amber-400' : 'text-amber-600') :
                                ret.status === 'approved' || ret.status === 'completed' ? (darkMode ? 'text-emerald-400' : 'text-emerald-600') :
                                ret.status === 'rejected' ? (darkMode ? 'text-red-400' : 'text-red-600') :
                                (darkMode ? 'text-gray-400' : 'text-gray-600');
                              return <ArrowLeftRight className={cn('w-5 h-5', iconColor)} />;
                            })()}
                          </div>
                          <div>
                            <div className="flex items-center gap-3 mb-1 flex-wrap">
                              <span className={cn('font-mono font-bold text-lg', darkMode ? 'text-white' : 'text-gray-900')}>
                                {orderCode}
                              </span>
                              <span className={cn(
                                'px-3 py-1 rounded-lg text-xs font-semibold border flex items-center gap-1.5',
                                getReturnStatusBadge(ret.status)
                              )}>
                                {getStatusIcon(ret.status)}
                                {getReturnStatusLabel(ret.status)}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-4 text-sm">
                              <div className="flex items-center gap-1.5">
                                <Store className={cn('w-4 h-4', darkMode ? 'text-gray-500' : 'text-gray-400')} />
                                <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>{storeName}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Calendar className={cn('w-4 h-4', darkMode ? 'text-gray-500' : 'text-gray-400')} />
                                <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>{formatDate(ret.createdAt)}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Package className={cn('w-4 h-4', darkMode ? 'text-gray-500' : 'text-gray-400')} />
                                <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>{createdByName}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Reason & Description */}
                      <div className={cn('mb-4 p-4 rounded-xl', darkMode ? 'bg-muted' : 'bg-gray-50')}>
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className={cn('w-4 h-4', darkMode ? 'text-amber-400' : 'text-amber-600')} />
                          <span className={cn('text-sm font-semibold', darkMode ? 'text-white' : 'text-gray-900')}>Lý do đổi trả:</span>
                          <span className={cn('text-sm', darkMode ? 'text-gray-300' : 'text-gray-700')}>{ret.reason}</span>
                        </div>
                        {ret.description && (
                          <p className={cn('text-sm leading-relaxed', darkMode ? 'text-gray-300' : 'text-gray-700')}>
                            {ret.description}
                          </p>
                        )}
                      </div>

                      {/* Items */}
                      {ret.items && ret.items.length > 0 && (
                        <div className="mb-4">
                          <h4 className={cn('text-sm font-semibold mb-2', darkMode ? 'text-white' : 'text-gray-900')}>Sản phẩm đổi trả:</h4>
                          <div className={cn('rounded-xl border overflow-hidden', darkMode ? 'border-border' : 'border-gray-200')}>
                            <table className="w-full text-sm">
                              <thead>
                                <tr className={cn('text-left', darkMode ? 'bg-muted/50 border-border' : 'bg-gray-50 border-gray-100')}>
                                  <th className={cn('px-4 py-2 font-medium', darkMode ? 'text-muted-foreground' : 'text-gray-500')}>Sản phẩm</th>
                                  <th className={cn('px-4 py-2 font-medium text-center', darkMode ? 'text-muted-foreground' : 'text-gray-500')}>SL</th>
                                  <th className={cn('px-4 py-2 font-medium', darkMode ? 'text-muted-foreground' : 'text-gray-500')}>Lý do</th>
                                </tr>
                              </thead>
                              <tbody className={darkMode ? 'divide-y divide-gray-800' : 'divide-y divide-gray-100'}>
                                {ret.items.map((item, idx) => {
                                  const productName = typeof item.productId === 'object' ? (item.productId as any)?.name || '—' : '—';
                                  return (
                                    <tr key={idx}>
                                      <td className={cn('px-4 py-2', darkMode ? 'text-white' : 'text-gray-900')}>{productName}</td>
                                      <td className={cn('px-4 py-2 text-center font-semibold', darkMode ? 'text-white' : 'text-gray-900')}>{item.quantity}</td>
                                      <td className={cn('px-4 py-2', darkMode ? 'text-gray-400' : 'text-gray-600')}>{item.reason}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      {isPending && (
                        <div className="flex items-center gap-3 pt-4 border-t">
                          <button
                            onClick={() => handleApproveReturn(ret._id)}
                            className={cn(
                              'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all',
                              feedbackActionBtnClass(darkMode, 'approve')
                            )}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            Duyệt đổi trả
                          </button>
                          <button
                            onClick={() => handleRejectReturn(ret._id)}
                            className={cn(
                              'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all',
                              feedbackActionBtnClass(darkMode, 'reject')
                            )}
                          >
                            <XCircle className="w-4 h-4" />
                            Từ chối
                          </button>
                        </div>
                      )}

                      {/* Processed Info */}
                      {!isPending && ret.processedBy && (
                        <div className={cn('mt-4 pt-4 border-t text-sm', darkMode ? 'border-gray-700' : 'border-gray-200')}>
                          <div className="flex items-center gap-2">
                            {ret.status === 'approved' || ret.status === 'completed' ? (
                              <CheckCircle2 className={cn('w-4 h-4', darkMode ? 'text-emerald-400' : 'text-emerald-600')} />
                            ) : (
                              <XCircle className={cn('w-4 h-4', darkMode ? 'text-red-400' : 'text-red-600')} />
                            )}
                            <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>
                              Đã xử lý bởi <span className={darkMode ? 'text-white font-medium' : 'text-gray-900 font-medium'}>
                                {typeof ret.processedBy === 'object' ? (ret.processedBy as any)?.fullName || (ret.processedBy as any)?.email || '—' : '—'}
                              </span>
                              {ret.processedAt && ` vào ${formatDate(ret.processedAt)}`}
                            </span>
                          </div>
                          {ret.processedNote && (
                            <p className={cn('mt-1 ml-6', darkMode ? 'text-gray-300' : 'text-gray-700')}>
                              Ghi chú: {ret.processedNote}
                            </p>
                          )}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}
