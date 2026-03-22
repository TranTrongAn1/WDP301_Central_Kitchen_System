export type DataDomain = "orders" | "wallet" | "kitchen" | "all";

type InvalidateListener = (changedDomains: Set<DataDomain>) => void;

const listeners = new Set<InvalidateListener>();

export function invalidateData(...domains: DataDomain[]) {
    const next = new Set<DataDomain>(domains.length > 0 ? domains : ["all"]);
    listeners.forEach((listener) => listener(next));
}

export function subscribeInvalidation(
    domains: DataDomain[],
    callback: () => void,
) {
    const domainSet = new Set<DataDomain>(domains);

    const listener: InvalidateListener = (changedDomains) => {
        if (changedDomains.has("all")) {
            callback();
            return;
        }

        for (const domain of domainSet) {
            if (changedDomains.has(domain)) {
                callback();
                return;
            }
        }
    };

    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}
