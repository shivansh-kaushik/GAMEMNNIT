using UnityEngine;
using MNNIT.Core;

namespace MNNIT.Player
{
    [RequireComponent(typeof(CharacterController))]
    public class FirstPersonController : MonoBehaviour
    {
        [Header("Movement Settings")]
        [SerializeField] private float walkSpeed = 6.0f;
        [SerializeField] private float gravity = 20.0f;

        private CharacterController controller;
        private Vector3 moveDirection = Vector3.zero;

        // Event for position updates (for UI/Minimap)
        public System.Action<Vector3> OnPositionUpdate;

        private void Start()
        {
            controller = GetComponent<CharacterController>();
        }

        private void Update()
        {
            if (controller.isGrounded)
            {
                // We are grounded, so recalculate move direction directly from axes
                moveDirection = new Vector3(Input.GetAxis("Horizontal"), 0.0f, Input.GetAxis("Vertical"));
                moveDirection = transform.TransformDirection(moveDirection);
                moveDirection *= walkSpeed;
            }

            // Apply gravity. Gravity is multiplied by deltaTime twice (once here, once below)
            // when applying the move, but here we just set the vertical velocity.
            moveDirection.y -= gravity * Time.deltaTime;

            // Move the controller
            controller.Move(moveDirection * Time.deltaTime);

            // Simple Rotation (optional, often better to separate camera look)
            // transform.Rotate(0, Input.GetAxis("Mouse X") * 2.0f, 0);

            // Broadcast position
            OnPositionUpdate?.Invoke(transform.position);
        }
    }
}
