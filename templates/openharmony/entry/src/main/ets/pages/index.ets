/****************************************************************************
 Copyright (c) 2022-2023 Xiamen Yaji Software Co., Ltd.

 http://www.cocos.com

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated engine source code (the "Software"), a limited,
 worldwide, royalty-free, non-assignable, revocable and non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You shall
 not use Cocos Creator software for developing other software or tools that's
 used for developing games. You are not granted to publish, distribute,
 sublicense, and/or sell copies of Cocos Creator.

 The software or tools in this License Agreement are licensed, not sold.
 Xiamen Yaji Software Co., Ltd. reserves all rights not expressly granted to you.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 ****************************************************************************/
import nativerender,{context} from 'libcocos.so';

import { WorkerManager } from '../cocos/WorkerManager';
import { ContextType } from '../common/Constants';
import { EditBoxDialog, EditboxShowInfo } from '../components/EditBoxDialog';
import { CocosWebView, WebViewInfo } from '../components/CocosWebView';
import { CocosVideoPlayer, VideoInfo } from '../components/CocosVideoPlayer';
import { MessageEvent } from '@ohos.worker';
import { PortProxy } from '../common/PortProxy';
import { common } from '@kit.AbilityKit';
import { BusinessError } from '@kit.BasicServicesKit';

const nativePageLifecycle :context = nativerender.getContext(ContextType.JSPAGE_LIFECYCLE);
const engineUtils :context = nativerender.getContext(ContextType.ENGINE_UTILS);


function executeNativeMethod(nativeFunc: Function, funcData: string, funCb: Function): void {
  nativeFunc && nativeFunc(funcData, funCb);
}
engineUtils.registerFunction("executeNativeMethod", executeNativeMethod);

interface WorkerMessage {
  type: string;
  data: data;
}

interface data {
  id: string,
  name: string,
  param: number | string | param
}

interface param {
  tag?: number,
  url?: string,
  contents?: string,
  mimeType?: string,
  encoding?: string,
  baseUrl?: string,
  jsContents?: string,
  x?: number,
  y?: number,
  w?: number,
  h?: number,
  visible?: boolean,
  resourceType?: number,
  time?: number,
  fullScreen?: boolean
}

interface editboxShowInfo {
  defaultValue?: string;
  confirmType?: string;
  inputType?: string;
  maxLength?: number;
  x?:number;
  y?:number;
  width?:number;
  height?:number;
  confirmHold?: boolean;
  isMultiline?: boolean;
  fontSize?: number;
  fontColor?: number;
  backColor?: number;
  backgroundColor?: number;
  isBold?: boolean;
  isItalic?: boolean;
  isUnderline?: boolean;
  underlineColor?: number;
  textAlignment?: number;
}

@Entry
@Component
struct Index {
  @State showInfo: EditboxShowInfo = new EditboxShowInfo;
  @State webViewArray: WebViewInfo[] = [];
  @State videoArray: VideoInfo[] = [];
  private webViewIndexMap: Map<number, number> = new Map<number, number>();
  private videoIndexMap: Map<number, number> = new Map<number, number>();
  private workPort: PortProxy = new PortProxy(WorkerManager.getInstance().getWorker());
  dialogController: CustomDialogController = new CustomDialogController({
    builder: EditBoxDialog({
      showInfo: this.showInfo,
      onTextChange: (msg: string): void => {
        this.showInfo.defaultMessage = msg;
        this.workPort.postMessage('onTextInput', msg);
      },
      accept: (msg: string): void => {
        this.showInfo.defaultMessage = msg;
        this.workPort.postMessage('onComplete', msg);
      },
      confirm: (msg: string): void => {
        this.showInfo.defaultMessage = msg;
        this.workPort.postMessage('onConfirm', msg);
        this.workPort.postMessage('onComplete', msg);
      },
    }),
    cancel: (): void => {
      this.workPort.postMessage('onComplete', this.showInfo.defaultMessage);
    },
    autoCancel: true,
    alignment: DialogAlignment.Bottom,
    customStyle: true,
  })

  aboutToAppear(): void {
    console.log('[LIFECYCLE-Index] cocos aboutToAppear');
    this.workPort._messageHandle = async (e: MessageEvent<WorkerMessage>): Promise<void> => {
      let data: WorkerMessage = e.data;
      let msg = data.data;
      let result: boolean | string | number | null = null;
      switch (msg.name) {
        // EditBox
        case "showEditBox": {
          let param = msg.param as editboxShowInfo;
          this.showInfo.defaultMessage = param?.defaultValue as string;
          this.showInfo.backgroundColor = param?.backColor as number;
          if(param?.confirmType == 'done') {
            this.showInfo.enterKeyType = EnterKeyType.Done;
          } else if(param?.confirmType == 'send') {
            this.showInfo.enterKeyType = EnterKeyType.Send;
          } else if(param?.confirmType == 'search') {
            this.showInfo.enterKeyType = EnterKeyType.Search;
          } else if(param?.confirmType == 'go') {
            this.showInfo.enterKeyType = EnterKeyType.Go;
          } else if(param?.confirmType == 'next') {
            this.showInfo.enterKeyType = EnterKeyType.Next;
          } else {
            this.showInfo.enterKeyType = EnterKeyType.Done;
          }
          if(param?.inputType == 'password') {
            this.showInfo.type = InputType.Password;
          } else if(param?.inputType === 'email') {
            this.showInfo.type = InputType.Email;
          } else if(param?.inputType === 'number') {
            this.showInfo.type = InputType.Number;
          } else if(param?.inputType === 'digit') {
            this.showInfo.type = InputType.NUMBER_DECIMAL;
          } else if(param?.inputType === 'tel') {
            this.showInfo.type = InputType.PhoneNumber;
          } else if(param?.inputType === 'url') {
            // No url support
          } else {
            this.showInfo.type = InputType.Normal;
          }
          if(param?.maxLength != undefined && param?.maxLength > 0) {
            this.showInfo.maxLength = param.maxLength;
          } else {
            this.showInfo.maxLength =  65536;
          }

          if(param?.isUnderline != undefined) {
            this.showInfo.showUnderline = param?.isUnderline;
            this.showInfo.underLineColor = param?.underlineColor as number;
          } else {
            this.showInfo.showUnderline = false;
          }

          if(param?.textAlignment == 0) {
            this.showInfo.textAlign = TextAlign.Start;
          } else if(param?.textAlignment == 1) {
            this.showInfo.textAlign = TextAlign.Center;
          } else if(param?.textAlignment == 2) {
            this.showInfo.textAlign = TextAlign.End;
          } else {
            this.showInfo.textAlign = TextAlign.Start;
          }
          this.dialogController.open();
          break;
        }
        case "hideEditBox": {
          this.showInfo.defaultMessage = '';
          this.dialogController.close();
          break;
        }
        // WebView
        case "createWebView": {
          this.webViewArray.push(new WebViewInfo(0, 0, 0, 0, msg.param as number));
          this.webViewIndexMap.set(msg.param as number, this.webViewArray.length - 1);
          break;
        }
        case "removeWebView": {
          if (this.webViewArray.length > 0) {
            this.webViewArray.splice(this.webViewIndexMap.get(msg?.param as number) as number, 1);
          }
          break;
        }
        case "loadUrl": {
          let web = msg.param as param;
          let index = this.webViewIndexMap.get(web?.tag as number) as number;
          this.webViewArray[index].url = web?.url as string;
          this.webViewArray[index].controller.loadUrl(web?.url as string);
          break;
        }
        case "loadHTMLString": {
          let web = msg.param as param;
          let index = this.webViewIndexMap.get(web?.tag as number) as number;
          this.webViewArray[index].controller.loadData(
            web?.contents as string,
            "text/html",
            "UTF-8",
            web?.baseUrl
          );
          break;
        }
        case "loadData": {
          let web = msg.param as param;
          let index = this.webViewIndexMap.get(web?.tag as number) as number;
          this.webViewArray[index].controller.loadData(
            web?.contents as string,
            web?.mimeType as string,
            web?.encoding as string,
            web?.baseUrl as string
          );
          break;
        }
        case "evaluateJS": {
          let web = msg.param as param;
          let index = this.webViewIndexMap.get(web?.tag as number) as number;
          this.webViewArray[index].controller.runJavaScript(web?.jsContents as string);
          break;
        }
        case "reload": {
          let index = this.webViewIndexMap.get(msg.param as number) as number;
          this.webViewArray[index].controller.refresh();
          break;
        }
        case "stopLoading": {
          let index = this.webViewIndexMap.get(msg.param as number) as number;
          this.webViewArray[index].controller.stop();
          break;
        }
        case "canGoForward": {
          let index = this.webViewIndexMap.get(msg.param as number) as number;
          result = this.webViewArray[index].controller.accessForward();
          break;
        }
        case "canGoBack": {
          let index = this.webViewIndexMap.get(msg.param as number) as number;
          result = this.webViewArray[index].controller.accessBackward();
          break;
        }
        case "goForward": {
          let index = this.webViewIndexMap.get(msg.param as number) as number;
          this.webViewArray[index].controller.forward();
          break;
        }
        case "goBack": {
          let index = this.webViewIndexMap.get(msg.param as number) as number;
          this.webViewArray[index].controller.backward();
          break;
        }
        case "setWebViewRect": {
          let web = msg.param as param
          let index = this.webViewIndexMap.get(web?.tag as number) as number;
          this.webViewArray[index].x = px2vp(web?.x as number) as number;
          this.webViewArray[index].y = px2vp(web?.y as number) as number;
          this.webViewArray[index].w = px2vp(web?.w as number) as number;
          this.webViewArray[index].h = px2vp(web?.h as number) as number;
          break;
        }
        case "setVisible": {
          let web = msg.param as param;
          let index = this.webViewIndexMap.get(web?.tag as number) as number;
          this.webViewArray[index].visible = web?.visible as boolean;
          break;
        }
      // video
        case "createVideo": {
          this.videoArray.push(new VideoInfo(0, 0, 0, 0, msg.param as number));
          this.videoIndexMap.set(msg.param as number, this.videoArray.length - 1);
          break;
        }
        case "removeVideo": {
          if (this.videoArray.length > 0) {
            this.videoArray.splice(this.videoIndexMap.get(msg.param as number) as number, 1);
          }
          break;
        }
        case "setVideoUrl":
          let video = msg.param as param;
          let index = this.videoIndexMap.get(video?.tag as number) as number;
          let resourceType = video.resourceType;
          if (resourceType == 1) {
            video.url = 'Resources/' + video.url;
            this.videoArray[index].url = $rawfile(video.url as string);
          } else {
            this.videoArray[index].url = video.url as string;
          }
          break;
        case "setVideoRect": {
          let video = msg.param as param;
          let index = this.videoIndexMap.get(video?.tag as number) as number;
          this.videoArray[index].x = px2vp(video?.x as number) as number;
          this.videoArray[index].y = px2vp(video?.y as number) as number;
          this.videoArray[index].w = px2vp(video?.w as number) as number;
          this.videoArray[index].h = px2vp(video?.h as number) as number;
          break;
        }
        case "startVideo": {
          let index = this.videoIndexMap.get(msg.param as number) as number;
          if(this.videoArray[index].duration){
            this.videoArray[index].controller.start();
          }else{
            this.videoArray[index].isPreparedStart = true;
          }
          break;
        }
        case "pauseVideo": {
          let index = this.videoIndexMap.get(msg.param as number) as number;
          this.videoArray[index].controller.pause();
          break;
        }
        case "stopVideo": {
          let index = this.videoIndexMap.get(msg.param as number) as number;
          this.videoArray[index].controller.stop();
          break;
        }
        case "resumeVideo": {
          let index = this.videoIndexMap.get(msg.param as number) as number;
          this.videoArray[index].controller.start();
          break;
        }
        case "getVideoDuration": {
          let index = this.videoIndexMap.get(msg.param as number) as number;
          result = this.videoArray[index].duration;
          break;
        }
        case "seekVideoTo": {
          let video = msg.param as param;
          let index = this.videoIndexMap.get(video?.tag as number) as number;
          this.videoArray[index].controller.setCurrentTime(video?.time as number, SeekMode.Accurate);
          break;
        }
        case "setVideoVisible": {
          let video = msg.param as param;
          let index = this.videoIndexMap.get(video?.tag as number) as number;
          this.videoArray[index].visible = video.visible as boolean;
          break;
        }
        case "setFullScreenEnabled": {
          let video = msg.param as param;
          let index = this.videoIndexMap.get(video?.tag as number) as number;
          this.videoArray[index].isFullScreen = video.fullScreen as boolean;
          break;
        }
        case "currentTime": {
          let index = this.videoIndexMap.get(msg.param as number) as number;
          result = this.videoArray[index].currentTime;
          break;
        }
        case "exitGame": {
          this.terminateSelf();
          break;
        }
        default: {

        }
      }
      if (result != null || result != undefined) {
        this.workPort.postReturnMessage(data, result);
      }
    }
  }

  aboutToDisappear(): void {
    console.log('[LIFECYCLE-Index] cocos aboutToDisappear');
//  this.cocosWorker.postMessage({type: "JSPageLifecycle", data: "aboutToAppear"});
//  nativePageLifecycle.aboutToDisappear();
  }

  onPageShow(): void  {
    console.log('[LIFECYCLE-Page] cocos onPageShow');
    nativePageLifecycle.onPageShow();
  }

  onPageHide(): void  {
    console.log('[LIFECYCLE-Page] cocos onPageHide');
    nativePageLifecycle.onPageHide();
  }

  onBackPress() {
    console.log("[LIFECYCLE-Page] cocos onBackPress");
    this.workPort.postMessage("backPress", "");
    // If disable system exit needed, remove comment "return true"
    // return true;
  }

  terminateSelf() {
    try {
      (getContext(this) as common.UIAbilityContext).terminateSelf((err: BusinessError) => {
        if (err.code) {
          console.error(`terminateSelf failed, code is ${err.code}, message is ${err.message}`);
          return;
        }
        console.info('terminateSelf succeed');
      });
    } catch (err) {
      let code = (err as BusinessError).code;
      let message = (err as BusinessError).message;
      console.error(`terminateSelf failed, code is ${code}, message is ${message}`);
    }
  }

  build() {
    Flex({
      direction: FlexDirection.Column,
      alignItems: ItemAlign.Center,
      justifyContent: FlexAlign.Center
    } as FlexOptions) {
      XComponent({ id: 'xcomponentId', type: 'surface', libraryname: 'cocos' })
        .onLoad((context) => {
          // Set the cache directory in the ts layer.
          this.workPort.postMessage("onXCLoad", "XComponent");
        })
        .onDestroy(() => {
          console.log('cocos onDestroy')
        })

      ForEach(this.webViewArray, (item: WebViewInfo) => {
        CocosWebView({ viewInfo: item, workPort: this.workPort })
      }, (item: WebViewInfo): string => item.viewTag.toString())

      ForEach(this.videoArray, (item: VideoInfo) => {
        CocosVideoPlayer({ videoInfo: item, workPort: this.workPort })
      }, (item: VideoInfo): string => item.viewTag.toString())
    }
    .width('100%')
    .height('100%')
  }
}
