/** System Settings API types and responses */

export type SystemSetting = {
    _id: string;
    key: string;
    value: string;
    description?: string;
    isPublic: boolean;
    createdAt: string;
    updatedAt: string;
};

export type SystemSettingsResponse = {
    success: boolean;
    count: number;
    data: SystemSetting[];
};

export type SystemSettingResponse = {
    success: boolean;
    data: SystemSetting;
};
