import { HtmlTextParser } from "../../cocos/2d";
import { CacheMode, HorizontalTextAlignment, Sprite } from "../../cocos/2d/components";
import { RichText } from "../../cocos/2d/components/rich-text";
import { Node } from "../../cocos/scene-graph/node";

test('parse-richtext', () => {
    const htmlTextParser = new HtmlTextParser();
    let node =new Node();
    node.addComponent(RichText);
    let richtext = node.getComponent(RichText) as RichText;

    let attribute = "<img src='1 23' width=80 height=89 align=top />这是一段文本";
    richtext.string = attribute;
    let htmlAttrArray = htmlTextParser.parse(attribute);
    expect(htmlAttrArray.length).toStrictEqual(2);
    expect(htmlAttrArray[0].style.src).toStrictEqual('1 23');
    expect(htmlAttrArray[0].style.imageWidth).toStrictEqual(80);
    expect(htmlAttrArray[0].style.imageHeight).toStrictEqual(89);
    expect(htmlAttrArray[0].style.imageAlign).toStrictEqual('top');
    expect(htmlAttrArray[1].text).toStrictEqual('这是一段文本');

    attribute = "<img src='123'   width=80  height=89    align=top />这是一段文本";
    htmlAttrArray = htmlTextParser.parse(attribute);
    expect(htmlAttrArray.length).toStrictEqual(2);
    expect(htmlAttrArray[0].style.src).toStrictEqual('123');
    expect(htmlAttrArray[0].style.imageWidth).toStrictEqual(80);
    expect(htmlAttrArray[0].style.imageHeight).toStrictEqual(89);
    expect(htmlAttrArray[0].style.imageAlign).toStrictEqual('top');
    expect(htmlAttrArray[1].text).toStrictEqual('这是一段文本');

    attribute = "<img src=\"12 3\" width  =  80 height= 89 align  =top />   前面有三个空格，这是一段文本";
    htmlAttrArray = htmlTextParser.parse(attribute);
    expect(htmlAttrArray.length).toStrictEqual(2);
    expect(htmlAttrArray[0].style.src).toStrictEqual('12 3');
    expect(htmlAttrArray[0].style.imageWidth).toStrictEqual(80);
    expect(htmlAttrArray[0].style.imageHeight).toStrictEqual(89);
    expect(htmlAttrArray[0].style.imageAlign).toStrictEqual('top');
    expect(htmlAttrArray[1].text).toStrictEqual('   前面有三个空格，这是一段文本');
    
    attribute = "<img src=   '12 3' width  =  80 height= 89 align  =top click='onClick' />文本中有两组单引号，但是图片名仅包含在第一组单引号内";
    htmlAttrArray = htmlTextParser.parse(attribute);
    expect(htmlAttrArray.length).toStrictEqual(2);
    expect(htmlAttrArray[0].style.src).toStrictEqual('12 3');
    expect(htmlAttrArray[0].style.imageWidth).toStrictEqual(80);
    expect(htmlAttrArray[0].style.imageHeight).toStrictEqual(89);
    expect(htmlAttrArray[0].style.imageAlign).toStrictEqual('top');
    expect(htmlAttrArray[0].style.event.click).toStrictEqual('onClick');
    expect(htmlAttrArray[1].text).toStrictEqual('文本中有两组单引号，但是图片名仅包含在第一组单引号内');
    
    attribute = "<img src=\"12 3\" width  =  80 height= 89 align  =top click='onClick' />文本中有一组单引号和一组双引号，但是图片名仅包含在前面这组双引号内";
    htmlAttrArray = htmlTextParser.parse(attribute);
    expect(htmlAttrArray.length).toStrictEqual(2);
    expect(htmlAttrArray[0].style.src).toStrictEqual('12 3');
    expect(htmlAttrArray[0].style.imageWidth).toStrictEqual(80);
    expect(htmlAttrArray[0].style.imageHeight).toStrictEqual(89);
    expect(htmlAttrArray[0].style.imageAlign).toStrictEqual('top');
    expect(htmlAttrArray[0].style.event.click).toStrictEqual('onClick');
    expect(htmlAttrArray[1].text).toStrictEqual('文本中有一组单引号和一组双引号，但是图片名仅包含在前面这组双引号内');
    
    attribute = "<img src =  '1 23'/>";
    htmlAttrArray = htmlTextParser.parse(attribute);
    expect(htmlAttrArray.length).toStrictEqual(1);
    expect(htmlAttrArray[0].style.src).toStrictEqual('1 23');

    attribute = "<img src = click = 'onclick' />文本中没有图片名，无法生成style对象";
    htmlAttrArray = htmlTextParser.parse(attribute);
    expect(htmlAttrArray.length).toStrictEqual(1);
    expect(htmlAttrArray[0].text).toStrictEqual('文本中没有图片名，无法生成style对象');
    
    // following tests are exceptional writing

    attribute = "<img ='1 23'/>"; // 'src' missing 
    htmlAttrArray = htmlTextParser.parse(attribute);
    expect(htmlAttrArray.length).toStrictEqual(0);

    attribute = "<img src='123'>"; // '/' missing 
    htmlAttrArray = htmlTextParser.parse(attribute);
    expect(htmlAttrArray.length).toStrictEqual(0);

    attribute = "<img src='1 23\" />"; // quotations don't match
    htmlAttrArray = htmlTextParser.parse(attribute);
    expect(htmlAttrArray.length).toStrictEqual(1);
    expect(htmlAttrArray[0].style.src).toStrictEqual('');
});

test('label.string.setter', () => {
    let node = new Node();
    node.addComponent(RichText);
    let richtext = node.getComponent(RichText) as RichText;
    let childNode = new Node();
    childNode.addComponent(Sprite);
    childNode.parent = node;
    expect(node.children.length).toStrictEqual(1);

    node.active = false;
    node.active = true;
    expect(node.children.length).toStrictEqual(1);

    richtext.string = 'new rich text';
    expect(node.children.length).toStrictEqual(1);

    richtext.horizontalAlign = HorizontalTextAlignment.RIGHT;
    expect(node.children.length).toStrictEqual(1);

    richtext.fontSize = 20;
    expect(node.children.length).toStrictEqual(1);

    richtext.fontFamily = 'Arial';
    expect(node.children.length).toStrictEqual(1);

    richtext.useSystemFont = false;
    expect(node.children.length).toStrictEqual(1);

    richtext.cacheMode = CacheMode.CHAR;
    expect(node.children.length).toStrictEqual(1);

    richtext.maxWidth = 100;
    expect(node.children.length).toStrictEqual(1);

    richtext.lineHeight = 30;
    expect(node.children.length).toStrictEqual(1);
});