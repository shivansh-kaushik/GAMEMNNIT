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
 * FloorDetectionBridge.kt
 *
 * Hybrid vertical localization: Barometer (primary) + WiFi fingerprinting (correction).
 * Sends floor data to the WebView via window.updateFloor() every ~500ms.
 *
 * USAGE (in your Activity or Fragment):
 *
 *   private lateinit var floorBridge: FloorDetectionBridge
 *
 *   override fun onCreate(...) {
 *       ...
 *       floorBridge = FloorDetectionBridge(this, webView)
 *       floorBridge.start()
 *   }
 *
 *   override fun onDestroy() {
 *       floorBridge.stop()
 *       super.onDestroy()
 *   }
 */
class FloorDetectionBridge(
    private val context: Context,
    private val webView: WebView
) : SensorEventListener {

    // ─── Configuration ──────────────────────────────────────────────
    private val PRESSURE_WINDOW_SIZE    = 7        // Moving average window
    private val FLOOR_HEIGHT_METERS     = 3.2      // Average floor height
    private val SEA_LEVEL_PRESSURE      = 1013.25f // hPa reference
    private val WIFI_SCAN_INTERVAL_MS   = 3000L    // Scan every 3 seconds
    private val BRIDGE_UPDATE_MS        = 500L     // Push to WebView every 500ms
    private val WIFI_CONFIDENCE_GATE    = 0.70     // Min confidence to use WiFi

    // ─── State ──────────────────────────────────────────────────────
    private val pressureWindow = LinkedList<Float>()
    private var baselineAltitude: Double = 0.0
    private var currentFloor: Int = 0
    private var floorSource: String = "unknown"
    private var floorConfidence: Double = 0.0

    // ─── Android APIs ────────────────────────────────────────────────
    private val sensorManager by lazy {
        context.getSystemService(Context.SENSOR_SERVICE) as SensorManager
    }
    private val wifiManager by lazy {
        context.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
    }
    private val mainHandler = Handler(Looper.getMainLooper())

    // ─── Runnables ───────────────────────────────────────────────────
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

    // ────────────────────────────────────────────────────────────────
    // Public API
    // ────────────────────────────────────────────────────────────────

    /** Start listening to sensors. Call from Activity.onResume() or onCreate(). */
    fun start() {
        val pressureSensor = sensorManager.getDefaultSensor(Sensor.TYPE_PRESSURE)
        if (pressureSensor != null) {
            sensorManager.registerListener(this, pressureSensor, SensorManager.SENSOR_DELAY_NORMAL)
        } else {
            android.util.Log.w("FloorDetection", "No barometric pressure sensor found.")
            floorSource = "wifi" // Prefer WiFi if no barometer
        }

        mainHandler.post(wifiScanRunnable)
        mainHandler.post(bridgeUpdateRunnable)
    }

    /** Stop all sensors and timers. Call from Activity.onDestroy() or onPause(). */
    fun stop() {
        sensorManager.unregisterListener(this)
        mainHandler.removeCallbacks(wifiScanRunnable)
        mainHandler.removeCallbacks(bridgeUpdateRunnable)
    }

    /**
     * Calibrate the baseline altitude to a user-selected floor.
     * Call this after the user picks their current floor in the web UI.
     * @param userFloor Floor number (0 = Ground, 1 = First, etc.)
     */
    fun calibrate(userFloor: Int) {
        val avgPressure = if (pressureWindow.isNotEmpty())
            pressureWindow.average().toFloat()
            else SEA_LEVEL_PRESSURE

        val rawAltitude = pressureToAltitude(avgPressure)
        baselineAltitude = rawAltitude - (userFloor * FLOOR_HEIGHT_METERS)
        currentFloor = userFloor
        android.util.Log.i("FloorDetection", "Calibrated: baseline=${baselineAltitude}m floor=$userFloor")
    }

    // ────────────────────────────────────────────────────────────────
    // Barometer — SensorEventListener
    // ────────────────────────────────────────────────────────────────

    override fun onSensorChanged(event: SensorEvent) {
        if (event.sensor.type != Sensor.TYPE_PRESSURE) return

        val pressure = event.values[0]

        // Spike rejection: ignore values > 50 hPa away from current average
        if (pressureWindow.size >= 2) {
            val currentAvg = pressureWindow.average()
            if (Math.abs(pressure - currentAvg) > 50) return
        }

        // Maintain sliding window
        pressureWindow.addLast(pressure)
        if (pressureWindow.size > PRESSURE_WINDOW_SIZE) pressureWindow.removeFirst()

        // Only update barometer floor estimate if WiFi is not dominant
        if (floorSource != "wifi" || floorConfidence < WIFI_CONFIDENCE_GATE) {
            updateBarometerFloor()
        }
    }

    override fun onAccuracyChanged(sensor: Sensor, accuracy: Int) {}

    private fun updateBarometerFloor() {
        if (pressureWindow.isEmpty()) return

        val avgPressure = pressureWindow.average().toFloat()
        val altitude    = pressureToAltitude(avgPressure)
        val relAltitude = altitude - baselineAltitude
        val baroFloor   = Math.round(relAltitude / FLOOR_HEIGHT_METERS).toInt()

        // Clamp to sane range [0, 10]
        currentFloor   = baroFloor.coerceIn(0, 10)
        floorSource    = "barometer"
        floorConfidence = 0.6 // Barometer medium confidence
    }

    private fun pressureToAltitude(pressure: Float): Double {
        return 44330.0 * (1.0 - Math.pow((pressure / SEA_LEVEL_PRESSURE).toDouble(), 1.0 / 5.255))
    }

    // ────────────────────────────────────────────────────────────────
    // WiFi Fingerprinting
    // ────────────────────────────────────────────────────────────────

    private fun performWifiScan() {
        try {
            @Suppress("DEPRECATION")
            val success = wifiManager.startScan()
            if (!success) return

            // Small delay to let scan complete
            mainHandler.postDelayed({
                @Suppress("DEPRECATION")
                val results = wifiManager.scanResults
                if (results.isNullOrEmpty()) return@postDelayed

                // Build current scan map: BSSID → RSSI
                val currentScan = results.associate { it.BSSID to it.level }

                // Match against fingerprint database
                val (wifiFloor, wifiConfidence) = WifiFingerprints.matchFloor(currentScan)

                // Fusion: WiFi wins if confidence is high enough
                if (wifiConfidence >= WIFI_CONFIDENCE_GATE) {
                    currentFloor    = wifiFloor
                    floorSource     = "wifi"
                    floorConfidence = wifiConfidence
                }
                // Else keep the barometer estimate

            }, 1500)
        } catch (e: SecurityException) {
            android.util.Log.w("FloorDetection", "WiFi scan denied — missing location permission.")
        }
    }

    // ────────────────────────────────────────────────────────────────
    // WebView Bridge
    // ────────────────────────────────────────────────────────────────

    private fun pushToWebView() {
        val payload = JSONObject().apply {
            put("floor",      currentFloor)
            put("source",     floorSource)
            put("confidence", floorConfidence)
        }

        val js = "if(window.updateFloor){window.updateFloor(${payload});}"

        webView.post {
            webView.evaluateJavascript(js, null)
        }
    }
}
