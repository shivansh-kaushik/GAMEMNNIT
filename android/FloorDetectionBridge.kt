package com.mnnit.navigation

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.net.wifi.WifiManager
import android.os.Handler
import android.os.Looper
import android.webkit.WebView
import org.json.JSONObject
import java.util.LinkedList

/**
 * FloorDetectionBridge.kt — STABILIZED VERSION
 *
 * Hybrid vertical localization: Barometer (primary) + WiFi fingerprinting (correction).
 * Implements Hysteresis, WiFi Stability Gates, and confirmation cycles.
 */
class FloorDetectionBridge(
    private val context: Context,
    private val webView: WebView
) : SensorEventListener {

    // ─── Configuration ──────────────────────────────────────────────
    private val PRESSURE_WINDOW_SIZE    = 10       // Larger window for better smoothing
    private val FLOOR_HEIGHT_METERS     = 3.2      // Average floor height
    private val HYSTERESIS_THRESHOLD    = 2.5      // Meters required to flip floor
    private val CONFIRMATION_CYCLES     = 3        // Required consecutive readings
    private val SEA_LEVEL_PRESSURE      = 1013.25f
    private val WIFI_SCAN_INTERVAL_MS   = 3000L
    private val BRIDGE_UPDATE_MS        = 500L
    private val WIFI_CONFIDENCE_GATE    = 0.75     // Stricter gate
    private val MIN_VISIBLE_BSSIDS      = 3        // More APs for stability

    // ─── State ──────────────────────────────────────────────────────
    private val pressureWindow = LinkedList<Float>()
    private var baselineAltitude: Double = 0.0
    private var currentFloor: Int = 0
    private var floorSource: String = "unknown"
    private var floorConfidence: Double = 0.0

    // Stabilization State
    private var pendingFloor: Int = 0
    private var confirmationCount: Int = 0
    private var lastWifiFloor: Int = -1
    private var wifiStabilityCount: Int = 0

    // ─── Android APIs ────────────────────────────────────────────────
    private val sensorManager by lazy {
        context.getSystemService(Context.SENSOR_SERVICE) as SensorManager
    }
    private val wifiManager by lazy {
        context.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
    }
    private val mainHandler = Handler(Looper.getMainLooper())

    private val wifiScanRunnable = object : Runnable {
        override fun run() {
            performWifiScan()
            mainHandler.postDelayed(this, WIFI_SCAN_INTERVAL_MS)
        }
    }

    private val bridgeUpdateRunnable = object : Runnable {
        override fun run() {
            pushToWebView()
            mainHandler.postDelayed(this, BRIDGE_UPDATE_MS)
        }
    }

    fun start() {
        val pressureSensor = sensorManager.getDefaultSensor(Sensor.TYPE_PRESSURE)
        if (pressureSensor != null) {
            sensorManager.registerListener(this, pressureSensor, SensorManager.SENSOR_DELAY_NORMAL)
        }
        mainHandler.post(wifiScanRunnable)
        mainHandler.post(bridgeUpdateRunnable)
    }

    fun stop() {
        sensorManager.unregisterListener(this)
        mainHandler.removeCallbacks(wifiScanRunnable)
        mainHandler.removeCallbacks(bridgeUpdateRunnable)
    }

    /**
     * Calibration Reset — Triggered by QR scans or Building entry.
     * Re-anchors baselineAltitude to prevent barometric drift.
     */
    fun calibrate(userFloor: Int) {
        if (pressureWindow.isEmpty()) return
        val altitude = pressureToAltitude(pressureWindow.average().toFloat())
        baselineAltitude = altitude - (userFloor * FLOOR_HEIGHT_METERS)
        currentFloor = userFloor
        pendingFloor = userFloor
        confirmationCount = 0
        android.util.Log.i("FloorDetection", "RE-CALIBRATED: floor=$userFloor baseline=${baselineAltitude}m")
    }

    // ────────────────────────────────────────────────────────────────
    // Barometer — Hysteresis & Confirmation
    // ────────────────────────────────────────────────────────────────

    override fun onSensorChanged(event: SensorEvent) {
        if (event.sensor.type != Sensor.TYPE_PRESSURE) return
        val pressure = event.values[0]

        // Noise/Spike Filtering
        if (pressureWindow.size >= 2 && Math.abs(pressure - pressureWindow.average()) > 30) return

        pressureWindow.addLast(pressure)
        if (pressureWindow.size > PRESSURE_WINDOW_SIZE) pressureWindow.removeFirst()

        updateHystereticFloor()
    }

    override fun onAccuracyChanged(sensor: Sensor, accuracy: Int) {}

    private fun updateHystereticFloor() {
        if (pressureWindow.isEmpty() || (floorSource == "wifi" && floorConfidence >= WIFI_CONFIDENCE_GATE)) return

        val altitude = pressureToAltitude(pressureWindow.average().toFloat())
        val relAltitude = altitude - baselineAltitude
        
        // Target calculation based on threshold
        val targetFloor = Math.round(relAltitude / FLOOR_HEIGHT_METERS).toInt().coerceIn(0, 10)
        
        // Hysteresis: Only change if distance is significant
        val distFromCurrent = Math.abs(relAltitude - (currentFloor * FLOOR_HEIGHT_METERS))
        
        if (targetFloor != currentFloor && distFromCurrent > HYSTERESIS_THRESHOLD) {
            if (targetFloor == pendingFloor) {
                confirmationCount++
                if (confirmationCount >= CONFIRMATION_CYCLES) {
                    currentFloor = targetFloor
                    floorSource = "barometer"
                    floorConfidence = 0.6
                }
            } else {
                pendingFloor = targetFloor
                confirmationCount = 1
            }
        } else {
            confirmationCount = 0
        }
    }

    private fun pressureToAltitude(p: Float): Double = 
        44330.0 * (1.0 - Math.pow((p / SEA_LEVEL_PRESSURE).toDouble(), 1.0 / 5.255))

    // ────────────────────────────────────────────────────────────────
    // WiFi — Stability Gate
    // ────────────────────────────────────────────────────────────────

    private fun performWifiScan() {
        try {
            @Suppress("DEPRECATION")
            wifiManager.startScan()
            mainHandler.postDelayed({
                @Suppress("DEPRECATION")
                val results = wifiManager.scanResults ?: return@postDelayed
                val currentScan = results.associate { it.BSSID to it.level }

                // Match with stability requirements
                val (wifiFloor, wifiConfidence) = WifiFingerprints.matchFloor(currentScan)
                
                // Count visible known APs (from DB)
                val visibleKnown = results.count { res -> WifiFingerprints.isKnown(res.BSSID) }

                if (visibleKnown >= MIN_VISIBLE_BSSIDS && wifiConfidence >= WIFI_CONFIDENCE_GATE) {
                    if (wifiFloor == lastWifiFloor) {
                        wifiStabilityCount++
                        if (wifiStabilityCount >= 2) { // Stable for 2 scans
                            currentFloor = wifiFloor
                            floorSource = "wifi"
                            floorConfidence = wifiConfidence
                            // Also adjust barometer baseline to match WiFi's truth
                            val alt = pressureToAltitude(pressureWindow.average().toFloat())
                            baselineAltitude = alt - (currentFloor * FLOOR_HEIGHT_METERS)
                        }
                    } else {
                        lastWifiFloor = wifiFloor
                        wifiStabilityCount = 1
                    }
                } else {
                    wifiStabilityCount = 0
                    if (floorSource == "wifi") floorSource = "barometer" // Fallback
                }
            }, 1500)
        } catch (e: SecurityException) {}
    }

    private fun pushToWebView() {
        val payload = JSONObject().apply {
            put("floor", currentFloor)
            put("source", floorSource)
            put("confidence", floorConfidence)
        }
        webView.post { webView.evaluateJavascript("if(window.updateFloor){window.updateFloor($payload);}", null) }
    }
}
