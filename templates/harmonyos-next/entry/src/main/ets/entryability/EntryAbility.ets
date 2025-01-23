import UIAbility from '@ohos.app.ability.UIAbility';
import cocos from 'libcocos.so';
import { ContextType } from '../common/Constants';
import window from '@ohos.window';
import { BusinessError } from '@kit.BasicServicesKit';
import { AbilityConstant, Want } from '@kit.AbilityKit';

const nativeContext = cocos.getContext(ContextType.ENGINE_UTILS);
const nativeAppLifecycle = cocos.getContext(ContextType.APP_LIFECYCLE);
enum windowStageType {
  hide,
  show
}
export default class EntryAbility extends UIAbility {
  private windowStageType: windowStageType = windowStageType.hide;

  onCreate(want: Want, launchParam: AbilityConstant.LaunchParam) {
    globalThis.abilityWant = want;
    nativeAppLifecycle.onCreate();
    nativeContext.resourceManagerInit(this.context.resourceManager);
  }

  onDestroy() {
    nativeAppLifecycle.onDestroy();
  }

  onWindowStageCreate(windowStage: window.WindowStage) {
    nativeContext.writablePathInit(this.context.cacheDir);

    // Get the Main window instance
    let windowClass: window.Window | undefined = undefined;
    windowStage.getMainWindow((err: BusinessError, data) => {
      if (err.code) {
        console.error('Failed to obtain the main window. Cause: ' + JSON.stringify(err));
        return;
      }
      windowClass = data;
      // Set whether to display the status bar and navigation bar. If they are not displayed, [] is displayed.
      let systemBarPromise = windowClass.setWindowSystemBarEnable([]);
      // Whether the window layout is displayed in full screen mode
      let fullScreenPromise = windowClass.setWindowLayoutFullScreen(true);
      // Sets whether the screen is always on.
      let keepScreenOnPromise = windowClass.setWindowKeepScreenOn(true);
      Promise.all([systemBarPromise, fullScreenPromise, keepScreenOnPromise]).then(() => {
        console.info('Succeeded in setting the window');
      }).catch((err:BusinessError) => {
          console.error('Failed to set the window, cause ' + JSON.stringify(err));
      });
    });
    // Main window is created, set main page for this ability
    windowStage.loadContent("pages/index", (err, data) => {
      if (err.code) {
        console.error('Failed to load the content. Cause:' + JSON.stringify(err));
        return;
      }
    });
    windowStage.on("windowStageEvent", (data) => {
      let stageEventType: window.WindowStageEventType = data;
      switch (stageEventType) {
          case window.WindowStageEventType.RESUMED:
              this.onChangeWinodowStageType(windowStageType.show);
              break;
          case window.WindowStageEventType.PAUSED:
              this.onChangeWinodowStageType(windowStageType.hide);
              break;
          default:
              break;
      }
  });
  }

  onWindowStageDestroy() {

  }

  onForeground() {
    // Ability has brought to foreground
    this.onChangeWinodowStageType(windowStageType.show);
  }

  onBackground() {
    // Ability has back to background
    this.onChangeWinodowStageType(windowStageType.hide);
  }

  onChangeWinodowStageType(type: windowStageType) {
    if (this.windowStageType != type) {
      this.windowStageType = type;
      this.windowStageType === windowStageType.show ? nativeAppLifecycle.onShow() : nativeAppLifecycle.onHide();
    }
  }
}
