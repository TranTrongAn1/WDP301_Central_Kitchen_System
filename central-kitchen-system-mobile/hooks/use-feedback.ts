import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/hooks/use-auth";
import { feedbackApi } from "@/lib/api";
import type { CreateFeedbackPayload, Feedback, UpdateFeedbackPayload } from "@/lib/feedback";

type UseFeedbackResult = {
  feedback: Feedback | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  create: (payload: CreateFeedbackPayload) => Promise<Feedback | null>;
  update: (payload: UpdateFeedbackPayload) => Promise<Feedback | null>;
  remove: () => Promise<boolean>;
};

/** Kiểm tra user có phải người tạo feedback không */
export function isFeedbackAuthor(
  feedback: Feedback | null,
  userId: string | undefined
): boolean {
  if (!feedback?.createdBy || !userId) return false;
  const createdBy = feedback.createdBy;
  if (typeof createdBy === "object" && "_id" in createdBy) {
    return createdBy._id === userId;
  }
  return createdBy === userId;
}

/**
 * Hook lấy feedback theo orderId.
 * GET trả 404 → coi là chưa có feedback, feedback = null.
 */
export function useFeedback(orderId: string | undefined): UseFeedbackResult {
  const { token, user } = useAuth();
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!orderId || !token) {
      setFeedback(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await feedbackApi.getByOrderId(orderId, token);
      setFeedback(res.data ?? null);
    } catch (e) {
      const err = e as Error & { status?: number };
      if (err.status === 404) {
        setFeedback(null);
      } else {
        setError(err.message ?? "Không tải được đánh giá.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [orderId, token]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const create = useCallback(
    async (payload: CreateFeedbackPayload): Promise<Feedback | null> => {
      if (!orderId || !token) return null;
      const res = await feedbackApi.create(orderId, payload, token);
      const created = res.data;
      if (created) setFeedback(created);
      return created ?? null;
    },
    [orderId, token]
  );

  const update = useCallback(
    async (payload: UpdateFeedbackPayload): Promise<Feedback | null> => {
      if (!orderId || !token) return null;
      const res = await feedbackApi.update(orderId, payload, token);
      const updated = res.data;
      if (updated) setFeedback(updated);
      return updated ?? null;
    },
    [orderId, token]
  );

  const remove = useCallback(async (): Promise<boolean> => {
    if (!orderId || !token) return false;
    await feedbackApi.delete(orderId, token);
    setFeedback(null);
    return true;
  }, [orderId, token]);

  return {
    feedback,
    isLoading,
    error,
    refetch,
    create,
    update,
    remove,
  };
}
