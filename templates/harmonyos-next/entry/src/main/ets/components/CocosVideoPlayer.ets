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
import { PortProxy } from '../common/PortProxy';

enum EventType {
  PLAYING = 0,
  PAUSED,
  STOPPED,
  COMPLETED,
  META_LOADED,
  CLICKED,
  READY_TO_PLAY,
  UPDATE,
  QUIT_FULLSCREEN = 1000
}

interface param {
  videoTag?: number,
  videoEvent?: EventType,
  args?: number
}

@Observed
export class VideoInfo {
  public x: number = 0;
  public y: number = 0;
  public w: number = 0;
  public h: number = 0;
  // url
  public url: string | Resource = "";
  public viewTag: number = 0;
  public visible: boolean = true;
  public duration: number = 0;
  public currentTime: number = 0;
  public isFullScreen: boolean = false;
  public currentProgressRate?: number | string | PlaybackSpeed;
  public resourceType: number = 0;
  public isPreparedStart: boolean = false;
  /**
   * https://gitee.com/openharmony/docs/blob/master/zh-cn/application-dev/reference/arkui-ts/ts-media-components-video.md#videocontroller
   *
   */
  public controller: VideoController = new VideoController()

  constructor(x: number, y: number, w: number, h: number, viewTag: number) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.viewTag = viewTag
  }
}

@Component
export struct CocosVideoPlayer {
  @ObjectLink videoInfo: VideoInfo;
  public workPort: PortProxy | null = null;

  build() {
    Video({
      src: this.videoInfo.url,
      controller: this.videoInfo.controller,
      currentProgressRate: this.videoInfo.currentProgressRate as number | string | PlaybackSpeed
    })
      .position({ x: this.videoInfo.x, y: this.videoInfo.y })
      .width(this.videoInfo.w)
      .height(this.videoInfo.h)
      .controls(false)
      .autoPlay(false)
      .onStart(() => {
        this.workPort?.postMessage("onVideoEvent", {
          videoTag: this.videoInfo.viewTag as number,
          videoEvent: EventType.PLAYING as EventType
        } as param);
      })
      .onPause(() => {
        this.workPort?.postMessage("onVideoEvent", {
          videoTag: this.videoInfo.viewTag as number,
          videoEvent: EventType.PAUSED as EventType
        } as param);
      })
      .onFinish(() => {
        this.workPort?.postMessage("onVideoEvent", {
          videoTag: this.videoInfo.viewTag,
          videoEvent: EventType.COMPLETED
        } as param);
      })
      .onPrepared((event): void => {
        this.videoInfo.isPreparedStart && this.videoInfo.controller.start();
        
        this.videoInfo.duration = event?.duration as number;
        this.workPort?.postMessage("onVideoEvent", {
          videoTag: this.videoInfo.viewTag,
          videoEvent: EventType.READY_TO_PLAY,
          args: event?.duration
        } as param);
      })
      .onClick((event): void => {
        this.workPort?.postMessage("onVideoEvent", {
          videoTag: this.videoInfo.viewTag,
          videoEvent: EventType.CLICKED
        } as param);
      })
      .onUpdate((event) => {
        this.videoInfo.currentTime = event?.time as number;
        this.workPort?.postMessage("onVideoEvent", {
          videoTag: this.videoInfo.viewTag,
          videoEvent: EventType.UPDATE,
          args: event?.time
        } as param);
      })
      .onFullscreenChange((event) => {
        if (!event?.fullscreen) {
          this.workPort?.postMessage("onVideoEvent", {
            videoTag: this.videoInfo.viewTag,
            videoEvent: EventType.QUIT_FULLSCREEN
          } as param);
        }
        this.videoInfo.isFullScreen = event?.fullscreen as boolean;
      })
      .visibility(this.videoInfo.visible ? Visibility.Visible : Visibility.None)
  }
}