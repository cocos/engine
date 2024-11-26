/****************************************************************************
 Copyright (c) 2017-2020 Xiamen Yaji Software Co., Ltd.
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

package com.cocos.service;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.res.AssetManager;
import android.content.res.Configuration;
import android.os.Bundle;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.lang.ref.WeakReference;
import java.util.ArrayList;
import java.util.List;

public final class SDKWrapper {
    private SDKWrapper() {}
    private static class SDKWrapperInstance {
        private static final SDKWrapper mInstance = new SDKWrapper();
    }
    public static SDKWrapper shared() { return SDKWrapperInstance.mInstance; }

    @SuppressWarnings("unused")
    public interface SDKInterface {
        default void init(Context context) {}
        default void onStart() {}
        default void onPause() {}
        default void onResume() {}
        default void onStop() {}
        default void onDestroy() {}
        default void onRestart() {}
        default void onNewIntent(Intent intent) {}
        default void onActivityResult(int requestCode, int resultCode, Intent data) {}
        default void onConfigurationChanged(Configuration newConfig) {}
        default void onRestoreInstanceState(Bundle savedInstanceState) {}
        default void onSaveInstanceState(Bundle outState) {}
        default void onBackPressed() {}
        default void onLowMemory() {}
    }

    private WeakReference<Activity> mActivity = null;
    private List<SDKInterface> serviceInstances;

    private void loadSDKInterface() {
        ArrayList<SDKInterface> instances = new ArrayList<>();
        try {
            String json = this.getJson("service.json");
            JSONObject jsonObject = new JSONObject(json);
            JSONArray serviceClasses = jsonObject.getJSONArray("serviceClasses");
            if (serviceClasses == null) return;
            int length = serviceClasses.length();
            for (int i = 0; i < length; i++) {
                instances.add((SDKInterface) Class.forName(serviceClasses.getString(i)).newInstance());
            }
        } catch (Exception ignored) { }
        this.serviceInstances = instances;
    }

    @SuppressWarnings("SameParameterValue")
    private String getJson(String fileName) {
        StringBuilder sb = new StringBuilder();
        try {
            AssetManager am = this.mActivity.get().getAssets();
            BufferedReader br = new BufferedReader(new InputStreamReader(am.open(fileName)));
            String next;
            while (null != (next = br.readLine())) { sb.append(next); }
        } catch (IOException e) {
            sb.delete(0, sb.length());
        }
        return sb.toString().trim();
    }

    public Activity getActivity() { return this.mActivity.get(); }

    public void init(Activity activity) {
        this.mActivity = new WeakReference<>(activity);
        this.loadSDKInterface();
        for (SDKInterface sdk : this.serviceInstances) {
            sdk.init(activity);
        }
    }

    public void onResume() {
        for (SDKInterface sdk : this.serviceInstances) {
            sdk.onResume();
        }
    }

    public void onPause() {
        for (SDKInterface sdk : this.serviceInstances) {
            sdk.onPause();
        }
    }

    public void onDestroy() {
        for (SDKInterface sdk : this.serviceInstances) {
            sdk.onDestroy();
        }
    }

    public void onActivityResult(int requestCode, int resultCode, Intent data) {
        for (SDKInterface sdk : this.serviceInstances) {
            sdk.onActivityResult(requestCode, resultCode, data);
        }
    }

    public void onNewIntent(Intent intent) {
        for (SDKInterface sdk : this.serviceInstances) {
            sdk.onNewIntent(intent);
        }
    }

    public void onRestart() {
        for (SDKInterface sdk : this.serviceInstances) {
            sdk.onRestart();
        }
    }

    public void onStop() {
        for (SDKInterface sdk : this.serviceInstances) {
            sdk.onStop();
        }
    }

    public void onBackPressed() {
        for (SDKInterface sdk : this.serviceInstances) {
            sdk.onBackPressed();
        }
    }

    public void onConfigurationChanged(Configuration newConfig) {
        for (SDKInterface sdk : this.serviceInstances) {
            sdk.onConfigurationChanged(newConfig);
        }
    }

    public void onRestoreInstanceState(Bundle savedInstanceState) {
        for (SDKInterface sdk : this.serviceInstances) {
            sdk.onRestoreInstanceState(savedInstanceState);
        }
    }

    public void onSaveInstanceState(Bundle outState) {
        for (SDKInterface sdk : this.serviceInstances) {
            sdk.onSaveInstanceState(outState);
        }
    }

    public void onStart() {
        for (SDKInterface sdk : this.serviceInstances) {
            sdk.onStart();
        }
    }

    public void onLowMemory() {
        for (SDKInterface sdk : this.serviceInstances) {
            sdk.onLowMemory();
        }
    }
}