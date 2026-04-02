/** Nhãn tiếng Việt cho trạng thái đơn logistics (dashboard, bảng) */
export function logisticsOrderStatusVi(status: string): string {
  const m: Record<string, string> = {
    Pending: 'Chờ xử lý',
    Awaiting_Payment: 'Chờ thanh toán',
    Payment_Failed: 'Thanh toán thất bại',
    Approved: 'Đã duyệt',
    Transferred_To_Kitchen: 'Đã chuyển bếp',
    Ready_For_Shipping: 'Sẵn sàng giao',
    In_Transit: 'Đang vận chuyển',
    Received: 'Đã nhận',
    Cancelled: 'Đã hủy',
    Completed: 'Hoàn thành',
  };
  return m[status] ?? status.replace(/_/g, ' ');
}

/** Nhãn tiếng Việt cho trạng thái chuyến giao */
export function tripStatusVi(status: string): string {
  const m: Record<string, string> = {
    Planning: 'Lên kế hoạch',
    Waiting_For_Loading: 'Chờ xếp hàng',
    In_Transit: 'Đang vận chuyển',
    Completed: 'Hoàn thành',
    Cancelled: 'Đã hủy',
  };
  return m[status] ?? status.replace(/_/g, ' ');
}

/** Màu badge đơn hàng — light mode tương phản cao */
export function logisticsOrderStatusBadgeClass(status: string): string {
  switch (status) {
    case 'Received':
    case 'Completed':
      return 'bg-emerald-500 text-white border border-emerald-600';
    case 'In_Transit':
      return 'bg-blue-500 text-white border border-blue-600';
    case 'Cancelled':
      return 'bg-red-500 text-white border border-red-600';
    case 'Pending':
    case 'Awaiting_Payment':
    case 'Payment_Failed':
    case 'Approved':
    case 'Transferred_To_Kitchen':
    case 'Ready_For_Shipping':
      return 'bg-amber-500 text-white border border-amber-600';
    default:
      return 'bg-slate-500 text-white border border-slate-600';
  }
}

export function tripStatusBadgeClass(status: string): string {
  switch (status) {
    case 'Completed':
      return 'bg-emerald-500 text-white border border-emerald-600';
    case 'In_Transit':
      return 'bg-blue-500 text-white border border-blue-600';
    case 'Cancelled':
      return 'bg-red-500 text-white border border-red-600';
    case 'Planning':
    case 'Waiting_For_Loading':
      return 'bg-amber-500 text-white border border-amber-600';
    default:
      return 'bg-slate-500 text-white border border-slate-600';
  }
}

export function roleBadgeClass(role: string): string {
  switch (role) {
    case 'Admin': return 'bg-red-500 text-white border border-red-600';
    case 'Manager': return 'bg-purple-500 text-white border border-purple-600';
    case 'Coordinator': return 'bg-blue-500 text-white border border-blue-600';
    case 'KitchenStaff': return 'bg-orange-500 text-white border border-orange-600';
    case 'StoreStaff': return 'bg-emerald-500 text-white border border-emerald-600';
    default: return 'bg-slate-500 text-white border border-slate-600';
  }
}

export function roleLabelVi(role: string): string {
  const m: Record<string, string> = {
    Admin: 'Quản trị viên',
    Manager: 'Quản lý',
    KitchenStaff: 'Nhân viên bếp',
    StoreStaff: 'Nhân viên cửa hàng',
    Coordinator: 'Điều phối viên',
  };
  return m[role] ?? role;
}

export function feedbackStatusBadgeClass(status: string): string {
  switch (status) {
    case 'pending': return 'bg-amber-500 text-white border border-amber-600';
    case 'approved': return 'bg-blue-500 text-white border border-blue-600';
    case 'rejected': return 'bg-red-500 text-white border border-red-600';
    case 'completed': return 'bg-emerald-500 text-white border border-emerald-600';
    default: return 'bg-slate-500 text-white border border-slate-600';
  }
}

export function feedbackActionBtnClass(darkMode: boolean, variant: 'approve' | 'reject'): string {
  if (variant === 'approve') {
    return darkMode
      ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30'
      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200';
  }
  return darkMode
    ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/30'
    : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200';
}

/** Badge trạng thái sản phẩm (hoạt động / ngưng hoạt động) */
export function productStatusBadgeClass(isActive: boolean | undefined): string {
  if (isActive === false) {
    return 'bg-red-500 text-white border border-red-600';
  }
  return 'bg-emerald-500 text-white border border-emerald-600';
}

/** Nhãn trạng thái sản phẩm tiếng Việt */
export function productStatusLabelVi(isActive: boolean | undefined): string {
  if (isActive === false) {
    return 'Đã ngưng hoạt động';
  }
  return 'Đang hoạt động';
}
