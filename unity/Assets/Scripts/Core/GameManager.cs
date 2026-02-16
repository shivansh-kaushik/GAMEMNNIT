using UnityEngine;
using System;

namespace MNNIT.Core
{
    public class GameManager : MonoBehaviour
    {
        public static GameManager Instance { get; private set; }

        public event Action<BuildingData> OnMissionStarted;
        public event Action OnMissionComplete;

        public BuildingData? CurrentTarget { get; private set; }
        public bool IsMissionActive { get; private set; }

        private void Awake()
        {
            if (Instance == null)
            {
                Instance = this;
                DontDestroyOnLoad(gameObject);
            }
            else
            {
                Destroy(gameObject);
            }
        }

        public void StartMission(string buildingId)
        {
            var target = Constants.CAMPUS_BUILDINGS.Find(b => b.id == buildingId);
            if (!string.IsNullOrEmpty(target.id))
            {
                CurrentTarget = target;
                IsMissionActive = true;
                OnMissionStarted?.Invoke(target);
                Debug.Log($"Mission Started: Navigate to {target.name}");
            }
        }

        public void CompleteMission()
        {
            if (IsMissionActive)
            {
                IsMissionActive = false;
                OnMissionComplete?.Invoke();
                Debug.Log("Mission Complete!");
            }
        }
    }
}
