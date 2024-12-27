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
@Observed
export class EditboxShowInfo {
  public backgroundColor: number = 0xFFFFFFFF;
  public enterKeyType: EnterKeyType = EnterKeyType.Done;
  public type:InputType = InputType.Normal;
  public maxLength: number = 65536;
  public defaultMessage: string = '';
  public textAlign: TextAlign = TextAlign.Start;
  public showUnderline: boolean = false;
  public multiLines: boolean = false;
  // API12
  public underLineColor: number = 0xFFFFFFFF;
}

@CustomDialog
export struct EditBoxDialog {
  private inputMessage: string = ''
  @ObjectLink showInfo: EditboxShowInfo;
  onTextChange?: (msg: string) => void;
  accept?: (msg: string) => void;
  controller?: CustomDialogController;
  cancel?: () => void;
  confirm?: (msg: string) => void;

  build() {
    Column() {
      Row() {
        TextInput({ text: this.showInfo.defaultMessage })
          .defaultFocus(true)
          .backgroundColor('#ffffff')
          .backgroundColor(this.showInfo.backgroundColor)
          .type(this.showInfo.type)
          .maxLength(this.showInfo.maxLength)
          .textAlign(this.showInfo.textAlign)
          .showUnderline(this.showInfo.showUnderline)
          .enterKeyType(this.showInfo.enterKeyType)
          .layoutWeight(1)
          .onChange((value) => {
            if (this.onTextChange) {
              this.onTextChange(value);
            }
            this.inputMessage = value;
          })
          .onSubmit((value) => {
            if(this.confirm) {
              this.confirm(this.inputMessage);
            }
            this.controller?.close();
          })
        Blank(8).width(16)
        Button('完成').onClick(() => {
          if (this.accept) {
            this.accept(this.inputMessage);
          }
          this.controller?.close();
        })
      }.padding({ left: 8, right: 8, top: 8, bottom: 8 })
      .backgroundColor(Color.Gray)
      .offset({ x : 0, y : 15 })
    }
    .width('100%')

    .justifyContent(FlexAlign.End)
  }
}
