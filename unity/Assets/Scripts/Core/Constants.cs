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
        // Campus Building Database - Rebuilt based on Diagram
        public static readonly List<BuildingData> CAMPUS_BUILDINGS = new List<BuildingData>
        {
            new BuildingData { id = "seminar", name = "Seminar Halls", position = new Vector3(0, 8, -100), size = new Vector3(30, 16, 25), color = new Color(0.58f, 0.64f, 0.72f) },
            new BuildingData { id = "admin", name = "Admin Building", position = new Vector3(70, 8, -100), size = new Vector3(60, 16, 25), color = new Color(0.97f, 0.98f, 0.99f) },
            new BuildingData { id = "cc", name = "Computer Center", position = new Vector3(-80, 8, 0), size = new Vector3(35, 16, 30), color = new Color(0.38f, 0.65f, 0.98f) },
            new BuildingData { id = "dean", name = "Dean Acadmics", position = new Vector3(0, 8, 0), size = new Vector3(35, 16, 30), color = new Color(0.58f, 0.77f, 0.99f) },
            new BuildingData { id = "academic", name = "Acadmic Bhulding", position = new Vector3(90, 8, 10), size = new Vector3(70, 16, 100), color = new Color(0.80f, 0.84f, 0.88f) },
            new BuildingData { id = "sports", name = "Sports Ground", position = new Vector3(200, 0.2f, 10), size = new Vector3(100, 0.4f, 150), color = new Color(0.02f, 0.59f, 0.41f) },
            new BuildingData { id = "csed", name = "CSED Dept", position = new Vector3(-80, 8, 100), size = new Vector3(35, 16, 35), color = new Color(0.23f, 0.51f, 0.96f) },
            new BuildingData { id = "geotech", name = "Geo Tech Labs", position = new Vector3(10, 8, 110), size = new Vector3(25, 16, 60), color = new Color(0.39f, 0.45f, 0.55f) },
            new BuildingData { id = "mp_hall", name = "MP Hall", position = new Vector3(70, 8, 200), size = new Vector3(120, 16, 60), color = new Color(0.75f, 0.52f, 0.99f) }
        };

        public const float PLAYER_SPEED = 5.0f;
        public const float ROTATION_SPEED = 100.0f;
        public const float ARRIVAL_THRESHOLD = 8.0f;
    }
}
