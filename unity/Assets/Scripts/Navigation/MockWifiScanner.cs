using UnityEngine;
using System.Collections.Generic;
using MNNIT.Core;

namespace MNNIT.Nav
{
    public class MockWifiScanner : MonoBehaviour
    {
        [System.Serializable]
        public struct AccessPoint
        {
            public string ssid;
            public Vector3 position;
            public int floor;
        }

        [SerializeField] private List<AccessPoint> accessPoints;
        [SerializeField] private Transform playerTransform;

        public event System.Action<int> OnFloorDetected; // Floor number

        private float scanTimer = 0f;
        private const float SCAN_INTERVAL = 1.0f;

        private void Start()
        {
            // Add some dummy APs if empty
            if (accessPoints == null || accessPoints.Count == 0)
            {
                accessPoints = new List<AccessPoint>
                {
                    new AccessPoint { ssid = "ADMIN_G", position = new Vector3(0, 2, -40), floor = 0 },
                    new AccessPoint { ssid = "ADMIN_F1", position = new Vector3(0, 6, -40), floor = 1 },
                    new AccessPoint { ssid = "LIB_MAIN", position = new Vector3(40, 5, 0), floor = 0 }
                };
            }
        }

        private void Update()
        {
            scanTimer += Time.deltaTime;
            if (scanTimer >= SCAN_INTERVAL)
            {
                Scan();
                scanTimer = 0f;
            }
        }

        private void Scan()
        {
            // Simple logic: Find closest AP and if RSSI > threshold, assume we are on that floor
            AccessPoint bestAP = default;
            float bestRSSI = -100f;

            foreach (var ap in accessPoints)
            {
                float dist = Vector3.Distance(playerTransform.position, ap.position);
                float rssi = -30 - (20 * Mathf.Log10(Mathf.Max(1, dist))); // Free space path loss model
                
                if (rssi > bestRSSI)
                {
                    bestRSSI = rssi;
                    bestAP = ap;
                }
            }

            if (bestRSSI > -70) // Reasonable signal strength
            {
                OnFloorDetected?.Invoke(bestAP.floor);
                // Debug.Log($"Detected Floor: {bestAP.floor} via {bestAP.ssid} ({bestRSSI:F1}dBm)");
            }
        }
    }
}
