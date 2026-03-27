package com.mnnit.navigation

/**
 * WifiFingerprints.kt
 *
 * Predefined WiFi fingerprint database for MNNIT Allahabad campus floors.
 *
 * HOW TO CALIBRATE FOR YOUR CAMPUS:
 *  1. Walk to each floor with an Android WiFi scanner app
 *  2. Record the BSSID and RSSI of all visible APs
 *  3. Replace the placeholder entries below with your real readings
 *
 * BSSID format: "aa:bb:cc:dd:ee:ff" (lowercase, colon-separated)
 * RSSI: typical range -30 (strong) to -90 (weak)
 */
object WifiFingerprints {

    data class AccessPoint(val bssid: String, val rssi: Int)

    // ─── Fingerprint Database ────────────────────────────────────────
    // Replace with actual campus AP readings captured on each floor.

    private val database: Map<Int, List<AccessPoint>> = mapOf(
        // Floor 0 — Ground Floor (Academic Block lobby, main entrance area)
        0 to listOf(
            AccessPoint("aa:bb:cc:10:00:01", -55),
            AccessPoint("aa:bb:cc:10:00:02", -58),
            AccessPoint("aa:bb:cc:10:00:03", -70),
            AccessPoint("aa:bb:cc:10:00:04", -80)
        ),

        // Floor 1 — First Floor (Academic Block classrooms)
        1 to listOf(
            AccessPoint("aa:bb:cc:10:01:01", -52),
            AccessPoint("aa:bb:cc:10:01:02", -60),
            AccessPoint("aa:bb:cc:10:00:01", -72), // Same AP, weaker signal upstairs
            AccessPoint("aa:bb:cc:10:01:03", -65)
        ),

        // Floor 2 — Second Floor (Labs, HOD offices)
        2 to listOf(
            AccessPoint("aa:bb:cc:10:02:01", -50),
            AccessPoint("aa:bb:cc:10:02:02", -58),
            AccessPoint("aa:bb:cc:10:01:01", -75),
            AccessPoint("aa:bb:cc:10:02:03", -62)
        ),

        // Floor 3 — Third Floor (Research labs, server room)
        3 to listOf(
            AccessPoint("aa:bb:cc:10:03:01", -53),
            AccessPoint("aa:bb:cc:10:03:02", -61),
            AccessPoint("aa:bb:cc:10:02:01", -78),
            AccessPoint("aa:bb:cc:10:03:03", -68)
        )
    )

    // ─── Floor Matching ──────────────────────────────────────────────

    /**
     * Matches a live WiFi scan against the fingerprint database.
     *
     * @param currentScan Map of BSSID → RSSI from a live WifiManager scan
     * @return Pair(bestFloor, confidence) where confidence is in [0.0, 1.0]
     */
    fun matchFloor(currentScan: Map<String, Int>): Pair<Int, Double> {
        if (currentScan.isEmpty()) return Pair(0, 0.0)

        var bestFloor = 0
        var bestScore = Double.MAX_VALUE
        var secondBestScore = Double.MAX_VALUE

        for ((floor, fingerprint) in database) {
            val score = euclideanDistance(currentScan, fingerprint)
            if (score < bestScore) {
                secondBestScore = bestScore
                bestScore = score
                bestFloor = floor
            } else if (score < secondBestScore) {
                secondBestScore = score
            }
        }

        // Confidence: how much better is the best match vs second best
        // If both floors score similarly, confidence is low
        val confidence = if (secondBestScore == Double.MAX_VALUE || bestScore == 0.0) {
            1.0
        } else {
            // Ratio: 1.0 means perfect discrimination, 0.0 means no discrimination
            val ratio = bestScore / secondBestScore
            (1.0 - ratio).coerceIn(0.0, 1.0)
        }

        // Require at least 2 known APs to be visible for a valid result
        val knownApsVisible = database[bestFloor]
            ?.count { fp -> currentScan.containsKey(fp.bssid) }
            ?: 0

        val finalConfidence = if (knownApsVisible >= 2) confidence else 0.0

        return Pair(bestFloor, finalConfidence)
    }

    /**
     * Helper to check if a scanned BSSID is in our database.
     */
    fun isKnown(bssid: String): Boolean {
        return database.values.any { list -> list.any { it.bssid == bssid } }
    }

    /**
     * Euclidean distance between current scan and a fingerprint.
     * Only considers BSSID entries that appear in both the fingerprint and the scan.
     */
    private fun euclideanDistance(scan: Map<String, Int>, fingerprint: List<AccessPoint>): Double {
        var sumSq = 0.0
        var matchCount = 0

        for (ap in fingerprint) {
            val scannedRssi = scan[ap.bssid]
            if (scannedRssi != null) {
                val diff = (scannedRssi - ap.rssi).toDouble()
                sumSq += diff * diff
                matchCount++
            } else {
                // Penalize missing APs (assume very weak signal -95)
                val diff = (-95 - ap.rssi).toDouble()
                sumSq += diff * diff * 0.5 // Half penalty for absent APs
            }
        }

        return if (matchCount == 0) Double.MAX_VALUE else Math.sqrt(sumSq)
    }
}
