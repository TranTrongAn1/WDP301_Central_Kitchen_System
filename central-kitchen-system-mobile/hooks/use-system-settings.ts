import { useCallback, useEffect, useState } from "react";

import { systemSettingsApi } from "@/lib/api";
import type { SystemSetting } from "@/lib/system-settings";

export type SystemSettingsData = {
    TAX_RATE?: number;
    SHIPPING_COST_BASE?: number;
    [key: string]: any;
};

export const useSystemSettings = () => {
    const [settings, setSettings] = useState<SystemSettingsData | null>(null);
    const [rawSettings, setRawSettings] = useState<SystemSetting[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchSettings = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            // Fetch public settings without authentication
            const response = await systemSettingsApi.getAll(true, null);
            if (response?.success && response.data) {
                setRawSettings(response.data);

                // Convert to easily accessible object
                const parsedSettings: SystemSettingsData = {};
                response.data.forEach((setting) => {
                    // Try to parse numeric values
                    const numValue = parseFloat(setting.value);
                    parsedSettings[setting.key] = isNaN(numValue) ? setting.value : numValue;
                });
                setSettings(parsedSettings);
            } else {
                setSettings(null);
            }
        } catch (err) {
            setSettings(null);
            setError(err instanceof Error ? err.message : "Không thể tải cài đặt hệ thống.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    return { settings, rawSettings, isLoading, error, refetch: fetchSettings };
};
