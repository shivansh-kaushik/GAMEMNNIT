/**
 * networkInfo.ts
 * Reads real network connection data from the Network Information API.
 * Falls back gracefully if the API is unavailable (Firefox, Safari).
 */

export interface NetworkInfoData {
    connectionType: string;     // 'wifi' | 'cellular' | 'ethernet' | 'unknown'
    effectiveType: string;      // '4g' | '3g' | '2g' | 'slow-2g'
    downlink: number | null;    // Mbps
    rtt: number | null;         // round-trip time in ms
    saveData: boolean;
    available: boolean;
}

export function getNetworkInfo(): NetworkInfoData {
    const conn = (navigator as any).connection
        ?? (navigator as any).mozConnection
        ?? (navigator as any).webkitConnection;

    if (!conn) {
        return {
            connectionType: 'unknown',
            effectiveType: 'unknown',
            downlink: null,
            rtt: null,
            saveData: false,
            available: false
        };
    }

    return {
        connectionType: conn.type ?? 'unknown',
        effectiveType: conn.effectiveType ?? 'unknown',
        downlink: conn.downlink ?? null,
        rtt: conn.rtt ?? null,
        saveData: conn.saveData ?? false,
        available: true
    };
}

/** Subscribe to connection changes */
export function onNetworkChange(callback: (info: NetworkInfoData) => void): () => void {
    const conn = (navigator as any).connection;
    if (!conn) return () => { };

    const handler = () => callback(getNetworkInfo());
    conn.addEventListener('change', handler);
    return () => conn.removeEventListener('change', handler);
}
