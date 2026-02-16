using UnityEngine;
using MNNIT.Core;
using System.Collections.Generic;

namespace MNNIT.Nav
{
    public class NavigationSystem : MonoBehaviour
    {
        [Header("References")]
        [SerializeField] private Transform playerTransform;
        [SerializeField] private GameObject arrowPrefab; // Assign in Inspector
        [SerializeField] private float arrowSpacing = 2.0f;

        private List<GameObject> activeArrows = new List<GameObject>();
        private BuildingData? currentTarget;

        private void Start()
        {
            if (GameManager.Instance != null)
            {
                GameManager.Instance.OnMissionStarted += OnMissionStarted;
                GameManager.Instance.OnMissionComplete += OnMissionComplete;
            }
        }

        private void OnDestroy()
        {
            if (GameManager.Instance != null)
            {
                GameManager.Instance.OnMissionStarted -= OnMissionStarted;
                GameManager.Instance.OnMissionComplete -= OnMissionComplete;
            }
        }

        private void Update()
        {
            if (GameManager.Instance.IsMissionActive && currentTarget.HasValue)
            {
                CheckDistance();
                UpdateArrows();
            }
        }

        private void OnMissionStarted(BuildingData target)
        {
            currentTarget = target;
            ClearArrows();
            SpawnPathArrows(target.position);
        }

        private void OnMissionComplete()
        {
            ClearArrows();
            currentTarget = null;
        }

        private void CheckDistance()
        {
            float distance = Vector3.Distance(playerTransform.position, currentTarget.Value.position);
            if (distance < Constants.ARRIVAL_THRESHOLD)
            {
                GameManager.Instance.CompleteMission();
            }
        }

        private void SpawnPathArrows(Vector3 targetPos)
        {
            // Simple straight line path for now
            // In a real NavMesh scenario, we would get the corners from NavMeshPath
            
            Vector3 startPos = playerTransform.position;
            Vector3 direction = (targetPos - startPos).normalized;
            float totalDistance = Vector3.Distance(startPos, targetPos);
            
            int arrowCount = Mathf.FloorToInt(totalDistance / arrowSpacing);

            for (int i = 1; i < arrowCount; i++)
            {
                Vector3 spawnPos = startPos + (direction * (i * arrowSpacing));
                spawnPos.y = 0.5f; // Keep near ground

                GameObject arrow = Instantiate(arrowPrefab, spawnPos, Quaternion.LookRotation(direction));
                activeArrows.Add(arrow);
            }
        }

        private void UpdateArrows()
        {
            // Optional: Animate arrows or hide them as player passes
        }

        private void ClearArrows()
        {
            foreach (var arrow in activeArrows)
            {
                Destroy(arrow);
            }
            activeArrows.Clear();
        }
    }
}
