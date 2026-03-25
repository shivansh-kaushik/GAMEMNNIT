import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const qrDataPath = path.join(__dirname, '../src/data/qr_markers.json');
const outputPath = path.join(__dirname, '../printable_qrs.html');

const rawData = fs.readFileSync(qrDataPath, 'utf8');
const qrData = JSON.parse(rawData);

const css = `
    body { font-family: sans-serif; background: #fff; color: #000; padding: 20px; }
    h1 { text-align: center; }
    .intro { text-align: center; color: #666; margin-bottom: 40px; }
    .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 30px; }
    .card { border: 2px dashed #333; padding: 20px; text-align: center; page-break-inside: avoid; border-radius: 12px; }
    .qr-image { width: 220px; height: 220px; margin: 10px auto; display: block; border: 4px solid #000; padding: 8px; border-radius: 6px; }
    .markerid { font-size: 20px; font-weight: 900; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px; }
    .scan-label { font-size: 14px; font-weight: bold; background: #000; color: #fff; padding: 4px 10px; display: inline-block; border-radius: 4px; }
    .placement { font-size: 13px; margin-top: 12px; color: #555; font-style: italic; }
    .coords { font-size: 11px; margin-top: 8px; font-family: monospace; color: #888; }
    @media print { body { padding: 0; } .grid { gap: 15px; } }
`;

let cards = '';
qrData.markers.forEach(function(marker) {
    const payload = JSON.stringify({ id: marker.id, lat: marker.lat, lon: marker.lon, bearing: marker.bearing });
    const qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=' + encodeURIComponent(payload);

    cards += '<div class="card">';
    cards += '<div class="markerid">' + marker.id + '</div>';
    cards += '<div class="scan-label">📍 Scan for AR Navigation Accuracy</div>';
    cards += '<img class="qr-image" src="' + qrUrl + '" alt="QR ' + marker.id + '" />';
    cards += '<div class="placement"><strong>Paste at:</strong> ' + marker.description + '</div>';
    cards += '<div class="coords">LAT: ' + marker.lat + ' | LON: ' + marker.lon + ' | BRG: ' + marker.bearing + '°</div>';
    cards += '</div>';
});

const html = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>MNNIT AR Navigation - Printable QR Anchors</title><style>' + css + '</style></head><body>' +
    '<h1>MNNIT AR Navigation — Ground Truth QR Anchors</h1>' +
    '<p class="intro">Print on A4 paper. Cut along dashed lines. Paste at the location described under each QR code.</p>' +
    '<div class="grid">' + cards + '</div></body></html>';

fs.writeFileSync(outputPath, html);
console.log('SUCCESS: printable_qrs.html written to project root. Open in Chrome and Ctrl+P to print.');
