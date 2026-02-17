using UnityEngine;
using MNNIT.Core;

namespace MNNIT.Player
{
    [RequireComponent(typeof(CharacterController))]
    public class FirstPersonController : MonoBehaviour
    {
        [Header("Movement Settings")]
        [SerializeField] private float walkSpeed = 6.0f;
        [SerializeField] private float runSpeed = 12.0f;
        [SerializeField] private float gravity = 20.0f;
        [SerializeField] private float jumpSpeed = 8.0f;
        [SerializeField] private float lookSpeed = 2.0f;
        [SerializeField] private float lookXLimit = 85.0f;

        [Header("Fly Mode")]
        [SerializeField] private bool enableFlyMode = false;
        [SerializeField] private float flySpeedMultiplier = 1.5f;


        private CharacterController controller;
        private Vector3 moveDirection = Vector3.zero;
        private float rotationX = 0;
        private Camera playerCamera;

        [HideInInspector] public bool canMove = true;

        // Mobile Inputs
        public Vector2 MobileMove { get; set; }
        public Vector2 MobileLook { get; set; }
        public float MobileUp { get; set; } // +1 for Up, -1 for Down

        // Event for position updates (for UI/Minimap)
        public System.Action<Vector3> OnPositionUpdate;

        private void Start()
        {
            controller = GetComponent<CharacterController>();
            playerCamera = GetComponentInChildren<Camera>();
            if (playerCamera == null) playerCamera = Camera.main;

            // Automatic Mobile UI setup
            if (GetComponent<MNNIT.UI.MobileInputUI>() == null)
            {
                gameObject.AddComponent<MNNIT.UI.MobileInputUI>();
            }

            // Lock cursor
            if (!Application.isMobilePlatform)
            {
                Cursor.lockState = CursorLockMode.Locked;
                Cursor.visible = false;
            }
        }

        private void Update()
        {
            HandleLook();
            HandleMovement();
            
            // Broadcast position
            OnPositionUpdate?.Invoke(transform.position);

            // Toggle Fly Mode for debugging/exploration
            if (Input.GetKeyDown(KeyCode.F))
            {
                enableFlyMode = !enableFlyMode;
                moveDirection = Vector3.zero; // Reset momentum
            }
        }

        private void HandleLook()
        {
            if (!canMove || playerCamera == null) return;

            // Mouse + Mobile Input
            float mouseX = Input.GetAxis("Mouse X") + MobileLook.x;
            float mouseY = Input.GetAxis("Mouse Y") + MobileLook.y;

            rotationX += -mouseY * lookSpeed;
            rotationX = Mathf.Clamp(rotationX, -lookXLimit, lookXLimit);

            playerCamera.transform.localRotation = Quaternion.Euler(rotationX, 0, 0);
            transform.rotation *= Quaternion.Euler(0, mouseX * lookSpeed, 0);
        }

        private void HandleMovement()
        {
            if (!canMove) return;

            Vector3 forward = transform.TransformDirection(Vector3.forward);
            Vector3 right = transform.TransformDirection(Vector3.right);

            bool isRunning = Input.GetKey(KeyCode.LeftShift);
            float curSpeedX = (isRunning ? runSpeed : walkSpeed) * (Input.GetAxis("Vertical") + MobileMove.y);
            float curSpeedY = (isRunning ? runSpeed : walkSpeed) * (Input.GetAxis("Horizontal") + MobileMove.x);

            if (enableFlyMode)
            {
                // Fly Mode: Full 3D movement including Up/Down
                Vector3 move = (forward * curSpeedX) + (right * curSpeedY);
                
                // Vertical Movement
                float upInput = 0;
                if (Input.GetKey(KeyCode.Space)) upInput = 1;
                if (Input.GetKey(KeyCode.LeftControl) || Input.GetKey(KeyCode.C)) upInput = -1;
                upInput += MobileUp;

                move.y = upInput * (isRunning ? runSpeed : walkSpeed) * flySpeedMultiplier;

                controller.Move(move * Time.deltaTime);
            }
            else
            {
                // Classic FPS Walking with Gravity
                float movementDirectionY = moveDirection.y;
                Vector3 moveHorizontal = (forward * curSpeedX) + (right * curSpeedY);
                
                // Keep X/Z but preserve Y from gravity calculations
                moveDirection = moveHorizontal;
                moveDirection.y = movementDirectionY;

                if (controller.isGrounded)
                {
                    moveDirection.y = 0; // Reset vertical speed when grounded
                    if (Input.GetButton("Jump") || MobileUp > 0.5f)
                    {
                        moveDirection.y = jumpSpeed;
                    }
                }

                // Apply gravity
                moveDirection.y -= gravity * Time.deltaTime;

                controller.Move(moveDirection * Time.deltaTime);
            }
        }
    }
}
