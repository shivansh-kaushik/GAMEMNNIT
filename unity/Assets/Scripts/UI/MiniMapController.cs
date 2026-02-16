using UnityEngine;
using UnityEngine.UI;
using MNNIT.Core;
using System.Collections.Generic;

namespace MNNIT.UI
{
    public class MiniMapController : MonoBehaviour
    {
        [Header("Settings")]
        [SerializeField] private float mapScale = 2.0f; // Scale factor for UI position
        [SerializeField] private Vector2 mapCenterOffset = Vector2.zero;

        [Header("References")]
        [SerializeField] private RectTransform playerIcon;
        [SerializeField] private Transform playerTransform;
        [SerializeField] private RectTransform mapContainer;
        [SerializeField] private GameObject buildingIconPrefab; // Assign a small UI Image prefab

        private List<GameObject> buildingIcons = new List<GameObject>();

        private void Start()
        {
            SpawnBuildingIcons();
        }

        private void Update()
        {
            UpdatePlayerIcon();
        }

        private void SpawnBuildingIcons()
        {
            if (buildingIconPrefab == null) return;

            foreach (var b in Constants.CAMPUS_BUILDINGS)
            {
                GameObject icon = Instantiate(buildingIconPrefab, mapContainer);
                RectTransform rect = icon.GetComponent<RectTransform>();
                
                // Convert 3D world pos (X, Z) to 2D UI pos (X, Y)
                // Note: mapScale depends on your UI size vs World size ratio
                Vector2 uiPos = new Vector2(b.position.x, b.position.z) * mapScale;
                rect.anchoredPosition = uiPos + mapCenterOffset;

                // Colorize active target?
                // For now just white squares
            }
        }

        private void UpdatePlayerIcon()
        {
            if (playerTransform == null) return;

            Vector2 uiPos = new Vector2(playerTransform.position.x, playerTransform.position.z) * mapScale;
            playerIcon.anchoredPosition = uiPos + mapCenterOffset;
            
            // Optional: Rotate player icon with player
            playerIcon.localEulerAngles = new Vector3(0, 0, -playerTransform.eulerAngles.y);
        }
    }
}
