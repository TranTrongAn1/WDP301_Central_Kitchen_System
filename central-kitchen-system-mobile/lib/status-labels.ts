import type { Order } from "./orders";
import type {
    ProductionPlanDetailStatus,
    ProductionPlanStatus,
} from "./production-plans";
import type { TripStatus } from "./trips";

const ORDER_STATUS_LABELS: Record<Order["status"], string> = {
    Pending: "Chờ duyệt",
    Awaiting_Payment: "Chờ thanh toán",
    Payment_Failed: "Thanh toán lỗi",
    Approved: "Đã duyệt",
    Transferred_To_Kitchen: "Đã chuyển bếp",
    Ready_For_Shipping: "Sẵn sàng giao",
    In_Transit: "Đang giao",
    Received: "Đã nhận",
    Cancelled: "Đã hủy",
};

const PRODUCTION_PLAN_STATUS_LABELS: Record<ProductionPlanStatus, string> = {
    Planned: "Kế hoạch",
    In_Progress: "Đang làm",
    Completed: "Hoàn thành",
    Cancelled: "Đã hủy",
};

const PRODUCTION_PLAN_DETAIL_STATUS_LABELS: Record<ProductionPlanDetailStatus, string> = {
    Pending: "Chờ xử lý",
    In_Progress: "Đang làm",
    Completed: "Hoàn thành",
    Cancelled: "Đã hủy",
};

const TRIP_STATUS_LABELS: Record<TripStatus, string> = {
    Planning: "Lên kế hoạch",
    Waiting_For_Loading: "Chờ xuất phát",
    In_Transit: "Đang vận chuyển",
    Received: "Đã nhận",
    Completed: "Hoàn thành",
    Cancelled: "Đã hủy",
};

function fallbackStatusLabel(status: string): string {
    return status.replaceAll("_", " ");
}

export function getOrderStatusLabel(status?: Order["status"] | string | null): string {
    if (!status) return "—";
    return ORDER_STATUS_LABELS[status as Order["status"]] ?? fallbackStatusLabel(status);
}

export function getProductionPlanStatusLabel(
    status?: ProductionPlanStatus | string | null,
): string {
    if (!status) return "—";
    return (
        PRODUCTION_PLAN_STATUS_LABELS[status as ProductionPlanStatus] ??
        fallbackStatusLabel(status)
    );
}

export function getProductionPlanDetailStatusLabel(
    status?: ProductionPlanDetailStatus | string | null,
): string {
    if (!status) return "—";
    return (
        PRODUCTION_PLAN_DETAIL_STATUS_LABELS[status as ProductionPlanDetailStatus] ??
        fallbackStatusLabel(status)
    );
}

export function getTripStatusLabel(status?: TripStatus | string | null): string {
    if (!status) return "—";
    return TRIP_STATUS_LABELS[status as TripStatus] ?? fallbackStatusLabel(status);
}
