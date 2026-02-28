import { motion } from 'framer-motion';
import {
  HelpCircle,
  Search,
  MessageCircle,
  Info,
  ShieldCheck,
  Phone,
  Mail,
  ArrowRight,
  Keyboard,
  BookOpen,
  Bug,
} from 'lucide-react';

import { useAuthStore } from '@/shared/zustand/authStore';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/features/manager/components/ui/Card';
import { Badge } from '@/features/manager/components/ui/Badge';
import { Input } from '@/features/manager/components/ui/Input';

const QUICK_LINKS = [
  {
    label: 'Xem hồ sơ cá nhân',
    description: 'Kiểm tra thông tin tài khoản, vai trò và cửa hàng phụ trách.',
    href: '/profile',
  },
  {
    label: 'Cài đặt giao diện & thông báo',
    description: 'Điều chỉnh theme, thông báo và tuỳ chọn cá nhân.',
    href: '/settings',
  },
  {
    label: 'Quay về Dashboard',
    description: 'Trở lại màn hình tổng quan theo vai trò của bạn.',
    href: '/dashboard',
  },
];

const SHORTCUTS = [
  { key: 'Ctrl + B', desc: 'Mở/Đóng sidebar' },
  { key: 'Ctrl + F', desc: 'Focus ô tìm kiếm trong header' },
  { key: 'Ctrl + /', desc: 'Mở trang Trợ giúp này' },
];

const HelpPage = () => {
  const { user } = useAuthStore();

  const roleLabel =
    user?.role === 'Admin'
      ? 'Quản trị viên hệ thống'
      : user?.role === 'Manager'
        ? 'Quản lý trung tâm'
        : user?.role === 'KitchenStaff'
          ? 'Nhân viên bếp'
          : user?.role === 'StoreStaff'
            ? 'Nhân viên cửa hàng'
            : user?.role === 'Coordinator'
              ? 'Điều phối viên vận chuyển'
              : 'Người dùng hệ thống';

  return (
    <div className="space-y-6">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="relative overflow-hidden border-none bg-gradient-to-br from-slate-900 via-slate-950 to-amber-900 text-slate-50">
          <div className="pointer-events-none absolute inset-0 opacity-60">
            <div className="absolute -left-20 -top-24 h-72 w-72 rounded-full bg-amber-500/40 blur-3xl" />
            <div className="absolute -right-16 bottom-[-80px] h-64 w-64 rounded-full bg-primary/40 blur-3xl" />
          </div>

          <CardContent className="relative flex flex-col lg:flex-row gap-8 p-6 md:p-8">
            <div className="flex-1 space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur">
                <HelpCircle className="h-3.5 w-3.5 text-amber-300" />
                <span>Trung tâm trợ giúp Kendo Bakery</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                Cần hỗ trợ? Chúng tôi luôn sẵn sàng.
              </h1>
              <p className="max-w-xl text-sm md:text-[15px] text-slate-200/90">
                Trang này giúp bạn nhanh chóng tìm câu trả lời, hiểu luồng làm
                việc theo vai trò và biết liên hệ ai khi có sự cố trong quá
                trình vận hành.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Badge
                  variant="secondary"
                  className="bg-white/10 text-xs text-slate-50"
                >
                  Vai trò hiện tại: {roleLabel}
                </Badge>
                <Badge
                  variant="success"
                  className="text-xs bg-emerald-500/15 text-emerald-200 border-emerald-500/40"
                >
                  <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
                  Tài khoản đã xác thực
                </Badge>
              </div>

              <div className="mt-4 max-w-xl">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Nhập từ khoá: đơn hàng, tồn kho, lịch sản xuất..."
                    className="h-11 rounded-xl border-none bg-white/10 pl-10 text-sm text-slate-50 placeholder:text-slate-400 focus-visible:ring-amber-400/60"
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-300/80">
                  Gợi ý: thử tìm “kế hoạch sản xuất”, “đơn hàng cửa hàng”, “báo
                  cáo tồn kho”.
                </p>
              </div>
            </div>

            <div className="w-full max-w-xs space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-200/90">
                Lối tắt phổ biến
              </p>
              <div className="space-y-2">
                {QUICK_LINKS.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="block rounded-2xl bg-black/25 px-3.5 py-2.5 text-xs transition-colors hover:bg-black/35"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-medium text-slate-50">
                          {link.label}
                        </p>
                        <p className="text-[11px] text-slate-300">
                          {link.description}
                        </p>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-amber-300 flex-shrink-0" />
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 2-column content */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 md:gap-6">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.25 }}
          className="space-y-4 xl:col-span-2"
        >
          {/* FAQ theo vai trò */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm md:text-base flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                Câu hỏi thường gặp theo vai trò
              </CardTitle>
              <CardDescription className="text-xs md:text-sm">
                Một số câu hỏi mà {roleLabel.toLowerCase()} hay gặp trong quá
                trình sử dụng hệ thống.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <FaqItem
                question="Làm sao xem nhanh các công việc chính trong ngày?"
                answer="Hãy xem tại dashboard theo vai trò của bạn (Manager, Coordinator, StoreStaff...). Khu vực này sẽ hiển thị widget tổng quan: đơn hàng mới, kế hoạch sản xuất, lô hàng cần xử lý..."
              />
              <FaqItem
                question="Không thấy đầy đủ menu chức năng?"
                answer="Mỗi vai trò chỉ được cấp quyền cho một số màn hình nhất định. Nếu bạn nghĩ mình cần thêm quyền (ví dụ: xem báo cáo hoặc quản lý kho), hãy liên hệ Admin hoặc Manager để được phân quyền."
              />
              <FaqItem
                question="Số liệu dashboard khác với thực tế?"
                answer="Hệ thống cập nhật theo thao tác nhập liệu ở các màn hình khác (sản xuất, kho, đơn hàng...). Hãy kiểm tra lại thời điểm cập nhật gần nhất, bộ lọc ngày/tháng và quyền xem dữ liệu trước khi báo sự cố."
              />
            </CardContent>
          </Card>

          {/* Phản hồi & báo lỗi */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm md:text-base flex items-center gap-2">
                <Bug className="h-4 w-4 text-red-500" />
                Gặp lỗi hoặc số liệu bất thường?
              </CardTitle>
              <CardDescription className="text-xs md:text-sm">
                Chuẩn bị sẵn thông tin này trước khi gửi cho team kỹ thuật sẽ
                giúp xử lý nhanh hơn.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs md:text-sm text-muted-foreground">
              <ul className="list-disc pl-5 space-y-1.5">
                <li>Ảnh chụp màn hình lỗi (và vùng bạn đang thao tác).</li>
                <li>Thời điểm lỗi xảy ra và bước thao tác cụ thể.</li>
                <li>Thông tin tài khoản (vai trò, cửa hàng đang dùng).</li>
                <li>
                  Mã đơn hàng / lô sản xuất / chuyến giao hàng liên quan (nếu
                  có).
                </li>
              </ul>
              <div className="pt-1 flex flex-wrap gap-2">
                <Badge variant="outline" className="text-[11px]">
                  Tip: Nhấn F12 để mở Console khi chụp màn hình lỗi
                </Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Cột phải: liên hệ & phím tắt */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.25 }}
          className="space-y-4"
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm md:text-base flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-primary" />
                Kênh liên hệ hỗ trợ
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs md:text-sm">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-full bg-primary/10 p-1.5">
                  <Phone className="h-3.5 w-3.5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    Hotline nội bộ (giờ hành chính)
                  </p>
                  <p className="text-muted-foreground">
                    Vui lòng liên hệ số điện thoại do công ty cung cấp để được
                    hỗ trợ khẩn.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-full bg-primary/10 p-1.5">
                  <Mail className="h-3.5 w-3.5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    Email hỗ trợ kỹ thuật
                  </p>
                  <p className="text-muted-foreground">
                    Sử dụng email chung của bộ phận IT/Support để gửi mô tả lỗi
                    kèm hình ảnh.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-full bg-primary/10 p-1.5">
                  <Info className="h-3.5 w-3.5 text-primary" />
                </div>
                <p className="text-muted-foreground">
                  Thông tin cụ thể (số hotline, email) có thể tuỳ chỉnh theo môi
                  trường triển khai thực tế.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm md:text-base flex items-center gap-2">
                <Keyboard className="h-4 w-4 text-primary" />
                Phím tắt gợi ý
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs md:text-sm">
              {SHORTCUTS.map((s) => (
                <div
                  key={s.key}
                  className="flex items-center justify-between gap-2 rounded-xl border bg-muted/40 px-3 py-1.5"
                >
                  <span className="font-mono text-[11px] md:text-xs bg-background/60 px-2 py-0.5 rounded-md border">
                    {s.key}
                  </span>
                  <span className="text-[11px] md:text-xs text-muted-foreground">
                    {s.desc}
                  </span>
                </div>
              ))}
              <p className="pt-1 text-[11px] text-muted-foreground">
                Bạn có thể tuỳ biến phím tắt thực tế trong tương lai (ví dụ:
                thông qua phần Cài đặt hệ thống do Admin cấu hình).
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

interface FaqItemProps {
  question: string;
  answer: string;
}

const FaqItem = ({ question, answer }: FaqItemProps) => {
  return (
    <details className="group rounded-2xl border bg-card/80 px-4 py-3 text-xs md:text-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2">
        <span className="font-medium text-foreground">{question}</span>
        <span className="text-xs text-muted-foreground group-open:hidden">
          Hiển thị
        </span>
        <span className="text-xs text-muted-foreground hidden group-open:inline">
          Thu gọn
        </span>
      </summary>
      <p className="mt-2 text-muted-foreground leading-relaxed">{answer}</p>
    </details>
  );
};

export default HelpPage;

