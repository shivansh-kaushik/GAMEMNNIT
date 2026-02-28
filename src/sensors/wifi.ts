export interface WiFiSignal {
    ssid: string;
    rssi: number;
    strength: 'Excellent' | 'Good' | 'Fair' | 'Poor';
    floor: 0 | 1 | 2;
}

export const getWiFiSignals = (): Promise<WiFiSignal[]> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            // Simulated data representing multiple floors
            resolve([
                { ssid: 'MNNIT_Acad_F0_Lobby', rssi: -48, strength: 'Excellent', floor: 0 },
                { ssid: 'MNNIT_Acad_F1_Lab', rssi: -58, strength: 'Excellent', floor: 1 },
                { ssid: 'MNNIT_Acad_F2_Library', rssi: -72, strength: 'Good', floor: 2 },
                { ssid: 'MNNIT_Guest_WiFi', rssi: -82, strength: 'Fair', floor: 0 },
                { ssid: 'AndroidHotspot_882', rssi: -89, strength: 'Poor', floor: 1 },
            ]);
        }, 800);
    });
};

export const predictFloor = (signals: WiFiSignal[]): 0 | 1 | 2 => {
    if (signals.length === 0) return 0;
    // Simple strongest-signal heuristic for floor prediction
    const strongest = signals.reduce((prev, current) => (prev.rssi > current.rssi) ? prev : current);
    return strongest.floor;
};

export const isMobileEnvironment = (): boolean => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};
