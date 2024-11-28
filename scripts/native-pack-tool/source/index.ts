import { nativePackToolMg } from './base/manager';
import { MacPackTool } from './platforms/mac';
import { WindowsPackTool } from './platforms/windows';
import { AndroidPackTool } from './platforms/android';
import { HarmonyOSNextPackTool } from './platforms/harmonyos-next';
import { OHOSPackTool } from './platforms/ohos';
import { IOSPackTool } from './platforms/ios';
import { HuaweiAGCPackTool } from './platforms/huawei-agc';

nativePackToolMg.register('ios', new IOSPackTool());
nativePackToolMg.register('mac', new MacPackTool());
nativePackToolMg.register('windows', new WindowsPackTool());
nativePackToolMg.register('android', new AndroidPackTool());
nativePackToolMg.register('harmonyos-next', new HarmonyOSNextPackTool());
nativePackToolMg.register('ohos', new OHOSPackTool());
nativePackToolMg.register('huawei-agc', new HuaweiAGCPackTool());

export * from './base/manager';
export * from './base/default';
