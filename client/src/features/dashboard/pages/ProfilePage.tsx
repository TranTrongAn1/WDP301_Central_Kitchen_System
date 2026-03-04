import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  User as UserIcon,
  Mail,
  ShieldCheck,
  MapPin,
  CalendarClock,
  Building2,
  Activity,
  Clock3,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';

import { useAuthStore } from '@/shared/zustand/authStore';
import { useThemeStore } from '@/shared/zustand/themeStore';
import { authApi } from '@/api/AuthApi';
import { storeApi, type Store as StoreEntity } from '@/api/StoreApi';
import type { User, UserRole } from '@/shared/types/auth';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/features/manager/components/ui/Card';
import { Badge } from '@/features/manager/components/ui/Badge';
import { Button } from '@/features/manager/components/ui/Button';
import { paymentApi, type WalletInfo } from '@/api/PaymentApi';

interface RoleMeta {
  label: string;
  description: string;
  tone: 'primary' | 'info' | 'success' | 'warning';
}

const ROLE_META: Record<UserRole, RoleMeta> = {
  Admin: {
    label: 'Quản trị hệ thống',
    description:
      'Toàn quyền cấu hình hệ thống, phân quyền user, cấu hình tham số vận hành.',
    tone: 'primary',
  },
  Manager: {
    label: 'Quản lý trung tâm',
    description:
      'Điều phối sản xuất, quản lý tồn kho, báo cáo và tối ưu hiệu suất vận hành.',
    tone: 'info',
  },
  KitchenStaff: {
    label: 'Nhân viên bếp',
    description:
      'Theo dõi kế hoạch sản xuất, cập nhật tiến độ và đảm bảo chất lượng thành phẩm.',
    tone: 'success',
  },
  StoreStaff: {
    label: 'Nhân viên cửa hàng',
    description:
      'Quản lý đơn đặt hàng từ khách, nhận hàng từ bếp trung tâm và phản hồi chất lượng.',
    tone: 'info',
  },
  Coordinator: {
    label: 'Điều phối vận chuyển',
    description:
      'Lập lịch và giám sát chuyến giao hàng giữa bếp trung tâm và các cửa hàng.',
    tone: 'warning',
  },
};

type RoleTone = RoleMeta['tone'];

const getRoleBadgeVariant = (tone: RoleTone) => {
  switch (tone) {
    case 'primary':
      return 'default';
    case 'success':
      return 'success';
    case 'warning':
      return 'warning';
    case 'info':
    default:
      return 'info';
  }
};

const formatDate = (value?: string | null) => {
  if (!value) return 'Không xác định';
  try {
    const date = new Date(value);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
};

const getInitials = (fullName?: string | null, username?: string | null) => {
  const source = fullName || username || '';
  if (!source) return '?';
  const parts = source.trim().split(' ');
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user: authUser } = useAuthStore();
  const { darkMode } = useThemeStore();

  const [profile, setProfile] = useState<User | null>(authUser);
  const [store, setStore] = useState<StoreEntity | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isLoadingStore, setIsLoadingStore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [isLoadingWallet, setIsLoadingWallet] = useState(false);

  const roleMeta = useMemo(() => {
    if (!profile?.role) return null;
    return ROLE_META[profile.role];
  }, [profile?.role]);

  useEffect(() => {
    let isMounted = true;

    const fetchProfile = async () => {
      setIsLoadingProfile(true);
      setError(null);
      try {
        const res = await authApi.getCurrentUser();
        if (!isMounted) return;

        if (res?.success && res.data) {
          setProfile(res.data);
        } else {
          setError(res?.message || 'Không thể tải thông tin hồ sơ');
        }
      } catch (err: any) {
        if (!isMounted) return;
        const message =
          err?.response?.data?.message ||
          err?.message ||
          'Đã xảy ra lỗi khi tải hồ sơ';
        setError(message);
      } finally {
        if (isMounted) {
          setIsLoadingProfile(false);
        }
      }
    };

    fetchProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchStore = async () => {
      if (!profile?.storeId) return;
      setIsLoadingStore(true);
      try {
        const res = await storeApi.getById(profile.storeId);
        if (!isMounted) return;
        if (res?.success && res.data) {
          setStore(res.data);
        }
      } catch {
        // Không chặn trang nếu lỗi lấy store, chỉ bỏ qua
      } finally {
        if (isMounted) {
          setIsLoadingStore(false);
        }
      }
    };

    fetchStore();

    return () => {
      isMounted = false;
    };
  }, [profile?.storeId]);

  useEffect(() => {
    const fetchWallet = async () => {
      if (!profile?.storeId || profile.role !== 'StoreStaff') return;
      try {
        setIsLoadingWallet(true);
        const res = await paymentApi.getWallet(profile.storeId);
        setWallet(res);
      } finally {
        setIsLoadingWallet(false);
      }
    };

    fetchWallet();
  }, [profile?.storeId, profile?.role]);

  const isActive = profile?.isActive ?? false;

  return (
    <div className="relative space-y-6 max-w-6xl mx-auto">
      {/* Background 3D-ish orbs */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <motion.div
          className="absolute -top-24 -right-16 h-64 w-64 rounded-full bg-gradient-to-tr from-primary/40 via-orange-400/40 to-amber-300/40 blur-3xl"
          animate={{ x: [0, 12, -6, 0], y: [0, -10, 6, 0] }}
          transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -bottom-16 -left-10 h-56 w-56 rounded-full bg-gradient-to-tr from-orange-500/35 via-rose-400/35 to-violet-400/35 blur-3xl"
          animate={{ x: [0, -8, 10, 0], y: [0, 10, -6, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* Hero profile card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative"
      >
        <div className="group" style={{ perspective: '1200px' }}>
          <motion.div
            whileHover={{
              rotateX: darkMode ? -3 : -2,
              rotateY: darkMode ? 3 : 2,
              translateY: -4,
            }}
            transition={{ type: 'spring', stiffness: 200, damping: 18 }}
            className="relative rounded-3xl border border-orange-100/60 dark:border-border bg-gradient-to-br from-orange-50/80 via-white/90 to-amber-100/70 dark:from-orange-950/70 dark:via-slate-950/90 dark:to-amber-950/60 shadow-[0_24px_80px_rgba(15,23,42,0.35)] overflow-hidden"
            >
            <div className="absolute inset-0 opacity-60 mix-blend-soft-light pointer-events-none">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_0_0,rgba(248,250,252,0.3),transparent_55%),radial-gradient(circle_at_100%_0,rgba(254,215,170,0.6),transparent_55%)]" />
            </div>

            <div className="relative flex flex-col xl:flex-row items-stretch gap-8 p-6 md:p-8">
              {/* Avatar + summary */}
              <div className="flex flex-1 min-w-0 items-center gap-5 md:gap-6">
                <div className="relative">
                  <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-primary/60 via-amber-400/60 to-rose-400/40 blur-xl opacity-70" />
                  <div className="relative flex h-20 w-20 md:h-24 md:w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-primary to-orange-500 text-primary-foreground shadow-xl shadow-orange-500/40">
                    <UserIcon className="absolute inset-0 m-auto h-10 w-10 opacity-10" />
                    <span className="text-2xl font-bold tracking-wide">
                      {getInitials(profile?.fullName, profile?.username)}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
                      {profile?.fullName || profile?.username || 'Người dùng'}
                    </h2>
                    {profile?.username && (
                      <Badge variant="outline" className="text-xs px-2.5 py-0.5">
                        @{profile.username}
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 md:gap-3">
                    {profile?.email && (
                      <span className="inline-flex items-center gap-1.5 text-xs md:text-sm text-muted-foreground">
                        <Mail className="h-3.5 w-3.5" />
                        {profile.email}
                      </span>
                    )}
                    {profile?.createdAt && (
                      <span className="inline-flex items-center gap-1.5 text-xs md:text-sm text-muted-foreground">
                        <CalendarClock className="h-3.5 w-3.5" />
                        Tham gia từ {formatDate(profile.createdAt)}
                      </span>
                    )}
                  </div>
                  {roleMeta && (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <Badge
                        variant={getRoleBadgeVariant(roleMeta.tone)}
                        className="rounded-full px-3 py-1 text-xs md:text-[13px]"
                      >
                        <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
                        {roleMeta.label}
                      </Badge>
                      <span className="hidden md:inline-block text-xs text-muted-foreground max-w-md">
                        {roleMeta.description}
                      </span>
                    </div>
                  )}

                  <div className="pt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full border-primary/60 text-xs md:text-sm"
                      onClick={() => navigate('/settings')}
                    >
                      <span className="underline-offset-4 hover:underline">
                        Tinh chỉnh cài đặt cá nhân
                      </span>
                      <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Status & quick stats */}
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
                <Card className="border-none bg-white/60 dark:bg-black/20 backdrop-blur-sm shadow-none">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-emerald-500" />
                      Trạng thái tài khoản
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Tình trạng hoạt động hiện tại của tài khoản.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isActive ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-amber-500" />
                      )}
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold">
                          {isActive ? 'Đang hoạt động' : 'Đã bị vô hiệu hóa'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {isActive
                            ? 'Bạn có thể sử dụng đầy đủ các tính năng được phân quyền.'
                            : 'Liên hệ Admin nếu đây là nhầm lẫn.'}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-none bg-white/60 dark:bg-black/20 backdrop-blur-sm shadow-none">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-sky-500" />
                      Đơn vị làm việc
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Cửa hàng hoặc bộ phận bạn đang phụ trách.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {isLoadingStore ? (
                      <div className="h-10 rounded-xl bg-muted animate-pulse" />
                    ) : store ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-sm font-semibold">
                          <MapPin className="h-4 w-4 text-primary" />
                          <span>{store.storeName || store.name}</span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {store.address}
                        </p>
                      </div>
                    ) : profile?.storeId ? (
                      <p className="text-xs text-muted-foreground">
                        Không thể tải thông tin cửa hàng. Thử lại sau hoặc liên
                        hệ Admin.
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Không gắn với cửa hàng cụ thể (thường là Admin, Manager
                        hoặc nhân sự bếp trung tâm).
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-none bg-white/60 dark:bg-black/20 backdrop-blur-sm shadow-none">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Activity className="h-4 w-4 text-violet-500" />
                      Snapshot hoạt động
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Tóm tắt nhanh về vai trò của bạn trong ngày.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    <div className="space-y-1 text-xs">
                      <p className="text-muted-foreground flex items-center gap-1.5">
                        <Clock3 className="h-3.5 w-3.5 text-amber-500" />
                        Ca làm hiện tại
                      </p>
                      <p className="font-medium text-foreground">
                        Tùy theo lịch vận hành thực tế
                      </p>
                    </div>
                    <div className="space-y-1 text-xs">
                      <p className="text-muted-foreground">
                        Quyền thao tác
                      </p>
                      <p className="font-medium text-foreground">
                        {profile?.role || '—'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Detailed information & helpful tips */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 md:gap-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="lg:col-span-2"
        >
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base md:text-lg flex items-center gap-2">
                <UserIcon className="h-4 w-4 text-primary" />
                Thông tin cá nhân
              </CardTitle>
              <CardDescription>
                Dữ liệu được đồng bộ trực tiếp từ hệ thống backend. Nếu cần cập
                nhật, vui lòng liên hệ Admin hoặc Manager.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              <InfoRow
                label="Họ và tên"
                value={profile?.fullName || 'Chưa có thông tin'}
              />
              <InfoRow
                label="Tên đăng nhập"
                value={profile?.username || 'Chưa có thông tin'}
              />
              <InfoRow
                label="Email"
                value={profile?.email || 'Chưa có thông tin'}
              />
              <InfoRow
                label="Vai trò hệ thống"
                value={profile?.role || 'Chưa có thông tin'}
              />
              <InfoRow
                label="Mã cửa hàng"
                value={
                  store?.store_code ||
                  (profile?.storeId ? String(profile.storeId) : 'Không áp dụng')
                }
              />
              <InfoRow
                label="Trạng thái"
                value={isActive ? 'Đang hoạt động' : 'Đã vô hiệu hóa'}
                tone={isActive ? 'success' : 'warning'}
              />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.3 }}
          className="space-y-4"
        >
          {profile?.role === 'StoreStaff' && profile.storeId && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  Ví cửa hàng của bạn
                </CardTitle>
                <CardDescription className="text-xs">
                  Số dư và thông tin ví gắn với cửa hàng mà bạn phụ trách.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-[0.2em]">
                      Store Wallet
                    </p>
                    <p className="mt-1 text-lg font-bold">
                      {isLoadingWallet
                        ? 'Đang tải...'
                        : new Intl.NumberFormat('vi-VN', {
                            style: 'currency',
                            currency: 'VND',
                          }).format(wallet?.balance ?? 0)}
                    </p>
                  </div>
                  <div className="text-right text-[11px] text-muted-foreground">
                    <p>Store ID</p>
                    <p className="font-mono">
                      {String(profile.storeId).slice(-6).toUpperCase()}
                    </p>
                  </div>
                </div>
                {wallet?.status === 'Locked' && (
                  <p className="text-[11px] text-red-500">
                    Ví đang bị khóa, vui lòng liên hệ Manager để được hỗ trợ.
                  </p>
                )}
                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-center text-xs"
                    onClick={() => navigate('/store/dashboard')}
                  >
                    Mở Store Dashboard để nạp ví & xem chi tiết
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                Gợi ý bảo mật
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-muted-foreground">
              <p>
                Hãy giữ bí mật thông tin đăng nhập và không chia sẻ tài khoản
                cho người khác. Nếu nghi ngờ có truy cập bất thường, hãy báo
                ngay cho Admin.
              </p>
              <p>
                Tính năng đổi mật khẩu trực tiếp trên hệ thống sẽ sớm được cập
                nhật. Trong lúc này, bạn có thể yêu cầu Admin đặt lại mật khẩu
                khi cần.
              </p>
            </CardContent>
          </Card>

          {error && (
            <Card className="border-amber-300/70 bg-amber-50/70 dark:bg-amber-950/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-amber-800 dark:text-amber-200">
                  <AlertCircle className="h-4 w-4" />
                  Không thể đồng bộ hồ sơ
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-amber-800/90 dark:text-amber-100/90 space-y-2">
                <p>{error}</p>
                <p>
                  Thông tin hiển thị có thể được lấy từ phiên đăng nhập hiện
                  tại và không hoàn toàn mới nhất. Thử tải lại trang hoặc đăng
                  nhập lại nếu vấn đề tiếp diễn.
                </p>
              </CardContent>
            </Card>
          )}

          {(isLoadingProfile || (!profile && !error)) && (
            <Card>
              <CardContent className="space-y-3 pt-6">
                <div className="h-3 w-32 rounded-full bg-muted animate-pulse" />
                <div className="h-3 w-40 rounded-full bg-muted animate-pulse" />
                <div className="h-3 w-24 rounded-full bg-muted animate-pulse" />
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>
    </div>
  );
};

interface InfoRowProps {
  label: string;
  value: string;
  tone?: 'default' | 'success' | 'warning';
}

const InfoRow = ({ label, value, tone = 'default' }: InfoRowProps) => {
  const toneClass =
    tone === 'success'
      ? 'text-emerald-600 dark:text-emerald-400'
      : tone === 'warning'
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-foreground';

  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className={`text-sm font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
};

export default ProfilePage;

