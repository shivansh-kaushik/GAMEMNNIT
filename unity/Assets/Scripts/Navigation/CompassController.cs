using UnityEngine;
using MNNIT.Core;

namespace MNNIT.Nav
{
    public class CompassController : MonoBehaviour
    {
        [Header("UI References")]
        [SerializeField] private RectTransform compassArrow;
        [SerializeField] private Transform playerTransform;

        private void Update()
        {
            if (GameManager.Instance.IsMissionActive && GameManager.Instance.CurrentTarget.HasValue)
            {
                UpdateCompass(GameManager.Instance.CurrentTarget.Value.position);
            }
        }

        private void UpdateCompass(Vector3 targetPos)
        {
            if (playerTransform == null || compassArrow == null) return;

            Vector3 dir = targetPos - playerTransform.position;
            
            // Calculate angle relative to player's forward direction
            float angle = Vector3.SignedAngle(playerTransform.forward, dir, Vector3.up);

            // Rotate UI arrow
            // We gently interpolate for smooth movement
            Quaternion targetRotation = Quaternion.Euler(0, 0, -angle);
            compassArrow.rotation = Quaternion.Slerp(compassArrow.rotation, targetRotation, Time.deltaTime * 5f);
        }
    }
}
