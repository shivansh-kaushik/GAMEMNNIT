import { WiFiAP } from '../sensors/PositionFusion';
import { latLngToVoxel } from '../core/GISUtils';

// Simulated WiFi Access Points around the campus
export const CAMPUS_WIFI_APS: WiFiAP[] = [
    {
        ssid: 'MNNIT_Acad_F0_Lobby',
        txPower: -40,
        ...mapLatLngToPoint(25.494677, 81.864779) // Near Academic
    },
    {
        ssid: 'MNNIT_Admin_WiFi_1',
        txPower: -42,
        ...mapLatLngToPoint(25.494720, 81.864630) // Near Admin
    },
    {
        ssid: 'MNNIT_Library_Main',
        txPower: -45,
        ...mapLatLngToPoint(25.494542, 81.865029) // Near Library
    },
    {
        ssid: 'MNNIT_Gate_Security',
        txPower: -38,
        ...mapLatLngToPoint(25.494901, 81.864531) // Near Gate
    }
];

function mapLatLngToPoint(lat: number, lng: number) {
    const voxel = latLngToVoxel(lat, lng);
    return { x: voxel[0], z: voxel[2] };
}
