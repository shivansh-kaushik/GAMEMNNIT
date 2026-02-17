using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;
using MNNIT.Player;

namespace MNNIT.UI
{
    public class MobileInputUI : MonoBehaviour
    {
        [Header("Settings")]
        [SerializeField] private bool forceEnable = false;
        [SerializeField] private float joystickSize = 100f;
        [SerializeField] private float lookSensitivity = 1.0f;

        private FirstPersonController playerController;
        private Vector2 moveTouchStart;
        private Vector2 moveInput;
        private Vector2 lookInput;
        private int moveFingerId = -1;
        private int lookFingerId = -1;

        // Visuals
        private GameObject canvasObj;
        private Image moveJoystickBase;
        private Image moveJoystickKnob;
        private Button jumpButton;
        private Button downButton;

        private void Start()
        {
            playerController = FindObjectOfType<FirstPersonController>();

            // Only enable on Mobile or if forced
            if (!Application.isMobilePlatform && !forceEnable)
            {
                enabled = false;
                return;
            }

            SetupUI();
        }

        private void SetupUI()
        {
            // Create Canvas
            canvasObj = new GameObject("MobileControlsCanvas");
            Canvas canvas = canvasObj.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvasObj.AddComponent<CanvasScaler>();
            canvasObj.AddComponent<GraphicRaycaster>();

            // 1. Move Joystick Base (Left)
            GameObject baseObj = new GameObject("JoystickBase");
            baseObj.transform.SetParent(canvasObj.transform);
            moveJoystickBase = baseObj.AddComponent<Image>();
            moveJoystickBase.color = new Color(1, 1, 1, 0.3f);
            RectTransform baseRect = moveJoystickBase.rectTransform;
            baseRect.anchorMin = new Vector2(0, 0);
            baseRect.anchorMax = new Vector2(0, 0);
            baseRect.pivot = new Vector2(0, 0);
            baseRect.anchoredPosition = new Vector2(50, 50);
            baseRect.sizeDelta = new Vector2(joystickSize * 2, joystickSize * 2);

            // 2. Move Joystick Knob
            GameObject knobObj = new GameObject("JoystickKnob");
            knobObj.transform.SetParent(baseObj.transform);
            moveJoystickKnob = knobObj.AddComponent<Image>();
            moveJoystickKnob.color = new Color(1, 1, 1, 0.8f);
            RectTransform knobRect = moveJoystickKnob.rectTransform;
            knobRect.anchorMin = new Vector2(0.5f, 0.5f);
            knobRect.anchorMax = new Vector2(0.5f, 0.5f);
            knobRect.anchoredPosition = Vector2.zero;
            knobRect.sizeDelta = new Vector2(joystickSize, joystickSize);

            // 3. Jump Button (Right Bottom)
            GameObject jumpObj = new GameObject("JumpButton");
            jumpObj.transform.SetParent(canvasObj.transform);
            Image jumpImg = jumpObj.AddComponent<Image>();
            jumpImg.color = new Color(0, 1, 0, 0.5f);
            jumpButton = jumpObj.AddComponent<Button>();
            RectTransform jumpRect = jumpImg.rectTransform;
            jumpRect.anchorMin = new Vector2(1, 0);
            jumpRect.anchorMax = new Vector2(1, 0);
            jumpRect.pivot = new Vector2(1, 0);
            jumpRect.anchoredPosition = new Vector2(-50, 50);
            jumpRect.sizeDelta = new Vector2(100, 100);

            // EventTrigger for Jump
            EventTrigger jumpTrigger = jumpObj.AddComponent<EventTrigger>();
            AddEventTrigger(jumpTrigger, EventTriggerType.PointerDown, (data) => { if(playerController) playerController.MobileUp = 1; });
            AddEventTrigger(jumpTrigger, EventTriggerType.PointerUp, (data) => { if(playerController) playerController.MobileUp = 0; });
            
            // Add label "UP"
            CreateTextLiteral("UP", jumpObj.transform);

            // 4. Down Button (Right Bottom - Offset)
            GameObject downObj = new GameObject("DownButton");
            downObj.transform.SetParent(canvasObj.transform);
            Image downImg = downObj.AddComponent<Image>();
            downImg.color = new Color(1, 0, 0, 0.5f);
            downButton = downObj.AddComponent<Button>();
            RectTransform downRect = downImg.rectTransform;
            downRect.anchorMin = new Vector2(1, 0);
            downRect.anchorMax = new Vector2(1, 0);
            downRect.pivot = new Vector2(1, 0);
            downRect.anchoredPosition = new Vector2(-180, 50); // Left of Jump
            downRect.sizeDelta = new Vector2(100, 100);

            EventTrigger downTrigger = downObj.AddComponent<EventTrigger>();
            AddEventTrigger(downTrigger, EventTriggerType.PointerDown, (data) => { if(playerController) playerController.MobileUp = -1; });
            AddEventTrigger(downTrigger, EventTriggerType.PointerUp, (data) => { if(playerController) playerController.MobileUp = 0; });
            
            CreateTextLiteral("DWN", downObj.transform);
        }

        private void CreateTextLiteral(string text, Transform parent)
        {
            GameObject txtObj = new GameObject("Text");
            txtObj.transform.SetParent(parent);
            Text txt = txtObj.AddComponent<Text>();
            txt.text = text;
            txt.font = Resources.GetBuiltinResource<Font>("Arial.ttf");
            txt.alignment = TextAnchor.MiddleCenter;
            txt.color = Color.black;
            txt.resizeTextForBestFit = true;
            RectTransform rt = txt.rectTransform;
            rt.anchorMin = Vector2.zero;
            rt.anchorMax = Vector2.one;
            rt.offsetMin = Vector2.zero;
            rt.offsetMax = Vector2.zero;
        }

        private void AddEventTrigger(EventTrigger trigger, EventTriggerType eventType, UnityEngine.Events.UnityAction<BaseEventData> action)
        {
            EventTrigger.Entry entry = new EventTrigger.Entry();
            entry.eventID = eventType;
            entry.callback.AddListener(action);
            trigger.triggers.Add(entry);
        }

        private void Update()
        {
            if (!playerController) return;

            // Reset inputs
            moveInput = Vector2.zero;
            lookInput = Vector2.zero;

            // Mouse simulation for Editor
            if (!Application.isMobilePlatform && forceEnable)
            {
                HandleMouseSimulation();
                return;
            }

            // Handle Touches
            HandleTouchInput();
        }

        private void HandleMouseSimulation()
        {
            // Left Click = Move Joystick
            if (Input.GetMouseButtonDown(0))
            {
                Vector2 pos = Input.mousePosition;
                if (pos.x < Screen.width / 2)
                {
                    OnMoveStart(pos);
                }
                else
                {
                    // Right side click could be look start, but look is usually "always on" or drag
                    // Let's treat Right Side Drag as Look
                }
            }
            else if (Input.GetMouseButton(0))
            {
                // If dragging move joystick
                if (moveJoyActive)
                {
                    OnMoveDrag(Input.mousePosition);
                }
                 // If on right side, Look
                else if (Input.mousePosition.x > Screen.width / 2)
                {
                    // Simple delta look
                   lookInput = new Vector2(Input.GetAxis("Mouse X"), Input.GetAxis("Mouse Y")) * lookSensitivity * 2;
                }
            }
            else if (Input.GetMouseButtonUp(0))
            {
                OnMoveEnd();
            }

            // Feed to Controller
            playerController.MobileMove = moveInput;
            playerController.MobileLook = lookInput;
        }

        private bool moveJoyActive = false;

        private void OnMoveStart(Vector2 pos)
        {
            moveJoyActive = true;
            moveTouchStart = pos;
            if (moveJoystickBase)
            {
                moveJoystickBase.transform.position = pos;
                moveJoystickBase.gameObject.SetActive(true);
            }
        }

        private void OnMoveDrag(Vector2 pos)
        {
            Vector2 offset = pos - moveTouchStart;
            Vector2 direction = Vector2.ClampMagnitude(offset, joystickSize);
            moveInput = direction / joystickSize;

            if (moveJoystickKnob)
                moveJoystickKnob.transform.position = moveTouchStart + direction;
        }

        private void OnMoveEnd()
        {
            moveJoyActive = false;
            moveInput = Vector2.zero;
            if (moveJoystickKnob) moveJoystickKnob.rectTransform.anchoredPosition = Vector2.zero;
             // Keep base visible or return to default?
             // moveJoystickBase.gameObject.SetActive(false); 
        }

        private void HandleTouchInput()
        {
            foreach (Touch t in Input.touches)
            {
                if (EventSystem.current.IsPointerOverGameObject(t.fingerId)) continue;

                if (t.phase == TouchPhase.Began)
                {
                    if (t.position.x < Screen.width / 2)
                    {
                        moveFingerId = t.fingerId;
                        OnMoveStart(t.position);
                    }
                    else
                    {
                        lookFingerId = t.fingerId;
                    }
                }
                else if (t.phase == TouchPhase.Moved || t.phase == TouchPhase.Stationary)
                {
                    if (t.fingerId == moveFingerId)
                    {
                        OnMoveDrag(t.position);
                    }
                    else if (t.fingerId == lookFingerId)
                    {
                        lookInput += t.deltaPosition * lookSensitivity * 0.1f;
                    }
                }
                else if (t.phase == TouchPhase.Ended || t.phase == TouchPhase.Canceled)
                {
                    if (t.fingerId == moveFingerId)
                    {
                        moveFingerId = -1;
                        OnMoveEnd();
                    }
                    else if (t.fingerId == lookFingerId)
                    {
                        lookFingerId = -1;
                    }
                }
            }
            
            playerController.MobileMove = moveInput;
            playerController.MobileLook = lookInput;
        }
    }
}
