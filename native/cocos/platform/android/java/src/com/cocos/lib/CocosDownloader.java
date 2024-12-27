/****************************************************************************
 Copyright (c) 2017-2018 Xiamen Yaji Software Co., Ltd.

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

package com.cocos.lib;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;

import org.cocos2dx.okhttp3.Call;
import org.cocos2dx.okhttp3.Callback;
import org.cocos2dx.okhttp3.Dispatcher;
import org.cocos2dx.okhttp3.OkHttpClient;
import org.cocos2dx.okhttp3.Protocol;
import org.cocos2dx.okhttp3.Request;
import org.cocos2dx.okhttp3.Response;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.PrintWriter;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.Collections;
import java.util.Iterator;
import java.util.LinkedList;
import java.util.Map;
import java.util.Queue;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

// Rename package okhttp3 to org.cocos2dx.okhttp3
// Github repo: https://github.com/PatriceJiang/okhttp/tree/cocos2dx-rename-3.12.x
// and https://github.com/PatriceJiang/okio/tree/cocos2dx-rename-1.15.0

public class CocosDownloader {

    private int _id;
    private OkHttpClient _httpClient = null;
    private static Dispatcher dispatcher = null;

    private String _tempFileNameSuffix;
    private int _countOfMaxProcessingTasks;
    private ConcurrentHashMap<Integer,Call> _taskMap = new ConcurrentHashMap<>();
    private Queue<Runnable> _taskQueue = new LinkedList<>();
    private int _runningTaskCount = 0;

    private void onProgress(final int id, final long downloadBytes, final long downloadNow, final long downloadTotal) {
        CocosHelper.runOnGameThread(new Runnable() {
            @Override
            public void run() {
                nativeOnProgress(_id, id, downloadBytes, downloadNow, downloadTotal);
            }
        });
    }

    private void onFinish(final int id, final int errCode, final String errStr, final byte[] data) {
        Call task =_taskMap.get(id);
        if (null == task) return;
        _taskMap.remove(id);
        _runningTaskCount -= 1;
        CocosHelper.runOnGameThread(new Runnable() {
            @Override
            public void run() {
                nativeOnFinish(_id, id, errCode, errStr, data);
            }
        });
        runNextTaskIfExists();
    }

    public static CocosDownloader createDownloader(int id, int timeoutInSeconds, String tempFileSuffix, int maxProcessingTasks) {
        CocosDownloader downloader = new CocosDownloader();
        downloader._id = id;

        if(dispatcher == null) {
            dispatcher = new Dispatcher();
        }

        if (timeoutInSeconds > 0) {
            downloader._httpClient = new OkHttpClient().newBuilder()
                    .dispatcher(dispatcher)
                    .followRedirects(true)
                    .followSslRedirects(true)
                    .connectTimeout(timeoutInSeconds, TimeUnit.SECONDS)
                    .protocols(Collections.singletonList(Protocol.HTTP_1_1))
                    .build();
        } else {
            downloader._httpClient = new OkHttpClient().newBuilder()
                    .dispatcher(dispatcher)
                    .followRedirects(true)
                    .followSslRedirects(true)
                    .protocols(Collections.singletonList(Protocol.HTTP_1_1))
                    .build();
        }


        downloader._tempFileNameSuffix = tempFileSuffix;
        downloader._countOfMaxProcessingTasks = maxProcessingTasks;
        return downloader;
    }

    public static void createTask(final CocosDownloader downloader, int id_, String url_, String path_, String []header_) {
        final int id = id_;
        final String url = url_;
        final String path = path_;
        final String pathWithUrlHash = path + url.hashCode();
        final String tempFilePath = pathWithUrlHash + downloader._tempFileNameSuffix;
        final String[] header = header_;

        Runnable taskRunnable = new Runnable() {
            String domain = null;
            String host = null;
            File tempFile = null;
            File finalFile = null;
            long downloadStart = 0;

            @Override
            public void run() {
                Call task = null;

                do {
                    if (path.length() > 0) {
                        try {
                            URI uri = new URI(url);
                            domain = uri.getHost();
                        } catch (URISyntaxException e) {
                            e.printStackTrace();
                            break;
                        } catch (NullPointerException e) {
                            e.printStackTrace();
                            break;
                        }

                        // file task
                        tempFile = new File(tempFilePath);
                        if (tempFile.isDirectory()) break;

                        File parent = tempFile.getParentFile();
                        if (parent == null) {
                            String errStr = "Invalid path " + path + " : The current path is inaccessible.";
                            Log.e("CocosDownloader", errStr);
                            CocosHelper.runOnGameThread(new Runnable() {
                                @Override
                                public void run() {
                                    downloader.nativeOnFinish(downloader._id, id, 0, errStr, null);
                                }
                            });
                            break;
                        }
                        if (!parent.isDirectory() && !parent.mkdirs()) break;

                        finalFile = new File(path);
                        if (finalFile.isDirectory()) break;
                        long fileLen = tempFile.length();

                        host = domain.startsWith("www.") ? domain.substring(4) : domain;
                        if (fileLen > 0) {
                            Context ctx = GlobalObject.getContext();
                            if (ctx == null) {
                                return;
                            }
                            SharedPreferences sharedPreferences = ctx.getSharedPreferences("breakpointDownloadSupport", Context.MODE_PRIVATE);
                            if (sharedPreferences.contains(host) && sharedPreferences.getBoolean(host, false)) {
                                downloadStart = fileLen;
                            } else {
                                // Remove previous downloaded context
                                try {
                                    PrintWriter writer = new PrintWriter(tempFile);
                                    writer.print("");
                                    writer.close();
                                }
                                // Not found then nothing to do
                                catch (FileNotFoundException e) {
                                }
                            }
                        }
                    }

                    final Request.Builder builder = new Request.Builder().url(url);
                    for (int i = 0; i < header.length / 2; i++) {
                        builder.addHeader(header[i * 2], header[(i * 2) + 1]);
                    }
                    if (downloadStart > 0) {
                        builder.addHeader("RANGE", "bytes=" + downloadStart + "-");
                    }

                    final Request request = builder.build();
                    task = downloader._httpClient.newCall(request);
                    if (null == task) {
                        final String errStr = "Can't create DownloadTask for " + url;
                        CocosHelper.runOnGameThread(new Runnable() {
                            @Override
                            public void run() {
                                downloader.nativeOnFinish(downloader._id, id, 0, errStr, null);
                            }
                        });
                    } else {
                        downloader._taskMap.put(id, task);
                    }
                    task.enqueue(new Callback() {
                        @Override
                        public void onFailure(Call call, IOException e) {
                            downloader.onFinish(id, 0, e.toString(), null);
                        }

                        @Override
                        public void onResponse(Call call, Response response) throws IOException {
                            InputStream is = null;
                            byte[] buf = new byte[4096];
                            FileOutputStream fos = null;

                            try {

                                if(!(response.code() >= 200 && response.code() <= 206)) {
                                    // it is encourage to delete the tmp file when requested range not satisfiable.
                                    if (response.code() == 416) {
                                        File file = new File(tempFilePath);
                                        if (file.exists() && file.isFile()) {
                                            file.delete();
                                        }
                                    }
                                    downloader.onFinish(id, -2, response.message(), null);
                                    return;
                                }

                                // save breakpointDownloadSupport Data to SharedPreferences storage
                                Context context = GlobalObject.getContext();
                                if (context == null) {
                                    return;
                                }
                                SharedPreferences sharedPreferences = context.getSharedPreferences("breakpointDownloadSupport", Context.MODE_PRIVATE);
                                SharedPreferences.Editor editor = sharedPreferences.edit();
                                long total = response.body().contentLength() + downloadStart;
                                if (path.length() > 0 && !sharedPreferences.contains(host)) {
                                    if (total > 0) {
                                        editor.putBoolean(host, true);
                                    } else {
                                        editor.putBoolean(host, false);
                                    }
                                    editor.commit();
                                }

                                long current = downloadStart;
                                is = response.body().byteStream();

                                if (path.length() > 0) {
                                    if (downloadStart > 0) {
                                        fos = new FileOutputStream(tempFile, true);
                                    } else {
                                        fos = new FileOutputStream(tempFile, false);
                                    }

                                    int len;
                                    while ((len = is.read(buf)) != -1) {
                                        current += len;
                                        fos.write(buf, 0, len);
                                        downloader.onProgress(id, len, current, total);
                                    }
                                    fos.flush();

                                    String errStr = null;
                                    do {
                                        // rename temp file to final file, if final file exist, remove it
                                        if (finalFile.exists()) {
                                            if (finalFile.isDirectory()) {
                                                break;
                                            }
                                            if (!finalFile.delete()) {
                                                errStr = "Can't remove old file:" + finalFile.getAbsolutePath();
                                                break;
                                            }
                                        }
                                        tempFile.renameTo(finalFile);
                                    } while (false);

                                    if (errStr == null) {
                                        downloader.onFinish(id, 0, null, null);
                                        downloader.runNextTaskIfExists();
                                    } else {
                                        downloader.onFinish(id, 0, errStr, null);
                                    }
                                    if (sharedPreferences.contains(host)) {
                                        editor.remove(host);
                                        editor.commit();
                                    }
                                } else {
                                    // non-file
                                    ByteArrayOutputStream buffer;
                                    if(total > 0) {
                                        buffer = new ByteArrayOutputStream((int) total);
                                    } else {
                                        buffer = new ByteArrayOutputStream(4096);
                                    }

                                    int len;
                                    while ((len = is.read(buf)) != -1) {
                                        current += len;
                                        buffer.write(buf, 0, len);
                                        downloader.onProgress(id, len, current, total);
                                    }
                                    downloader.onFinish(id, 0, null, buffer.toByteArray());
                                    downloader.runNextTaskIfExists();
                                }
                            } catch (IOException e) {
                                e.printStackTrace();
                                downloader.onFinish(id, 0, e.toString(), null);
                            } finally {
                                try {
                                    if (is != null) {
                                        is.close();
                                    }
                                    if (fos != null) {
                                        fos.close();
                                    }
                                } catch (IOException e) {
                                    Log.e("CocosDownloader", e.toString());
                                }
                            }
                        }
                    });
                } while (false);
            }
        };
        downloader.enqueueTask(taskRunnable);
    }

    public static void abort(final CocosDownloader downloader, final int id) {
        GlobalObject.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                Iterator iter = downloader._taskMap.entrySet().iterator();
                while (iter.hasNext()) {
                    Map.Entry entry = (Map.Entry) iter.next();
                    Object key = entry.getKey();
                    Call task = (Call) entry.getValue();
                    if (null != task && Integer.parseInt(key.toString()) == id) {
                        task.cancel();
                        downloader._taskMap.remove(id);
                        downloader.runNextTaskIfExists();
                        break;
                    }
                }
            }
        });
    }

    public static void cancelAllRequests(final CocosDownloader downloader) {
        GlobalObject.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                for (Object o : downloader._taskMap.entrySet()) {
                    Map.Entry entry = (Map.Entry) o;
                    Call task = (Call) entry.getValue();
                    if (null != task) {
                        task.cancel();
                    }
                }
            }
        });
    }


    private void enqueueTask(Runnable taskRunnable) {
        synchronized (_taskQueue) {
            if (_runningTaskCount < _countOfMaxProcessingTasks) {
                GlobalObject.runOnUiThread(taskRunnable);
                _runningTaskCount++;
            } else {
                _taskQueue.add(taskRunnable);
            }
        }
    }

    private void runNextTaskIfExists() {
        synchronized (_taskQueue) {
            while (_runningTaskCount < _countOfMaxProcessingTasks &&
                CocosDownloader.this._taskQueue.size() > 0) {

                Runnable taskRunnable = CocosDownloader.this._taskQueue.poll();
                GlobalObject.runOnUiThread(taskRunnable);
                _runningTaskCount += 1;
            }
        }
    }

    native void nativeOnProgress(int id, int taskId, long dl, long dlnow, long dltotal);
    native void nativeOnFinish(int id, int taskId, int errCode, String errStr, final byte[] data);
}
