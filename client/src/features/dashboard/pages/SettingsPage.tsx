import { useEffect, useState } from 'react';
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
  Plus,
  Trash2,
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
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newSetting, setNewSetting] = useState<CreateSystemSettingPayload>({
    key: '',
    value: '',
    description: '',
    isPublic: false,
  });
  const [creating, setCreating] = useState(false);

  const isAdmin = user?.role === 'Admin';
  const canManageSystem = user?.role === 'Admin' || user?.role === 'Manager';

  const fetchSystemSettings = async () => {
    if (!canManageSystem) return;
    setIsLoadingSystemSettings(true);
    setSystemSettingsError(null);
    try {
      const res = await systemSettingApi.getAll();
      if (res?.success && Array.isArray(res.data)) {
        setSystemSettings(res.data);
      } else {
        setSystemSettings([]);
        setSystemSettingsError(
          res?.message ||
          'Không thể tải System Settings. Kiểm tra cấu hình backend.'
        );
      }
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 404) {
        setSystemSettingsError(
          'API /api/system-settings hiện chưa được backend mount. Hãy thêm app.use("/api/system-settings", systemSettingRoutes) trong server để sử dụng trang này.'
        );
      } else {
        setSystemSettingsError(
          err?.response?.data?.message ||
          err?.message ||
          'Đã xảy ra lỗi khi tải System Settings.'
        );
      }
      setSystemSettings([]);
    } finally {
      setIsLoadingSystemSettings(false);
    }
  };

  useEffect(() => {
    if (canManageSystem) fetchSystemSettings();
  }, [canManageSystem]);

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

  const handleSaveSystemSetting = async (setting: SystemSetting) => {
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
    } catch (err: any) {
      setSystemSettingsError(
        err?.response?.data?.message ||
        err?.message ||
        'Đã xảy ra lỗi khi lưu System Setting.'
      );
    } finally {
      setSavingKey(null);
    }
  };

  const handleSeed = async () => {
    if (!window.confirm('Seed lại System Settings mặc định? Có thể ghi đè giá trị hiện có.')) return;
    setSeeding(true);
    setSystemSettingsError(null);
    try {
      const res = await systemSettingApi.seed();
      if (res?.success && Array.isArray(res.data)) {
        setSystemSettings(res.data);
      } else {
        await fetchSystemSettings();
      }
    } catch (err: any) {
      setSystemSettingsError(err?.response?.data?.message || err?.message || 'Seed thất bại.');
    } finally {
      setSeeding(false);
    }
  };

  const handleDeleteSetting = async (key: string) => {
    if (!window.confirm(`Xóa setting "${key}"?`)) return;
    setDeletingKey(key);
    try {
      await systemSettingApi.delete(key);
      setSystemSettings((prev) => (prev ?? []).filter((s) => s.key !== key));
    } catch (err: any) {
      setSystemSettingsError(err?.response?.data?.message || err?.message || 'Xóa thất bại.');
    } finally {
      setDeletingKey(null);
    }
  };

  const handleCreateSetting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSetting.key.trim()) return;
    setCreating(true);
    setSystemSettingsError(null);
    try {
      const res = await systemSettingApi.create(newSetting);
      if (res?.success && res.data) {
        setSystemSettings((prev) => (prev ?? []).concat(res.data));
        setIsCreateModalOpen(false);
        setNewSetting({ key: '', value: '', description: '', isPublic: false });
      }
    } catch (err: any) {
      setSystemSettingsError(err?.response?.data?.message || err?.message || 'Tạo mới thất bại.');
    } finally {
      setCreating(false);
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
                          (tên sản phẩm, báo cáo, …) vẫn phụ thuộc backend.
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
                      Các lựa chọn này sẽ được sử dụng khi backend bổ sung cơ
                      chế gửi email/push notification.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <SettingToggle
                      checked={enableEmailNotifications}
                      label="Gửi tóm tắt qua email"
                      description="Nhận email tóm tắt cuối ngày về đơn hàng, sản xuất và tồn kho (khi backend hỗ trợ)."
                      onToggle={toggleEmailNotifications}
                      iconOn={<Mail className="h-4 w-4" />}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Hiện tại hệ thống chưa kích hoạt tính năng gửi email tự
                      động. Đây là bước chuẩn bị để khi backend sẵn sàng, bạn
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
                      System Settings (cho Admin)
                    </CardTitle>
                    <CardDescription className="text-xs md:text-sm">
                      Các tham số này ảnh hưởng tới toàn bộ hệ thống: phí giao
                      hàng, thuế, cấu hình UI mặc định, v.v.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-[11px] text-muted-foreground space-y-2">
                    <p>
                      Endpoint sử dụng:{' '}
                      <code className="rounded-md bg-black/5 px-1.5 py-0.5 text-[10px]">
                        GET /api/system-settings
                      </code>{' '}
                      &amp;{' '}
                      <code className="rounded-md bg-black/5 px-1.5 py-0.5 text-[10px]">
                        PUT /api/system-settings/:key
                      </code>
                      .
                    </p>
                    <p>
                      Nếu bạn không thấy dữ liệu bên dưới, hãy kiểm tra lại việc
                      mount route trong backend.
                    </p>
                  </CardContent>
                </Card>

                {systemSettingsError && (
                  <Card className="border-amber-300/70 bg-amber-50/80 dark:bg-amber-950/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs md:text-sm flex items-center gap-2 text-amber-800 dark:text-amber-100">
                        <AlertCircle className="h-4 w-4" />
                        Không thể tải System Settings
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-[11px] md:text-xs text-amber-900/90 dark:text-amber-100/90 space-y-1.5">
                      <p>{systemSettingsError}</p>
                    </CardContent>
                  </Card>
                )}

                <div className="flex flex-wrap gap-2">
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
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setIsCreateModalOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Thêm setting
                  </Button>
                </div>

                <div className="space-y-3">
                  {isLoadingSystemSettings && (
                    <Card>
                      <CardContent className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Đang tải danh sách System Settings...
                      </CardContent>
                    </Card>
                  )}

                  {!isLoadingSystemSettings &&
                    (systemSettings?.length ?? 0) === 0 &&
                    !systemSettingsError && (
                      <Card>
                        <CardContent className="py-6 text-sm text-muted-foreground flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          Chưa có System Settings nào hoặc dữ liệu rỗng. Bạn có
                          thể seed dữ liệu mặc định bằng API{' '}
                          <code className="rounded-md bg-black/5 px-1.5 py-0.5 text-[10px]">
                            POST /api/system-settings/seed
                          </code>
                          .
                        </CardContent>
                      </Card>
                    )}

                  {systemSettings &&
                    systemSettings.map((setting) => (
                      <Card key={setting._id || setting.key}>
                        <CardHeader className="pb-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="space-y-1">
                              <CardTitle className="text-sm font-semibold">
                                {setting.key}
                              </CardTitle>
                              {setting.description && (
                                <CardDescription className="text-xs">
                                  {setting.description}
                                </CardDescription>
                              )}
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
                            <Input
                              value={setting.value}
                              onChange={(e) =>
                                handleSystemSettingChange(setting.key, {
                                  value: e.target.value,
                                })
                              }
                            />
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
                            <Button
                              type="button"
                              size="sm"
                              variant="default"
                              className="flex-shrink-0"
                              disabled={savingKey === setting.key || deletingKey === setting.key}
                              onClick={() => handleSaveSystemSetting(setting)}
                            >
                              {savingKey === setting.key ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Lưu thay đổi'}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="flex-shrink-0 text-destructive hover:bg-destructive/10"
                              disabled={deletingKey === setting.key}
                              onClick={() => handleDeleteSetting(setting.key)}
                            >
                              {deletingKey === setting.key ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                  {isCreateModalOpen && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Thêm System Setting</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <form onSubmit={handleCreateSetting} className="space-y-3">
                          <div>
                            <Label className="text-xs">Key *</Label>
                            <Input
                              value={newSetting.key}
                              onChange={(e) => setNewSetting((p) => ({ ...p, key: e.target.value }))}
                              placeholder="VD: SHIPPING_COST_BASE"
                              required
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Value *</Label>
                            <Input
                              value={newSetting.value}
                              onChange={(e) => setNewSetting((p) => ({ ...p, value: e.target.value }))}
                              placeholder="VD: 50000"
                              required
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Description</Label>
                            <Input
                              value={newSetting.description ?? ''}
                              onChange={(e) => setNewSetting((p) => ({ ...p, description: e.target.value }))}
                              placeholder="Mô tả ngắn"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="new-setting-public"
                              checked={newSetting.isPublic ?? false}
                              onChange={(e) => setNewSetting((p) => ({ ...p, isPublic: e.target.checked }))}
                            />
                            <Label htmlFor="new-setting-public" className="text-xs">Public (FE đọc được)</Label>
                          </div>
                          <div className="flex gap-2">
                            <Button type="submit" size="sm" disabled={creating}>
                              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                              Tạo
                            </Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateModalOpen(false)}>
                              Hủy
                            </Button>
                          </div>
                        </form>
                      </CardContent>
                    </Card>
                  )}
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

