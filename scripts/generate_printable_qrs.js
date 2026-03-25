import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import QRCode from 'qrcode';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PAYLOAD_VERSION = 1;
const CHECKSUM_SECRET = 'MNNIT_AR_NAV_2025'; // Used for simple HMAC to detect tampered QRs

const qrDataPath = path.join(__dirname, '../src/data/qr_markers.json');
const outputPath = path.join(__dirname, '../printable_qrs.html');

const rawData = fs.readFileSync(qrDataPath, 'utf8');
const qrData = JSON.parse(rawData);

// --- HELPERS ---

/** Generate a 6-char HMAC checksum to catch corrupted/spoofed scans */
function generateChecksum(id, lat, lon, bearing) {
    const raw = `${id}|${lat}|${lon}|${bearing}|${CHECKSUM_SECRET}`;
    return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 6).toUpperCase();
}

/** Build the versioned, validated QR payload */
function buildPayload(marker) {
    const checksum = generateChecksum(marker.id, marker.lat, marker.lon, marker.bearing);
    return JSON.stringify({
        type: 'AR_NAV_QR',
        version: PAYLOAD_VERSION,
        data: {
            id: marker.id,
            lat: marker.lat,
            lon: marker.lon,
            bearing: marker.bearing
        },
        checksum: checksum
    });
}

/** Convert a bearing to a human-readable compass label */
function bearingToLabel(bearing) {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW', 'N'];
    return directions[Math.round(bearing / 45)];
}

// --- GENERATOR ---

async function generateAll() {
    console.log(`Generating ${qrData.markers.length} QR codes locally (offline)...`);

    let cards = '';
    for (const marker of qrData.markers) {
        const payload = buildPayload(marker);
        
        // qrcode.toDataURL generates base64 PNG inline – zero external requests
        const dataUrl = await QRCode.toDataURL(payload, {
            errorCorrectionLevel: 'H', // High error correction = scans even if dirty/angled
            margin: 2,
            width: 280,
            color: { dark: '#000000', light: '#FFFFFF' }
        });

        const checksum = generateChecksum(marker.id, marker.lat, marker.lon, marker.bearing);
        const compassDir = bearingToLabel(marker.bearing);
        const priorityColor = marker.priority === 'high' ? '#dc2626' : '#d97706';

        cards += '<div class="card">';
        cards += '<div class="markerid">' + marker.id + '</div>';
        cards += '<span class="priority" style="background:' + priorityColor + '">' + marker.priority.toUpperCase() + ' PRIORITY</span>';
        cards += '<div class="scan-label">📍 Scan for AR Navigation Accuracy</div>';
        cards += '<img class="qr-image" src="' + dataUrl + '" alt="QR ' + marker.id + '" />';
        // Orientation arrow — critical fix so installer faces it correctly
        cards += '<div class="orientation">↑ FACE THIS SIDE TOWARDS ' + compassDir + ' (' + marker.bearing + '°)</div>';
        cards += '<div class="placement"><strong>Paste at:</strong> ' + marker.description + '</div>';
        cards += '<div class="coords"> LAT: ' + marker.lat + ' | LON: ' + marker.lon + '</div>';
        cards += '<div class="checksum">Checksum: <code>' + checksum + '</code> &nbsp;|&nbsp; v' + PAYLOAD_VERSION + '</div>';
        cards += '</div>';
    }

    const css = `
        * { box-sizing: border-box; }
        body { font-family: Arial, sans-serif; background:#fff; color:#000; padding:15px; margin:0; }
        h1 { text-align:center; font-size:20px; margin-bottom:4px; }
        .intro { text-align:center; color:#555; font-size:12px; margin-bottom:30px; }
        .grid { display:grid; grid-template-columns:repeat(2, 1fr); gap:25px; }
        .card {
            border: 2px dashed #444; padding:15px; text-align:center;
            page-break-inside:avoid; border-radius:10px; background:#fafafa;
        }
        .markerid { font-size:17px; font-weight:900; letter-spacing:1px; text-transform:uppercase; margin-bottom:5px; }
        .priority { font-size:10px; font-weight:bold; color:#fff; padding:2px 8px; border-radius:10px; }
        .scan-label { font-size:12px; font-weight:bold; background:#000; color:#fff; padding:4px 10px; display:inline-block; border-radius:4px; margin:8px 0; }
        .qr-image { width:200px; height:200px; display:block; margin:0 auto; }
        .orientation { font-size:13px; font-weight:bold; margin:8px 0; background:#fef9c3; padding:5px 10px; border-radius:5px; border:1px solid #f59e0b; }
        .placement { font-size:12px; color:#444; font-style:italic; margin-top:8px; }
        .coords { font-size:10px; font-family:monospace; color:#888; margin-top:5px; }
        .checksum { font-size:10px; font-family:monospace; color:#aaa; margin-top:4px; }
        @media print { body{padding:0;} .grid{gap:15px;} .card{background:#fff;} }
    `;

    const html = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">' +
        '<title>MNNIT AR Navigation - Printable Ground Truth QR Anchors</title>' +
        '<style>' + css + '</style></head><body>' +
        '<h1>MNNIT AR Navigation — Ground Truth QR Anchors</h1>' +
        '<p class="intro">Print on A4 · Cut along dashed lines · Paste at location described · Arrow indicates <strong>facing direction</strong> for correct bearing calibration</p>' +
        '<div class="grid">' + cards + '</div></body></html>';

    fs.writeFileSync(outputPath, html);
    console.log('SUCCESS: printable_qrs.html generated (fully offline, ' + qrData.markers.length + ' markers)');
    console.log('OPEN IN CHROME: ' + outputPath);
}

generateAll().catch(console.error);
