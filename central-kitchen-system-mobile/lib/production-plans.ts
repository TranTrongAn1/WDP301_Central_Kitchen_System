/**
 * Types for Production Plans API (Swagger).
 * GET /api/production-plans, GET /api/production-plans/{id}, PATCH status, POST complete-item.
 */

export type ProductionPlanStatus =
  | "Planned"
  | "In_Progress"
  | "Completed"
  | "Cancelled";

export type ProductionPlanDetailStatus =
  | "Pending"
  | "In_Progress"
  | "Completed"
  | "Cancelled";

export type ProductionPlanDetail = {
  productId: string | { _id: string; name?: string; sku?: string };
  plannedQuantity: number;
  actualQuantity?: number;
  status?: ProductionPlanDetailStatus;
};

export type ProductionPlan = {
  _id: string;
  planCode: string;
  planDate: string;
  status: ProductionPlanStatus;
  note?: string;
  details?: ProductionPlanDetail[];
  createdAt?: string;
  updatedAt?: string;
};

export type ProductionPlansResponse = {
  success: boolean;
  count?: number;
  data: ProductionPlan[];
};

export type ProductionPlanResponse = {
  success: boolean;
  data: ProductionPlan;
};
