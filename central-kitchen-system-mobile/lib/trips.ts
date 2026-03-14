export type TripStatus = "Planning" | "In_Transit" | "Completed" | "Cancelled";

export type TripOrderRef =
    | string
    | {
        _id: string;
        orderNumber?: string;
        storeId?:
        | string
        | {
            _id: string;
            name?: string;
            storeName?: string;
            storeCode?: string;
            address?: string;
        };
        items?: {
            productId:
            | string
            | {
                _id: string;
                name?: string;
            };
            quantityRequested?: number;
            quantity?: number;
        }[];
    };

export type DeliveryTrip = {
    _id: string;
    tripCode?: string;
    tripNumber?: string;
    status: TripStatus;
    notes?: string;
    vehicleTypeId?:
    | string
    | {
        _id: string;
        name?: string;
    };
    vehicleType?:
    | string
    | {
        _id: string;
        name?: string;
    };
    orders?: TripOrderRef[];
    createdAt?: string;
    updatedAt?: string;
};

export type DeliveryTripsResponse = {
    success: boolean;
    count?: number;
    data: DeliveryTrip[];
};

export type DeliveryTripResponse = {
    success: boolean;
    data: DeliveryTrip;
};
