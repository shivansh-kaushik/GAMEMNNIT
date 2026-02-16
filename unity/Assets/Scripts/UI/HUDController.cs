using UnityEngine;
using UnityEngine.UI;
using MNNIT.Core;
using TMPro; // Assuming TextMeshPro is used, if not we can use legacy Text

namespace MNNIT.UI
{
    public class HUDController : MonoBehaviour
    {
        [Header("UI References")]
        [SerializeField] private TextMeshProUGUI targetText;
        [SerializeField] private TextMeshProUGUI distanceText;
        [SerializeField] private TextMeshProUGUI statusText;
        [SerializeField] private Transform playerTransform;

        private void Update()
        {
            if (GameManager.Instance.IsMissionActive && GameManager.Instance.CurrentTarget.HasValue)
            {
                float dist = Vector3.Distance(playerTransform.position, GameManager.Instance.CurrentTarget.Value.position);
                distanceText.text = $"{dist:F1}m";
                targetText.text = $"TARGET: {GameManager.Instance.CurrentTarget.Value.name}";
            }
            else
            {
                distanceText.text = "--";
                targetText.text = "NO TARGET";
            }
        }
    }
}
