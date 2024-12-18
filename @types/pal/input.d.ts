declare module 'pal/input' {
    type InputSourceButton = import('pal/input/input-source').InputSourceButton;
    type InputSourceStick = import('pal/input/input-source').InputSourceStick;
    type InputSourceDpad = import('pal/input/input-source').InputSourceDpad;
    type InputSourcePosition = import('pal/input/input-source').InputSourcePosition;
    type InputSourceOrientation = import('pal/input/input-source').InputSourceOrientation;

    type TouchCallback = (res: import('cocos/input/types').EventTouch) => void;
    /**
     * Class designed for touch input.
     */
    export class TouchInputSource {
        /**
         * Register the touch event callback.
         */
        public on (eventType: import('cocos/input/types/event-enum').InputEventType, callback: TouchCallback, target?: any);
        public dispatchEventsInCache (): void;
    }

    type MouseCallback = (res: import('cocos/input/types').EventMouse) => void;
    /**
     * Class designed for mouse input.
     */
    export class MouseInputSource {
        /**
         * Register the mouse event callback.
         */
        public on (eventType: import('cocos/input/types/event-enum').InputEventType, callback: MouseCallback, target?: any);

        public dispatchMouseDownEvent? (nativeMouseEvent: any);
        public dispatchMouseMoveEvent? (nativeMouseEvent: any);
        public dispatchMouseUpEvent? (nativeMouseEvent: any);
        public dispatchScrollEvent? (nativeMouseEvent: any);

        public dispatchEventsInCache (): void
    }

    type KeyboardCallback = (res: import('cocos/input/types').EventKeyboard) => void;
    /**
     * Class Designed for keyboard input.
     */
    export class KeyboardInputSource {
        /**
         * Register the keyboard event callback.
         */
        public on (eventType: import('cocos/input/types/event-enum').InputEventType, callback: KeyboardCallback, target?: any);

        public dispatchKeyboardDownEvent? (nativeKeyboardEvent: any);
        public dispatchKeyboardUpEvent? (nativeKeyboardEvent: any);
    }

    type GamepadCallback = (res: import('cocos/input/types/event').EventGamepad) => void;

    /**
     * Class designed for gamepad input
     */
    export class GamepadInputDevice {
        private constructor(deviceId: number);
        /**
         * @engineInternal
         */
        public static _init (): void;
        /**
         * @engineInternal
         */
        public static _on (eventType: import('cocos/input/types/event-enum').InputEventType, cb: GamepadCallback, target?: any): void;

        public static all: GamepadInputDevice[];
        public static xr: (GamepadInputDevice | null);
        /**
         * @en The gamepad device id
         * @zh 手柄设备 id
         */
        public get deviceId (): number;
        /**
         * @en whether the gamepad is connected
         * @zh 手柄是否处于连接状态
         */
        public get connected (): boolean;
        /**
         * @en  The control button in the north direction which is generally the button Y
         * @zh 处于北向的控制按键，一般是按键 Y
         */
        public get buttonNorth (): InputSourceButton;
        /**
         * @en  The control button in the east direction which is generally the button B
         * @zh 处于东向的控制按键，一般是按键 B
         */
        public get buttonEast (): InputSourceButton;
        /**
         * @en  The control button in the west direction which is generally the button X
         * @zh 处于西向的控制按键，一般是按键 X
         */
        public get buttonWest (): InputSourceButton;
        /**
         * @en  The control button in the south direction which is generally the button A
         * @zh 处于南向的控制按键，一般是按键 A
         */
        public get buttonSouth (): InputSourceButton;

        /**
         * @en The button L1
         * @zh 按键 L1
         */
        public get buttonL1 (): InputSourceButton;
        /**
         * @en The button L2
         * @zh 按键 L2
         */
        public get buttonL2 (): InputSourceButton;
        /**
         * @en The button L3
         * @zh 按键 L3
         */
        public get buttonL3 (): InputSourceButton;
        /**
         * @en The button R1
         * @zh 按键 R1
         */
        public get buttonR1 (): InputSourceButton;
        /**
         * @en The button R2
         * @zh 按键 R2
         */
        public get buttonR2 (): InputSourceButton;
        /**
         * @en The button R3
         * @zh 按键 R3
         */
        public get buttonR3 (): InputSourceButton;

        // public get buttonTouchPad (): InputSourceButton;
        // public get buttonHome (): InputSourceButton;

        /**
         * @en The button Share
         * @zh 分享按键
         */
        public get buttonShare (): InputSourceButton;
        /**
         * @en The button Options
         * @zh 选项按键
         */
        public get buttonOptions (): InputSourceButton;

        /**
         * @en The dpad buttons
         * @zh 方向按键
         */
        public get dpad (): InputSourceDpad;
        /**
         * @en The left stick
         * @zh 左摇杆
         */
        public get leftStick (): InputSourceStick;
        /**
         * @en The right stick
         * @zh 右摇杆
         */
        public get rightStick (): InputSourceStick;

        /**
         * @en The button Start
         * @zh 开始按键
         */
        public get buttonStart (): InputSourceButton;

        /**
         * @en The grab Left Grip
         * @zh 左手柄握住
         */
        public get gripLeft (): InputSourceButton;
        /**
         * @en The grab Right Grip
         * @zh 右手柄握住
         */
        public get gripRight (): InputSourceButton;

        /**
         * @en The position Left hand
         * @zh 左手位置
         */
        public get handLeftPosition (): InputSourcePosition;
        /**
         * @en The orientation Left hand
         * @zh 左手方向
         */
        public get handLeftOrientation (): InputSourceOrientation;
        /**
         * @en The position Right hand
         * @zh 右手位置
         */
        public get handRightPosition (): InputSourcePosition;
        /**
         * @en The orientation Right hand
         * @zh 右手方向
         */
        public get handRightOrientation (): InputSourceOrientation;

        /**
         * @en The position Left aim
         * @zh 左射线位置
         */
        public get aimLeftPosition (): InputSourcePosition;
        /**
         * @en The orientation Left aim
         * @zh 左射线方向
         */
        public get aimLeftOrientation (): InputSourceOrientation;
        /**
         * @en The position Right aim
         * @zh 右射线位置
         */
        public get aimRightPosition (): InputSourcePosition;
        /**
         * @en The orientation Right aim
         * @zh 右射线方向
         */
        public get aimRightOrientation (): InputSourceOrientation;
    }

    type AccelerometerCallback = (res: import('cocos/input/types').EventAcceleration) => void;
    /**
     * Class designed for accelerometer input
     */
    export class AccelerometerInputSource {
        /**
         * Asynchronously start the accelerometer.
         * TODO: return a promise.
         */
        public start (): void;
        /**
         * Stop the accelerometer.
         * TODO: return a promise.
         */
        public stop (): void;
        /**
         * Set interval of the accelerometer callback.
         * The interval is in mile seconds.
         * @param intervalInMileSeconds interval in mile seconds.
         */
        public setInterval (intervalInMileSeconds: number): void;
        /**
         * Register the acceleration event callback.
         */
        public on (eventType: import('cocos/input/types/event-enum').InputEventType, callback: AccelerometerCallback, target?: any): void;
    }

    type HandleCallback = (res: import('cocos/input/types').EventHandle) => void;
    /**
     * Class designed for handle input.
     */
    export class HandleInputDevice {
        /**
         * Register the handle event callback.
         * @engineInternal
         */
        public _on (eventType: import('cocos/input/types/event-enum').InputEventType, callback: HandleCallback, target?: any);

        /**
         * @en  The control button in the north direction which is generally the button Y
         * @zh 处于北向的控制按键，一般是按键 Y
         */
        public get buttonNorth (): InputSourceButton;
        /**
         * @en  The control button in the east direction which is generally the button B
         * @zh 处于东向的控制按键，一般是按键 B
         */
        public get buttonEast (): InputSourceButton;
        /**
         * @en  The control button in the west direction which is generally the button X
         * @zh 处于西向的控制按键，一般是按键 X
         */
        public get buttonWest (): InputSourceButton;
        /**
         * @en  The control button in the south direction which is generally the button A
         * @zh 处于南向的控制按键，一般是按键 A
         */
        public get buttonSouth (): InputSourceButton;

        /**
         * @en The button Left Trigger
         * @zh 左扳机按键
         */
        public get buttonTriggerLeft (): InputSourceButton;
        /**
         * @en The button Right Trigger
         * @zh 右扳机按键
         */
        public get buttonTriggerRight (): InputSourceButton;
        /**
         * @en The grab Left Trigger
         * @zh 左扳机扣动
         */
        public get triggerLeft (): InputSourceButton;
        /**
         * @en The grab Right Trigger
         * @zh 右扳机扣动
         */
        public get triggerRight (): InputSourceButton;
        /**
         * @en The grab Left Grip
         * @zh 左手柄握住
         */
        public get gripLeft (): InputSourceButton;
        /**
         * @en The grab Right Grip
         * @zh 右手柄握住
         */
        public get gripRight (): InputSourceButton;

        /**
         * @en The left stick
         * @zh 左摇杆
         */
        public get leftStick (): InputSourceStick;
        /**
         * @en The right stick
         * @zh 右摇杆
         */
        public get rightStick (): InputSourceStick;

        /**
         * @en The button Left Stick
         * @zh 左摇杆按键
         */
        public get buttonLeftStick (): InputSourceButton;
        /**
         * @en The button Right Stick
         * @zh 右摇杆按键
         */
        public get buttonRightStick (): InputSourceButton;

        /**
         * @en The button Options
         * @zh 选项按键
         */
        public get buttonOptions (): InputSourceButton;
        /**
         * @en The button Start
         * @zh 开始按键
         */
        public get buttonStart (): InputSourceButton;

        /**
         * @en The position Left hand
         * @zh 左手位置
         */
        public get handLeftPosition (): InputSourcePosition;
        /**
         * @en The orientation Left hand
         * @zh 左手方向
         */
        public get handLeftOrientation (): InputSourceOrientation;
        /**
         * @en The position Right hand
         * @zh 右手位置
         */
        public get handRightPosition (): InputSourcePosition;
        /**
         * @en The orientation Right hand
         * @zh 右手方向
         */
        public get handRightOrientation (): InputSourceOrientation;

        /**
         * @en The position Left aim
         * @zh 左射线位置
         */
        public get aimLeftPosition (): InputSourcePosition;
        /**
         * @en The orientation Left aim
         * @zh 左射线方向
         */
        public get aimLeftOrientation (): InputSourceOrientation;
        /**
         * @en The position Right aim
         * @zh 右射线位置
         */
        public get aimRightPosition (): InputSourcePosition;
        /**
         * @en The orientation Right aim
         * @zh 右射线方向
         */
        public get aimRightOrientation (): InputSourceOrientation;
    }

    type HMDCallback = (res: import('cocos/input/types').EventHMD) => void;
    /**
     * Class designed for HMD input.
     */
    export class HMDInputDevice {
        /**
         * Register the hmd event callback.
         * @engineInternal
         */
        public _on (eventType: import('cocos/input/types/event-enum').InputEventType, callback: HMDCallback, target?: any);

        /**
         * @en The position Left view
         * @zh 左窗口位置
         */
        public get viewLeftPosition (): InputSourcePosition;
        /**
         * @en The orientation Left view
         * @zh 左窗口方向
         */
        public get viewLeftOrientation (): InputSourceOrientation;
        /**
         * @en The position Right view
         * @zh 右窗口位置
         */
        public get viewRightPosition (): InputSourcePosition;
        /**
         * @en The orientation Right view
         * @zh 右窗口方向
         */
        public get viewRightOrientation (): InputSourceOrientation;
        /**
         * @en The position Middle head
         * @zh 头部中间位置
         */
        public get headMiddlePosition (): InputSourcePosition;
        /**
         * @en The orientation Middle head
         * @zh 头部中间方向
         */
        public get headMiddleOrientation (): InputSourceOrientation;
    }

    type HandheldCallback = (res: import('cocos/input/types').EventHandheld) => void;
    /**
     * Class designed for Handheld input.
     */
    export class HandheldInputDevice {
        /**
         * Register the handheld event callback.
         * @engineInternal
         */
        public _on (eventType: import('cocos/input/types/event-enum').InputEventType, callback: HandheldCallback, target?: any);
        /**
         * @en The position handheld
         * @zh 手持设备相机位置
         */
        public get handheldPosition (): InputSourcePosition;
        /**
         * @en The orientation handheld
         * @zh 手持设备相机方向
         */
        public get handheldOrientation (): InputSourceOrientation;
    }
}
