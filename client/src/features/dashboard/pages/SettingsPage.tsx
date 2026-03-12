import { useEffect, useMemo, useState } from 'react';
import {
  Sun,
  Moon,
  Bell,
  Mail,
  Volume2,
  Languages,
  SlidersHorizontal,
  Shield,
  Database,
  Globe2,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

import { useAuthStore } from '@/shared/zustand/authStore';
import { useThemeStore } from '@/shared/zustand/themeStore';
import { useUserSettingsStore } from '@/shared/zustand/userSettingsStore';
import { systemSettingApi, type SystemSetting, type CreateSystemSettingPayload } from '@/api/SystemSettingApi';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/features/manager/components/ui/Card';
import { Button } from '@/features/manager/components/ui/Button';
import { Badge } from '@/features/manager/components/ui/Badge';
import { Input } from '@/features/manager/components/ui/Input';
import { Label } from '@/features/manager/components/ui/Label';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/features/manager/components/ui/Tabs';

type TabValue = 'personal' | 'appearance' | 'notifications' | 'system';

const SettingsPage = () => {
  const { user } = useAuthStore();
  const { darkMode, toggleDarkMode } = useThemeStore();
  const {
    language,
    compactMode,
    enableEmailNotifications,
    enableSystemNotifications,
    enableSoundEffects,
    setLanguage,
    toggleCompactMode,
    toggleEmailNotifications,
    toggleSystemNotifications,
    toggleSoundEffects,
  } = useUserSettingsStore();

  const [activeTab, setActiveTab] = useState<TabValue>('personal');

  const [systemSettings, setSystemSettings] = useState<SystemSetting[] | null>(
    null
  );
  const [isLoadingSystemSettings, setIsLoadingSystemSettings] = useState(false);
  const [systemSettingsError, setSystemSettingsError] = useState<
    string | null
  >(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [filterGroup, setFilterGroup] = useState<SystemSetting['group'] | 'ALL'>('ALL');
  const [publicOnly, setPublicOnly] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newSetting, setNewSetting] = useState<CreateSystemSettingPayload>({
    key: '',
    value: '',
    description: '',
    isPublic: false,
    dataType: 'STRING',
    group: 'OTHER',
  });

  const isAdmin = user?.role === 'Admin';
  const canManageSystem = user?.role === 'Admin' || user?.role === 'Manager';

  const groupedSystemSettings = useMemo(() => {
    if (!systemSettings) return {};
    const map: Record<string, SystemSetting[]> = {};
    for (const s of systemSettings) {
      const groupKey = (s.group ?? 'OTHER').toUpperCase();
      if (!map[groupKey]) map[groupKey] = [];
      map[groupKey].push(s);
    }
    // sắp xếp trong mỗi group theo key
    Object.keys(map).forEach((k) => {
      map[k] = map[k].slice().sort((a, b) => a.key.localeCompare(b.key));
    });
    return map;
  }, [systemSettings]);

  const fetchSystemSettings = async (): Promise<void> => {
    if (!canManageSystem) return;
    setIsLoadingSystemSettings(true);
    setSystemSettingsError(null);
    try {
      const res = await systemSettingApi.getAll(
        publicOnly,
        filterGroup === 'ALL' ? undefined : filterGroup
      );
      if (res?.success && Array.isArray(res.data)) {
        setSystemSettings(res.data);
      } else {
        setSystemSettings([]);
        setSystemSettingsError(
          res?.message ||
          'Không thể tải cài đặt hệ thống. Vui lòng thử lại sau hoặc liên hệ quản trị.'
        );
      }
    } catch (err) {
      const error = err as { response?: { status?: number; data?: { message?: string } }; message?: string };
      const status = error?.response?.status;
      if (status === 404) {
        setSystemSettingsError(
          'Tính năng cài đặt hệ thống tạm thời chưa khả dụng. Vui lòng thử lại sau hoặc liên hệ quản trị.'
        );
      } else {
        setSystemSettingsError(
          error?.response?.data?.message ||
          error?.message ||
          'Đã xảy ra lỗi khi tải cài đặt hệ thống.'
        );
      }
      setSystemSettings([]);
    } finally {
      setIsLoadingSystemSettings(false);
    }
  };

  useEffect(() => {
    if (canManageSystem) {
      void fetchSystemSettings();
    }
  }, [canManageSystem, publicOnly, filterGroup]);

  const handleSystemSettingChange = (
    key: string,
    changes: Partial<SystemSetting>
  ) => {
    setSystemSettings((prev) =>
      prev
        ? prev.map((s) => (s.key === key ? { ...s, ...changes } : s))
        : prev
    );
  };

  const handleSaveSystemSetting = async (setting: SystemSetting): Promise<void> => {
    setSavingKey(setting.key);
    setSystemSettingsError(null);
    try {
      const res = await systemSettingApi.update(setting.key, {
        value: setting.value,
        description: setting.description,
        isPublic: setting.isPublic,
      });
      if (res?.success && res.data) {
        setSystemSettings((prev) =>
          prev
            ? prev.map((s) =>
              s.key === setting.key ? { ...s, ...res.data } : s
            )
            : prev
        );
      } else {
        setSystemSettingsError(
          res?.message || 'Không thể lưu thay đổi. Thử lại sau.'
        );
      }
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      setSystemSettingsError(
        error?.response?.data?.message ||
        error?.message ||
        'Đã xảy ra lỗi khi lưu System Setting.'
      );
    } finally {
      setSavingKey(null);
    }
  };

  const handleSeed = async (): Promise<void> => {
    if (!window.confirm('Seed lại cài đặt hệ thống mặc định? Có thể ghi đè giá trị hiện có.')) return;
    setSeeding(true);
    setSystemSettingsError(null);
    try {
      const res = await systemSettingApi.seed();
      if (res?.success && Array.isArray(res.data)) {
        setSystemSettings(res.data);
      } else {
        await fetchSystemSettings();
      }
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      setSystemSettingsError(error?.response?.data?.message || error?.message || 'Seed thất bại.');
    } finally {
      setSeeding(false);
    }
  };

  const handleCreateSystemSetting = async (): Promise<void> => {
    const rawKey = newSetting.key.trim();
    if (!rawKey) {
      setSystemSettingsError('Vui lòng nhập key cho setting mới.');
      return;
    }
    const normalizedKey = rawKey.toUpperCase().replace(/\s+/g, '_');
    const payload: CreateSystemSettingPayload = {
      ...newSetting,
      key: normalizedKey,
      value: newSetting.value.trim(),
      dataType: newSetting.dataType ?? 'STRING',
      group: newSetting.group ?? 'OTHER',
      isPublic: newSetting.isPublic ?? false,
    };
    setCreating(true);
    setSystemSettingsError(null);
    try {
      const res = await systemSettingApi.create(payload);
      if (res?.success && res.data) {
        setSystemSettings((prev) => (prev ? [...prev, res.data] : [res.data]));
        setNewSetting({
          key: '',
          value: '',
          description: '',
          isPublic: false,
          dataType: 'STRING',
          group: 'OTHER',
        });
      } else {
        setSystemSettingsError(res?.message || 'Không thể tạo System Setting mới.');
      }
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      setSystemSettingsError(
        error?.response?.data?.message ||
        error?.message ||
        'Đã xảy ra lỗi khi tạo System Setting.'
      );
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteSystemSetting = async (setting: SystemSetting): Promise<void> => {
    if (!window.confirm(`Xóa setting "${setting.key}"?`)) return;
    setSystemSettingsError(null);
    try {
      const res = await systemSettingApi.delete(setting.key);
      if ((res as { success?: boolean })?.success !== false) {
        setSystemSettings((prev) =>
          prev ? prev.filter((s) => s.key !== setting.key) : prev
        );
      } else {
        const msg = (res as { message?: string }).message;
        setSystemSettingsError(msg || 'Không thể xoá System Setting.');
      }
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      setSystemSettingsError(
        error?.response?.data?.message ||
        error?.message ||
        'Đã xảy ra lỗi khi xoá System Setting.'
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">
            Cài đặt
          </h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-xl">
            Tinh chỉnh trải nghiệm làm việc của bạn: giao diện, ngôn ngữ, thông
            báo và (nếu là Admin) cấu hình toàn hệ thống.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge
            variant={darkMode ? 'secondary' : 'outline'}
            className="flex items-center gap-1.5 px-3 py-1 text-xs"
          >
            <Shield className="h-3.5 w-3.5" />
            <span>
              {user?.role === 'Admin'
                ? 'Quyền quản trị hệ thống'
                : 'Cài đặt cá nhân'}
            </span>
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
        <Card className="overflow-hidden">
          <CardHeader className="border-b border-border/50 pb-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-primary to-orange-400 flex items-center justify-center text-primary-foreground shadow-md shadow-primary/40">
                  <SlidersHorizontal className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base md:text-lg">
                    Bảng điều khiển cài đặt
                  </CardTitle>
                  <CardDescription className="text-xs md:text-sm">
                    Các thay đổi sẽ được lưu trên thiết bị của bạn và áp dụng cho
                    toàn bộ khu vực dashboard.
                  </CardDescription>
                </div>
              </div>
              <TabsList>
                <TabsTrigger value="personal">
                  Cá nhân
                </TabsTrigger>
                <TabsTrigger value="appearance">
                  Giao diện
                </TabsTrigger>
                <TabsTrigger value="notifications">
                  Thông báo
                </TabsTrigger>
                {canManageSystem && (
                  <TabsTrigger value="system">
                    Hệ thống
                  </TabsTrigger>
                )}
              </TabsList>
            </div>
          </CardHeader>

          <CardContent className="pt-4">
            {/* PERSONAL */}
            <TabsContent value="personal" className="mt-0 space-y-5">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <Card className="lg:col-span-2">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm md:text-base flex items-center gap-2">
                      <Globe2 className="h-4 w-4 text-primary" />
                      Ngôn ngữ & bố cục
                    </CardTitle>
                    <CardDescription className="text-xs md:text-sm">
                      Lựa chọn ngôn ngữ hiển thị và phong cách bố cục phù hợp
                      với thói quen làm việc của bạn.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-wide">
                          Ngôn ngữ giao diện
                        </Label>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant={language === 'vi' ? 'default' : 'outline'}
                            onClick={() => setLanguage('vi')}
                          >
                            <Languages className="mr-1.5 h-4 w-4" />
                            Tiếng Việt
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={language === 'en' ? 'default' : 'outline'}
                            onClick={() => setLanguage('en')}
                          >
                            <Languages className="mr-1.5 h-4 w-4" />
                            English
                          </Button>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Ngôn ngữ được lưu tại trình duyệt. Nội dung dữ liệu
                          (tên sản phẩm, báo cáo, …) do hệ thống quản lý.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-wide">
                          Bố cục hiển thị
                        </Label>
                        <SettingToggle
                          checked={compactMode}
                          label="Chế độ hiển thị cô đọng"
                          description="Giảm khoảng cách giữa các dòng, phù hợp khi làm việc trên màn hình nhỏ hoặc nhiều dữ liệu."
                          onToggle={toggleCompactMode}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Shield className="h-4 w-4 text-emerald-500" />
                      Trạng thái cài đặt
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs">
                    <StatusRow
                      label="Đồng bộ theme"
                      value={darkMode ? 'Dark mode' : 'Light mode'}
                      icon={darkMode ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
                    />
                    <StatusRow
                      label="Ngôn ngữ ưu tiên"
                      value={language === 'vi' ? 'Tiếng Việt' : 'English'}
                      icon={<Globe2 className="h-3.5 w-3.5" />}
                    />
                    <StatusRow
                      label="Bố cục bảng dữ liệu"
                      value={compactMode ? 'Cô đọng' : 'Tiêu chuẩn'}
                    />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* APPEARANCE */}
            <TabsContent value="appearance" className="mt-0 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm md:text-base flex items-center gap-2">
                      <Sun className="h-4 w-4 text-primary" />
                      Chế độ sáng/tối
                    </CardTitle>
                    <CardDescription className="text-xs md:text-sm">
                      Dark mode giúp giảm mỏi mắt khi làm việc trong môi trường
                      ánh sáng yếu.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <SettingToggle
                      checked={darkMode}
                      label="Bật chế độ Dark mode"
                      description="Áp dụng cho toàn bộ giao diện dashboard trên thiết bị này."
                      onToggle={toggleDarkMode}
                      iconOn={<Moon className="h-4 w-4" />}
                      iconOff={<Sun className="h-4 w-4" />}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Hệ thống tự động nhớ lựa chọn của bạn thông qua local
                      storage và không ảnh hưởng tới tài khoản của người dùng
                      khác.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm md:text-base flex items-center gap-2">
                      <SlidersHorizontal className="h-4 w-4 text-primary" />
                      Màu sắc & chuyển động
                    </CardTitle>
                    <CardDescription className="text-xs md:text-sm">
                      Tùy chỉnh mức độ chuyển động & hiệu ứng để phù hợp với sở
                      thích cá nhân.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs">
                    <p className="text-muted-foreground">
                      Các hiệu ứng chuyển động (animation) đang được tối ưu để
                      giữ trải nghiệm mượt mà nhưng không gây mất tập trung. Nếu
                      bạn gặp cảm giác khó chịu với chuyển động, hãy báo cho
                      team để bổ sung chế độ &quot;giảm chuyển động&quot;.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* NOTIFICATIONS */}
            <TabsContent value="notifications" className="mt-0 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm md:text-base flex items-center gap-2">
                      <Bell className="h-4 w-4 text-primary" />
                      Thông báo hoạt động
                    </CardTitle>
                    <CardDescription className="text-xs md:text-sm">
                      Quản lý cách hệ thống gửi thông báo khi có đơn hàng mới,
                      cảnh báo tồn kho, hay cập nhật sản xuất.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <SettingToggle
                      checked={enableSystemNotifications}
                      label="Hiển thị thông báo trong dashboard"
                      description="Hiện badge và popup thông báo ở góc phải trên khi có sự kiện quan trọng."
                      onToggle={toggleSystemNotifications}
                      iconOn={<Bell className="h-4 w-4" />}
                    />
                    <SettingToggle
                      checked={enableSoundEffects}
                      label="Âm thanh thông báo"
                      description="Phát âm thanh nhẹ khi có thông báo quan trọng (tùy thuộc cấu hình trình duyệt)."
                      onToggle={toggleSoundEffects}
                      iconOn={<Volume2 className="h-4 w-4" />}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm md:text-base flex items-center gap-2">
                      <Mail className="h-4 w-4 text-primary" />
                      Email & kênh khác
                    </CardTitle>
                    <CardDescription className="text-xs md:text-sm">
                      Các lựa chọn này sẽ được áp dụng khi hệ thống bật gửi
                      email hoặc thông báo đẩy.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <SettingToggle
                      checked={enableEmailNotifications}
                      label="Gửi tóm tắt qua email"
                      description="Nhận email tóm tắt cuối ngày về đơn hàng, sản xuất và tồn kho (khi tính năng được bật)."
                      onToggle={toggleEmailNotifications}
                      iconOn={<Mail className="h-4 w-4" />}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Hiện tại hệ thống chưa kích hoạt tính năng gửi email tự
                      động. Đây là bước chuẩn bị để khi tính năng được bật, bạn
                      không cần cấu hình lại.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* SYSTEM (ADMIN) */}
            {isAdmin && (
              <TabsContent value="system" className="mt-0 space-y-4">
                <Card className="border-dashed border-primary/30 bg-primary/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Database className="h-4 w-4 text-primary" />
                      Cài đặt hệ thống (cho Admin)
                    </CardTitle>
                    <CardDescription className="text-xs md:text-sm">
                      Các tham số này ảnh hưởng tới toàn bộ hệ thống: phí giao
                      hàng, thuế, cấu hình UI mặc định, v.v.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-[11px] text-muted-foreground space-y-2">
                    <p>
                      Cài đặt được đồng bộ với máy chủ. Nếu không tải được dữ
                      liệu bên dưới, vui lòng thử lại sau hoặc liên hệ quản trị.
                    </p>
                  </CardContent>
                </Card>

                {systemSettingsError && (
                  <Card className="border-amber-300/70 bg-amber-50/80 dark:bg-amber-950/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs md:text-sm flex items-center gap-2 text-amber-800 dark:text-amber-100">
                        <AlertCircle className="h-4 w-4" />
                        Không thể tải cài đặt hệ thống
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-[11px] md:text-xs text-amber-900/90 dark:text-amber-100/90 space-y-1.5">
                      <p>{systemSettingsError}</p>
                    </CardContent>
                  </Card>
                )}

                <div className="flex flex-wrap gap-2 items-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSeed}
                    disabled={seeding}
                  >
                    {seeding ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                    Seed mặc định
                  </Button>
                  <select
                    className="h-8 rounded-md border border-border bg-background px-2 text-xs"
                    value={filterGroup}
                    onChange={(e) =>
                      setFilterGroup(
                        e.target.value === 'ALL'
                          ? 'ALL'
                          : (e.target.value as SystemSetting['group'])
                      )
                    }
                  >
                    <option value="ALL">Tất cả group</option>
                    <option value="SYSTEM">SYSTEM</option>
                    <option value="FINANCE">FINANCE</option>
                    <option value="DELIVERY">DELIVERY</option>
                    <option value="PRODUCTION">PRODUCTION</option>
                    <option value="ORDER">ORDER</option>
                    <option value="INVENTORY">INVENTORY</option>
                    <option value="OTHER">OTHER</option>
                  </select>
                  <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <input
                      type="checkbox"
                      className="h-3 w-3"
                      checked={publicOnly}
                      onChange={(e) => setPublicOnly(e.target.checked)}
                    />
                    Chỉ hiển thị public
                  </label>
                </div>

                <div className="space-y-3">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Tạo System Setting mới</CardTitle>
                      <CardDescription className="text-xs">
                        Dùng cho các tham số cấu hình hệ thống như MAX_ORDERS_PER_TRIP, TAX_RATE, v.v.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 text-xs">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <div>
                          <Label className="text-xs">Key *</Label>
                          <Input
                            value={newSetting.key}
                            onChange={(e) =>
                              setNewSetting((prev) => ({ ...prev, key: e.target.value }))
                            }
                            placeholder="VD: MAX_ORDERS_PER_TRIP"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Giá trị *</Label>
                          <Input
                            value={newSetting.value}
                            onChange={(e) =>
                              setNewSetting((prev) => ({ ...prev, value: e.target.value }))
                            }
                            placeholder="VD: 100"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Nhóm</Label>
                          <select
                            className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs"
                            value={newSetting.group ?? 'OTHER'}
                            onChange={(e) =>
                              setNewSetting((prev) => ({
                                ...prev,
                                group: e.target.value as SystemSetting['group'],
                              }))
                            }
                          >
                            <option value="SYSTEM">SYSTEM</option>
                            <option value="FINANCE">FINANCE</option>
                            <option value="DELIVERY">DELIVERY</option>
                            <option value="PRODUCTION">PRODUCTION</option>
                            <option value="ORDER">ORDER</option>
                            <option value="INVENTORY">INVENTORY</option>
                            <option value="OTHER">OTHER</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <div>
                          <Label className="text-xs">Data type</Label>
                          <select
                            className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs"
                            value={newSetting.dataType ?? 'STRING'}
                            onChange={(e) =>
                              setNewSetting((prev) => ({
                                ...prev,
                                dataType: e.target
                                  .value as NonNullable<SystemSetting['dataType']>,
                              }))
                            }
                          >
                            <option value="STRING">STRING</option>
                            <option value="NUMBER">NUMBER</option>
                            <option value="BOOLEAN">BOOLEAN</option>
                            <option value="JSON">JSON</option>
                          </select>
                        </div>
                        <div className="md:col-span-2">
                          <Label className="text-xs">Mô tả</Label>
                          <Input
                            value={newSetting.description ?? ''}
                            onChange={(e) =>
                              setNewSetting((prev) => ({
                                ...prev,
                                description: e.target.value,
                              }))
                            }
                            placeholder="Ghi chú ý nghĩa của setting"
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <input
                            type="checkbox"
                            className="h-3 w-3"
                            checked={newSetting.isPublic ?? false}
                            onChange={(e) =>
                              setNewSetting((prev) => ({
                                ...prev,
                                isPublic: e.target.checked,
                              }))
                            }
                          />
                          Cho phép client đọc trực tiếp (isPublic)
                        </label>
                        <Button
                          type="button"
                          size="sm"
                          variant="default"
                          disabled={creating}
                          onClick={() => void handleCreateSystemSetting()}
                        >
                          {creating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                          Tạo setting
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                  {isLoadingSystemSettings && (
                    <Card>
                      <CardContent className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Đang tải danh sách cài đặt hệ thống...
                      </CardContent>
                    </Card>
                  )}

                  {!isLoadingSystemSettings &&
                    (systemSettings?.length ?? 0) === 0 &&
                    !systemSettingsError && (
                      <Card>
                        <CardContent className="py-6 text-sm text-muted-foreground flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          Chưa có cài đặt hệ thống nào. Bạn có thể dùng nút
                          &quot;Seed mặc định&quot; bên trên để tạo dữ liệu mẫu.
                        </CardContent>
                      </Card>
                    )}

                  {Object.keys(groupedSystemSettings).length > 0 &&
                    Object.entries(groupedSystemSettings).map(([groupKey, settingsInGroup]) => (
                      <div key={groupKey} className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] px-2 py-0.5 uppercase tracking-wide">
                            {groupKey}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground">
                            {settingsInGroup.length} setting
                          </span>
                        </div>
                        {settingsInGroup.map((setting) => {
                          const typeLabel =
                            setting.dataType === 'NUMBER'
                              ? 'Number'
                              : setting.dataType === 'BOOLEAN'
                                ? 'Boolean'
                                : setting.dataType === 'JSON'
                                  ? 'JSON'
                                  : 'String';
                          return (
                            <Card key={setting._id || setting.key}>
                              <CardHeader className="pb-2">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="space-y-1">
                                    <CardTitle className="text-sm font-semibold">
                                      {setting.key}
                                    </CardTitle>
                                    <div className="flex flex-wrap gap-1.5 items-center">
                                      <Badge variant="outline" className="text-[10px] px-2 py-0.5">
                                        {typeLabel}
                                      </Badge>
                                      {setting.description && (
                                        <CardDescription className="text-xs">
                                          {setting.description}
                                        </CardDescription>
                                      )}
                                    </div>
                                  </div>
                                  <Badge
                                    variant={setting.isPublic ? 'success' : 'outline'}
                                    className="text-[10px] px-2 py-0.5"
                                  >
                                    {setting.isPublic
                                      ? 'Public - FE có thể đọc'
                                      : 'Private - chỉ BFF/BE dùng'}
                                  </Badge>
                                </div>
                              </CardHeader>
                              <CardContent className="space-y-3 pt-1">
                                <div className="space-y-1.5">
                                  <Label className="text-xs">Giá trị</Label>
                                  {setting.dataType === 'BOOLEAN' ? (
                                    <div className="flex items-center gap-2 text-xs">
                                      <input
                                        type="checkbox"
                                        checked={setting.value === 'true'}
                                        onChange={(e) =>
                                          handleSystemSettingChange(setting.key, {
                                            value: e.target.checked ? 'true' : 'false',
                                          })
                                        }
                                      />
                                      <span className="text-muted-foreground">
                                        {setting.value === 'true' ? 'True' : 'False'}
                                      </span>
                                    </div>
                                  ) : setting.dataType === 'JSON' ? (
                                    <textarea
                                      className="w-full min-h-[80px] rounded-md border border-input bg-background px-2 py-1 text-xs font-mono"
                                      value={setting.value}
                                      onChange={(e) =>
                                        handleSystemSettingChange(setting.key, {
                                          value: e.target.value,
                                        })
                                      }
                                    />
                                  ) : (
                                    <Input
                                      type={setting.dataType === 'NUMBER' ? 'number' : 'text'}
                                      value={setting.value}
                                      onChange={(e) =>
                                        handleSystemSettingChange(setting.key, {
                                          value: e.target.value,
                                        })
                                      }
                                    />
                                  )}
                                </div>
                                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                                  <div className="flex-1 min-w-0">
                                    <SettingToggle
                                      checked={setting.isPublic}
                                      label="Cho phép client đọc trực tiếp"
                                      description="Nếu bật, FE có thể đọc setting này thông qua endpoint public."
                                      onToggle={() =>
                                        handleSystemSettingChange(setting.key, {
                                          isPublic: !setting.isPublic,
                                        })
                                      }
                                    />
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="default"
                                      className="flex-shrink-0"
                                      disabled={savingKey === setting.key}
                                      onClick={() => void handleSaveSystemSetting(setting)}
                                    >
                                      {savingKey === setting.key ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        'Lưu thay đổi'
                                      )}
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      className="flex-shrink-0 text-red-600 border-red-200 hover:bg-red-50"
                                      onClick={() => void handleDeleteSystemSetting(setting)}
                                    >
                                      Xóa
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    ))}
                </div>
              </TabsContent>
            )}
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
};

interface SettingToggleProps {
  checked: boolean;
  label: string;
  description?: string;
  onToggle: () => void;
  iconOn?: React.ReactNode;
  iconOff?: React.ReactNode;
}

const SettingToggle = ({
  checked,
  label,
  description,
  onToggle,
  iconOn,
  iconOff,
}: SettingToggleProps) => {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="group flex w-full items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card/80 px-3.5 py-2.5 text-left transition-colors hover:border-primary/50 hover:bg-primary/5"
    >
      <div className="space-y-0.5">
        <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          {checked ? iconOn : iconOff}
          <span>{label}</span>
        </div>
        {description && (
          <p className="text-[11px] text-muted-foreground">{description}</p>
        )}
      </div>
      <div
        className={`relative h-6 w-11 rounded-full border transition-colors ${checked
          ? 'border-primary bg-primary/90'
          : 'border-border bg-muted/80'
          }`}
      >
        <div
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-0.5'
            }`}
        />
      </div>
    </button>
  );
};

interface StatusRowProps {
  label: string;
  value: string;
  icon?: React.ReactNode;
}

const StatusRow = ({ label, value, icon }: StatusRowProps) => {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <span className="text-xs font-semibold text-foreground">{value}</span>
    </div>
  );
};

export default SettingsPage;

