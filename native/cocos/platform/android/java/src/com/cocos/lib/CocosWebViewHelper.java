/****************************************************************************
 Copyright (c) 2010-2011 cocos2d-x.org
 Copyright (c) 2013-2016 Chukong Technologies Inc.
 Copyright (c) 2017-2018 Xiamen Yaji Software Co., Ltd.

 http://www.cocos2d-x.org

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 ****************************************************************************/
package com.cocos.lib;

import android.graphics.Color;
import android.os.Handler;
import android.os.Looper;
import android.util.SparseArray;
import android.view.View;
import android.webkit.WebView;
import android.widget.FrameLayout;
import android.widget.PopupWindow;

import java.util.concurrent.Callable;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.FutureTask;


public class CocosWebViewHelper {
    private static final String TAG = CocosWebViewHelper.class.getSimpleName();
    private static Handler sHandler;
    private static PopupWindow sPopUp;
    private static FrameLayout sLayout;

    private static SparseArray<CocosWebView> webViews;
    private static int viewTag = 0;

    public CocosWebViewHelper(FrameLayout layout) {

        CocosWebViewHelper.sLayout = layout;
        CocosWebViewHelper.sHandler = new Handler(Looper.myLooper());

        CocosWebViewHelper.webViews = new SparseArray<CocosWebView>();
    }

    public static void resetStaticVariables() {
        sLayout = null;
        if (sHandler != null) {
            sHandler.removeCallbacksAndMessages(null);
            sHandler = null;
        }
        webViews = null;
    }

    private static native boolean shouldStartLoading(int index, String message);
    private static native void didFinishLoading(int index, String message);
    private static native void didFailLoading(int index, String message);
    private static native void onJsCallback(int index, String message);

    public static boolean _shouldStartLoading(int index, String message) { return !shouldStartLoading(index, message); }
    public static void _didFinishLoading(int index, String message) { didFinishLoading(index, message); }
    public static void _didFailLoading(int index, String message) { didFailLoading(index, message); }
    public static void _onJsCallback(int index, String message) { onJsCallback(index, message); }

    public static int createWebView() {
        final int index = viewTag;
        GlobalObject.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                CocosWebView webView = new CocosWebView(GlobalObject.getActivity(), index);
                FrameLayout.LayoutParams lParams = new FrameLayout.LayoutParams(
                        FrameLayout.LayoutParams.WRAP_CONTENT,
                        FrameLayout.LayoutParams.WRAP_CONTENT);
                sLayout.addView(webView, lParams);

                webViews.put(index, webView);
            }
        });
        return viewTag++;
    }

    public static void removeWebView(final int index) {
        GlobalObject.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                CocosWebView webView = webViews.get(index);
                if (webView != null) {
                    webViews.remove(index);
                    sLayout.removeView(webView);
                    webView.destroy();
                    webView = null;
                }
            }
        });
    }

    public static void setVisible(final int index, final boolean visible) {
        GlobalObject.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                CocosWebView webView = webViews.get(index);
                if (webView != null) {
                    webView.setVisibility(visible ? View.VISIBLE : View.GONE);
                }
            }
        });
    }

    public static void setWebViewRect(final int index, final int left, final int top, final int maxWidth, final int maxHeight) {
        GlobalObject.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                CocosWebView webView = webViews.get(index);
                if (webView != null) {
                    webView.setWebViewRect(left, top, maxWidth, maxHeight);
                }
            }
        });
    }

    public static void setBackgroundTransparent(final int index, final boolean isTransparent) {
        GlobalObject.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                CocosWebView webView = webViews.get(index);
                if (webView != null) {
                    webView.setBackgroundColor(isTransparent ? Color.TRANSPARENT : Color.WHITE);
                    webView.setLayerType(WebView.LAYER_TYPE_SOFTWARE, null);
                }
            }
        });
    }

    public static void setJavascriptInterfaceScheme(final int index, final String scheme) {
        GlobalObject.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                CocosWebView webView = webViews.get(index);
                if (webView != null) {
                    webView.setJavascriptInterfaceScheme(scheme);
                }
            }
        });
    }

    public static void loadData(final int index, final String data, final String mimeType, final String encoding, final String baseURL) {
        GlobalObject.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                CocosWebView webView = webViews.get(index);
                if (webView != null) {
                    webView.loadDataWithBaseURL(baseURL, data, mimeType, encoding, null);
                }
            }
        });
    }

    public static void loadHTMLString(final int index, final String data, final String baseUrl) {
        GlobalObject.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                CocosWebView webView = webViews.get(index);
                if (webView != null) {
                    webView.loadDataWithBaseURL(baseUrl, data, null, null, null);
                }
            }
        });
    }

    public static void loadUrl(final int index, final String url) {
        GlobalObject.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                CocosWebView webView = webViews.get(index);
                if (webView != null) {
                    webView.loadUrl(url);
                }
            }
        });
    }

    public static void loadFile(final int index, final String filePath) {
        GlobalObject.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                CocosWebView webView = webViews.get(index);
                if (webView != null) {
                    webView.loadUrl(filePath);
                }
            }
        });
    }

    public static void stopLoading(final int index) {
        GlobalObject.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                CocosWebView webView = webViews.get(index);
                if (webView != null) {
                    webView.stopLoading();
                }
            }
        });

    }

    public static void reload(final int index) {
        GlobalObject.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                CocosWebView webView = webViews.get(index);
                if (webView != null) {
                    webView.reload();
                }
            }
        });
    }

    public static <T> T callInMainThread(Callable<T> call) throws ExecutionException, InterruptedException {
        FutureTask<T> task = new FutureTask<T>(call);
        sHandler.post(task);
        return task.get();
    }

    public static boolean canGoBack(final int index) {
        Callable<Boolean> callable = new Callable<Boolean>() {
            @Override
            public Boolean call() throws Exception {
                CocosWebView webView = webViews.get(index);
                return webView != null && webView.canGoBack();
            }
        };
        try {
            return callInMainThread(callable);
        } catch (ExecutionException e) {
            return false;
        } catch (InterruptedException e) {
            return false;
        }
    }

    public static boolean canGoForward(final int index) {
        Callable<Boolean> callable = new Callable<Boolean>() {
            @Override
            public Boolean call() throws Exception {
                CocosWebView webView = webViews.get(index);
                return webView != null && webView.canGoForward();
            }
        };
        try {
            return callInMainThread(callable);
        } catch (ExecutionException e) {
            return false;
        } catch (InterruptedException e) {
            return false;
        }
    }

    public static void goBack(final int index) {
        GlobalObject.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                CocosWebView webView = webViews.get(index);
                if (webView != null) {
                    webView.goBack();
                }
            }
        });
    }

    public static void goForward(final int index) {
        GlobalObject.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                CocosWebView webView = webViews.get(index);
                if (webView != null) {
                    webView.goForward();
                }
            }
        });
    }

    public static void evaluateJS(final int index, final String js) {
        GlobalObject.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                CocosWebView webView = webViews.get(index);
                if (webView != null) {
                    webView.loadUrl("javascript:" + js);
                }
            }
        });
    }

    public static void setScalesPageToFit(final int index, final boolean scalesPageToFit) {
        GlobalObject.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                CocosWebView webView = webViews.get(index);
                if (webView != null) {
                    webView.setScalesPageToFit(scalesPageToFit);
                }
            }
        });
    }
}
