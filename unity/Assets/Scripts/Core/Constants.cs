using UnityEngine;
using System.Collections.Generic;

namespace MNNIT.Core
{
    [System.Serializable]
    public struct BuildingData
    {
        public string id;
        public string name;
        public Vector3 position;
        public Vector3 size;
        public Color color;
    }

    public static class Constants
    {
        // Campus Building Database
        // Positions are relative to the map center (0,0,0)
        public static readonly List<BuildingData> CAMPUS_BUILDINGS = new List<BuildingData>
        {
            new BuildingData { id = "admin", name = "Admin Block", position = new Vector3(0, 8, -40), size = new Vector3(24, 16, 12), color = new Color(0.97f, 0.98f, 0.99f) },
            new BuildingData { id = "cse", name = "CSE Dept", position = new Vector3(-50, 6, -10), size = new Vector3(20, 12, 25), color = new Color(0.58f, 0.77f, 0.99f) },
            new BuildingData { id = "ece", name = "ECE Dept", position = new Vector3(-50, 6, 25), size = new Vector3(20, 12, 25), color = new Color(0.8f, 0.84f, 0.88f) },
            new BuildingData { id = "library", name = "Central Library", position = new Vector3(40, 7, 0), size = new Vector3(22, 14, 22), color = new Color(0.99f, 0.65f, 0.65f) },
            new BuildingData { id = "hostel", name = "Mega Hostel", position = new Vector3(0, 10, 60), size = new Vector3(35, 20, 25), color = new Color(0.98f, 0.75f, 0.14f) },
            new BuildingData { id = "mp_hall", name = "MP Hall", position = new Vector3(50, 8, -50), size = new Vector3(25, 15, 25), color = new Color(0.75f, 0.52f, 0.99f) },
            new BuildingData { id = "canteen", name = "Canteen", position = new Vector3(-20, 3, 40), size = new Vector3(15, 6, 15), color = new Color(0.29f, 0.87f, 0.5f) }
        };

        public const float PLAYER_SPEED = 5.0f;
        public const float ROTATION_SPEED = 100.0f;
        public const float ARRIVAL_THRESHOLD = 8.0f;
    }
}
