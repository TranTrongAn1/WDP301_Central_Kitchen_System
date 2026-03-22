import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { feedbackApi, type Feedback } from '@/api/FeedbackApi';
import { useThemeStore } from '@/shared/zustand/themeStore';
import {
  MessageSquare, Star, Loader2, Filter, Search, X, ChevronDown,
  AlertTriangle, CheckCircle, Package, Store, Calendar, TrendingUp,
  ThumbsUp, ThumbsDown, ArrowUpDown, BarChart3, ImageIcon
} from 'lucide-react';

// Extend Feedback interface to include tags
interface FeedbackExtended extends Feedback {
  tags?: string[];
  images?: string[];
  storeId?: { _id: string; storeName: string; storeCode?: string };
}

const ALL_TAGS = [
  { value: 'Vận chuyển tốt', label: 'Vận chuyển tốt', color: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800', icon: 'truck' },
  { value: 'Thái độ phục vụ tốt', label: 'Thái độ phục vụ tốt', color: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800', icon: 'smile' },
  { value: 'Vận chuyển thiếu hàng', label: 'Thiếu hàng', color: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800', icon: 'alert' },
  { value: 'Hàng hư hỏng', label: 'Hàng hư hỏng', color: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800', icon: 'warning' },
  { value: 'Khác', label: 'Khác', color: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700', icon: 'more' },
];

type SortField = 'createdAt' | 'rating';
type SortOrder = 'asc' | 'desc';

function getImageUrl(url: string | undefined): string {
  if (!url) return '';
  // If it's already a full URL (http/https), return as is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  // If it's a Cloudinary public ID or relative path, construct Cloudinary URL
  return `https://res.cloudinary.com/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'demo'}/image/upload/${url}`;
}

function FeedbackImage({ src, alt }: { src: string; alt: string }) {
  const [error, setError] = useState(false);
  const { darkMode } = useThemeStore();
  
  if (error || !src) {
    return (
      <div className={`w-20 h-20 rounded-xl flex items-center justify-center border ${
        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-200'
      }`}>
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

  const [list, setList] = useState<FeedbackExtended[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedRatings, setSelectedRatings] = useState<number[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const fetchList = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await feedbackApi.getList();
      setList(data as FeedbackExtended[]);
    } catch (e) {
      console.error(e);
      setError('Không thể tải danh sách phản hồi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

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

  // Stats
  const stats = useMemo(() => {
    const total = list.length;
    const avgRating = total > 0
      ? (list.reduce((sum, fb) => sum + fb.rating, 0) / total).toFixed(1)
      : '0.0';
    const positiveCount = list.filter(fb =>
      fb.tags?.some(t => t === 'Vận chuyển tốt' || t === 'Thái độ phục vụ tốt')
    ).length;
    const negativeCount = list.filter(fb =>
      fb.tags?.some(t => t === 'Vận chuyển thiếu hàng' || t === 'Hàng hư hỏng')
    ).length;

    const ratingDistribution = [5, 4, 3, 2, 1].map(r => ({
      rating: r,
      count: list.filter(fb => fb.rating === r).length,
      percentage: total > 0 ? Math.round((list.filter(fb => fb.rating === r).length / total) * 100) : 0
    }));

    const tagCounts = ALL_TAGS.map(tag => ({
      ...tag,
      count: list.filter(fb => fb.tags?.includes(tag.value)).length
    }));

    return { total, avgRating, positiveCount, negativeCount, ratingDistribution, tagCounts };
  }, [list]);

  // Filtered and sorted list
  const filteredList = useMemo(() => {
    let result = [...list];

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
      result = result.filter(fb =>
        fb.tags?.some(t => selectedTags.includes(t))
      );
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
  }, [list, searchTerm, selectedTags, selectedRatings, sortField, sortOrder]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const toggleRating = (rating: number) => {
    setSelectedRatings(prev =>
      prev.includes(rating) ? prev.filter(r => r !== rating) : [...prev, rating]
    );
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedTags([]);
    setSelectedRatings([]);
  };

  const hasActiveFilters = searchTerm || selectedTags.length > 0 || selectedRatings.length > 0;

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        <span className="text-muted-foreground font-medium">Đang tải phản hồi...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`rounded-2xl border p-12 text-center ${darkMode ? 'bg-card border-border' : 'bg-white border-gray-200'}`}>
        <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-500" />
        <p className="text-red-500 font-medium mb-4">{error}</p>
        <button
          onClick={fetchList}
          className="px-4 py-2 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition-colors"
        >
          Thử lại
        </button>
      </div>
    );
  }

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
              Phản hồi khách hàng
            </h1>
            <p className="text-sm text-muted-foreground">Quản lý và theo dõi phản hồi từ cửa hàng</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total */}
        <div className={`rounded-2xl border p-5 ${darkMode ? 'bg-card border-border' : 'bg-white border-gray-200 shadow-sm'}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2 rounded-lg ${darkMode ? 'bg-muted' : 'bg-orange-50'}`}>
              <MessageSquare className={`w-5 h-5 ${darkMode ? 'text-primary' : 'text-orange-600'}`} />
            </div>
            <span className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Tổng phản hồi</span>
          </div>
          <p className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{stats.total}</p>
        </div>

        {/* Average Rating */}
        <div className={`rounded-2xl border p-5 ${darkMode ? 'bg-card border-border' : 'bg-white border-gray-200 shadow-sm'}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2 rounded-lg ${darkMode ? 'bg-amber-500/10' : 'bg-amber-50'}`}>
              <Star className={`w-5 h-5 ${darkMode ? 'text-amber-400' : 'text-amber-600'}`} />
            </div>
            <span className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Đánh giá TB</span>
          </div>
          <div className="flex items-center gap-2">
            <p className={`text-3xl font-bold ${darkMode ? 'text-amber-400' : 'text-amber-600'}`}>{stats.avgRating}</p>
            <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>/ 5</span>
          </div>
        </div>

        {/* Positive */}
        <div className={`rounded-2xl border p-5 ${darkMode ? 'bg-card border-border' : 'bg-white border-gray-200 shadow-sm'}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2 rounded-lg ${darkMode ? 'bg-green-500/10' : 'bg-green-50'}`}>
              <ThumbsUp className={`w-5 h-5 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
            </div>
            <span className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Phản hồi tích cực</span>
          </div>
          <p className={`text-3xl font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>{stats.positiveCount}</p>
        </div>

        {/* Negative */}
        <div className={`rounded-2xl border p-5 ${darkMode ? 'bg-card border-border' : 'bg-white border-gray-200 shadow-sm'}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2 rounded-lg ${darkMode ? 'bg-red-500/10' : 'bg-red-50'}`}>
              <ThumbsDown className={`w-5 h-5 ${darkMode ? 'text-red-400' : 'text-red-600'}`} />
            </div>
            <span className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Phản hồi tiêu cực</span>
          </div>
          <p className={`text-3xl font-bold ${darkMode ? 'text-red-400' : 'text-red-600'}`}>{stats.negativeCount}</p>
        </div>
      </div>

      {/* Rating Distribution & Tag Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Rating Distribution */}
        <div className={`rounded-2xl border p-6 ${darkMode ? 'bg-card border-border' : 'bg-white border-gray-200 shadow-sm'}`}>
          <div className="flex items-center gap-3 mb-5">
            <div className={`p-2 rounded-lg ${darkMode ? 'bg-amber-500/10' : 'bg-amber-50'}`}>
              <BarChart3 className={`w-5 h-5 ${darkMode ? 'text-amber-400' : 'text-amber-600'}`} />
            </div>
            <div>
              <h3 className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Phân bố đánh giá</h3>
              <p className="text-xs text-muted-foreground">Biểu đồ số sao</p>
            </div>
          </div>

          <div className="space-y-3">
            {stats.ratingDistribution.map(({ rating, count, percentage }) => (
              <div key={rating} className="flex items-center gap-3">
                <div className="flex items-center gap-1 w-16">
                  <span className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{rating}</span>
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                </div>
                <div className="flex-1 h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className={`text-sm font-mono w-12 text-right ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Tag Stats */}
        <div className={`rounded-2xl border p-6 ${darkMode ? 'bg-card border-border' : 'bg-white border-gray-200 shadow-sm'}`}>
          <div className="flex items-center gap-3 mb-5">
            <div className={`p-2 rounded-lg ${darkMode ? 'bg-amber-500/10' : 'bg-amber-50'}`}>
              <TrendingUp className={`w-5 h-5 ${darkMode ? 'text-amber-400' : 'text-amber-600'}`} />
            </div>
            <div>
              <h3 className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Thống kê theo tag</h3>
              <p className="text-xs text-muted-foreground">Phân loại phản hồi</p>
            </div>
          </div>

          <div className="space-y-2">
            {stats.tagCounts.map((tag) => (
              <div
                key={tag.value}
                className={`flex items-center justify-between p-3 rounded-xl ${darkMode ? 'bg-muted' : 'bg-gray-50'}`}
              >
                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${tag.color}`}>
                    {tag.label}
                  </span>
                </div>
                <span className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {tag.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className={`rounded-2xl border p-4 mb-6 ${darkMode ? 'bg-card border-border' : 'bg-white border-gray-200 shadow-sm'}`}>
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm theo mã đơn, cửa hàng, nội dung..."
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

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-3 rounded-xl border text-sm font-medium flex items-center gap-2 ${
              showFilters || hasActiveFilters
                ? darkMode
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                  : 'bg-amber-50 border-amber-300 text-amber-600'
                : darkMode
                  ? 'bg-muted border-border text-foreground'
                  : 'bg-gray-50 border-gray-200 text-gray-700'
            }`}
          >
            <Filter className="w-4 h-4" />
            Bộ lọc
            {hasActiveFilters && (
              <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-xs flex items-center justify-center">
                {selectedTags.length + selectedRatings.length + (searchTerm ? 1 : 0)}
              </span>
            )}
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>

          {/* Sort */}
          <button
            onClick={() => {
              setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
            }}
            className={`px-4 py-3 rounded-xl border text-sm font-medium flex items-center gap-2 ${
              darkMode
                ? 'bg-muted border-border text-foreground'
                : 'bg-gray-50 border-gray-200 text-gray-700'
            }`}
          >
            <ArrowUpDown className="w-4 h-4" />
            {sortField === 'createdAt' ? 'Ngày' : 'Sao'} {sortOrder === 'asc' ? '↑' : '↓'}
          </button>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className={`px-4 py-3 rounded-xl border text-sm font-medium flex items-center gap-2 ${
                darkMode
                  ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
                  : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
              }`}
            >
              <X className="w-4 h-4" />
              Xóa lọc
            </button>
          )}
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className={`mt-4 pt-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            {/* Rating Filter */}
            <div className="mb-4">
              <label className={`text-xs font-semibold uppercase tracking-wider mb-2 block ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Lọc theo số sao
              </label>
              <div className="flex flex-wrap gap-2">
                {[5, 4, 3, 2, 1].map((rating) => (
                  <button
                    key={rating}
                    onClick={() => toggleRating(rating)}
                    className={`px-3 py-2 rounded-lg border text-sm font-medium flex items-center gap-1 transition-all ${
                      selectedRatings.includes(rating)
                        ? darkMode
                          ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                          : 'bg-amber-50 border-amber-300 text-amber-600'
                        : darkMode
                          ? 'bg-muted border-border text-muted-foreground hover:border-border/80'
                          : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <Star className={`w-4 h-4 ${selectedRatings.includes(rating) ? 'fill-amber-400 text-amber-400' : ''}`} />
                    {rating}
                  </button>
                ))}
              </div>
            </div>

            {/* Tag Filter */}
            <div>
              <label className={`text-xs font-semibold uppercase tracking-wider mb-2 block ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Lọc theo tag
              </label>
              <div className="flex flex-wrap gap-2">
                {ALL_TAGS.map((tag) => (
                  <button
                    key={tag.value}
                    onClick={() => toggleTag(tag.value)}
                    className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                      selectedTags.includes(tag.value)
                        ? tag.color
                        : darkMode
                          ? 'bg-muted border-border text-muted-foreground hover:border-border/80'
                          : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {tag.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results Count */}
      <div className={`flex items-center justify-between mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
        <p className="text-sm font-medium">
          Hiển thị {filteredList.length} / {list.length} phản hồi
        </p>
        {sortField === 'createdAt' ? (
          <button
            onClick={() => setSortField('rating')}
            className="text-sm font-medium hover:text-amber-500 transition-colors"
          >
            Sắp xếp theo: Đánh giá
          </button>
        ) : (
          <button
            onClick={() => setSortField('createdAt')}
            className="text-sm font-medium hover:text-amber-500 transition-colors"
          >
            Sắp xếp theo: Ngày
          </button>
        )}
      </div>

      {/* Feedback List */}
      {filteredList.length === 0 ? (
        <div className={`text-center py-16 rounded-2xl border ${darkMode ? 'bg-card border-border' : 'bg-white border-gray-200'}`}>
          <MessageSquare className={`w-16 h-16 mx-auto mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-300'}`} />
          <p className={`text-lg font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {hasActiveFilters ? 'Không tìm thấy phản hồi phù hợp' : 'Chưa có phản hồi nào'}
          </p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="mt-4 px-4 py-2 text-amber-500 font-medium hover:underline"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredList.map((fb) => (
            <div
              key={fb._id}
              className={`rounded-2xl border p-6 transition-all hover:shadow-lg cursor-pointer ${
                darkMode
                  ? 'bg-card border-border hover:border-border/80'
                  : 'bg-white border-gray-200 hover:border-amber-300 shadow-sm'
              }`}
              onClick={() => navigate(`/admin/orders/${getOrderId(fb)}`)}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4">
                  {/* Store Icon */}
                  <div className={`p-3 rounded-xl ${darkMode ? 'bg-muted' : 'bg-orange-50'}`}>
                    <Store className={`w-5 h-5 ${darkMode ? 'text-primary' : 'text-orange-600'}`} />
                  </div>

                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className={`font-mono font-bold text-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {getOrderCode(fb)}
                      </span>
                      {/* Rating Stars */}
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${
                              star <= fb.rating
                                ? 'fill-amber-400 text-amber-400'
                                : darkMode
                                  ? 'fill-gray-700 text-gray-600'
                                  : 'fill-gray-200 text-gray-200'
                            }`}
                          />
                        ))}
                      </div>
                      <span className={`font-bold text-lg ${darkMode ? 'text-amber-400' : 'text-amber-600'}`}>
                        {fb.rating}/5
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <div className="flex items-center gap-1.5">
                        <Store className={`w-4 h-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                        <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                          {getStoreName(fb)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className={`w-4 h-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                        <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                          {formatDate(fb.createdAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Package className={`w-4 h-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                        <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                          {getCreatorName(fb)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Click hint */}
                <div className={`text-xs ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                  Xem đơn hàng →
                </div>
              </div>

              {/* Content */}
              {fb.content && (
                <div className={`mb-4 p-4 rounded-xl ${darkMode ? 'bg-muted' : 'bg-gray-50'}`}>
                  <p className={`text-sm leading-relaxed ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    "{fb.content}"
                  </p>
                </div>
              )}

              {/* Tags */}
              {fb.tags && fb.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {fb.tags.map((tag, index) => {
                    const tagInfo = ALL_TAGS.find(t => t.value === tag);
                    const isNegative = tag === 'Vận chuyển thiếu hàng' || tag === 'Hàng hư hỏng';
                    return (
                      <span
                        key={index}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 ${
                          tagInfo?.color ||
                          (isNegative
                            ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'
                            : darkMode
                              ? 'bg-gray-700 text-gray-300 border-gray-600'
                              : 'bg-gray-100 text-gray-700 border-gray-200')
                        }`}
                      >
                        {isNegative ? (
                          <AlertTriangle className="w-3.5 h-3.5" />
                        ) : (
                          <CheckCircle className="w-3.5 h-3.5" />
                        )}
                        {tag}
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Images */}
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
      )}
    </div>
  );
}
