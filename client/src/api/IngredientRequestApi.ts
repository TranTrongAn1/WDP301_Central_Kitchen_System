import apiclient from '@/api/Client';
import type {
  IngredientRequestListParams,
  IngredientRequestListResponse,
  IngredientRequestSingleResponse,
  IngredientRequestCompleteResponse,
  CreateIngredientRequestBody,
  UpdateIngredientRequestStatusBody,
  CompleteIngredientRequestBody,
} from '@/shared/types/ingredientRequest';

export const ingredientRequestApi = {
  getList: (params?: IngredientRequestListParams) =>
    apiclient.get<IngredientRequestListResponse>('/ingredient-requests', {
      params: params?.status && params.status !== 'ALL' ? { status: params.status } : undefined,
    }),

  create: (data: CreateIngredientRequestBody) =>
    apiclient.post<IngredientRequestSingleResponse>('/ingredient-requests', data),

  updateStatus: (id: string, data: UpdateIngredientRequestStatusBody) =>
    apiclient.put<IngredientRequestSingleResponse>(
      `/ingredient-requests/${id}/status`,
      data
    ),

  complete: (id: string, data: CompleteIngredientRequestBody) =>
    apiclient.put<IngredientRequestCompleteResponse>(
      `/ingredient-requests/${id}/complete`,
      data
    ),
};
