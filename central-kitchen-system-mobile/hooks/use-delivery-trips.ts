import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/hooks/use-auth";
import { deliveryTripsApi } from "@/lib/api";
import type { DeliveryTrip } from "@/lib/trips";

type Params = { status?: string };

export function useDeliveryTrips(params?: Params) {
    const { token } = useAuth();
    const status = params?.status;
    const [trips, setTrips] = useState<DeliveryTrip[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchTrips = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await deliveryTripsApi.getAll({ status }, token);
            const raw = (res as { data?: unknown })?.data;
            if (Array.isArray(raw)) {
                setTrips(raw as DeliveryTrip[]);
            } else {
                // Defensive fallback for inconsistent backend payloads.
                setTrips([]);
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : "Không tải được kế hoạch vận chuyển.");
            setTrips([]);
        } finally {
            setIsLoading(false);
        }
    }, [token, status]);

    useEffect(() => {
        fetchTrips();
    }, [fetchTrips]);

    return { trips, isLoading, error, refetch: fetchTrips };
}
