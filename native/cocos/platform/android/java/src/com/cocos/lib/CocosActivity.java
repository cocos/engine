/****************************************************************************
 * Copyright (c) 2018-2022 Xiamen Yaji Software Co., Ltd.
 *
 * http://www.cocos.com
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 ****************************************************************************/

package com.cocos.lib;

import android.content.Context;
import android.content.pm.ActivityInfo;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.media.AudioManager;
import android.os.Bundle;
import android.text.TextUtils;
import android.util.Log;
import android.view.SurfaceView;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;
import android.widget.FrameLayout;

import com.google.androidgamesdk.GameActivity;

import java.lang.reflect.Field;
import java.util.ArrayList;
import java.util.List;

public class CocosActivity extends GameActivity {
    private static final String TAG = "CocosActivity";
    private static final int INITIAL_ROTATION = -1;
    private CocosWebViewHelper mWebViewHelper = null;
    private CocosVideoHelper mVideoHelper = null;

    private CocosSensorHandler mSensorHandler;
    private List<CocosSurfaceView> mSurfaceViewArray;
    private FrameLayout mRootLayout;

    private int mRotation = INITIAL_ROTATION;



    private native void onCreateNative(Context applicationContext);

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        onLoadNativeLibraries();
        onCreateNative(this.getApplicationContext());

        getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN, WindowManager.LayoutParams.FLAG_FULLSCREEN);
        getWindow().requestFeature(Window.FEATURE_NO_TITLE);
        super.onCreate(savedInstanceState);

        // GlobalObject.init should be initialized at first.
        GlobalObject.init(this.getApplicationContext(), this);

        CocosHelper.registerBatteryLevelReceiver(this);
        CocosHelper.init();
        CocosAudioFocusManager.registerAudioFocusListener(this);
        CanvasRenderingContext2DImpl.init(this);
        this.setVolumeControlStream(AudioManager.STREAM_MUSIC);
        getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_NOTHING);
        initView();


        mSensorHandler = new CocosSensorHandler(this);

        setImmersiveMode();

        Utils.hideVirtualButton();

        mSurfaceView.setOnTouchListener((v, event) -> processMotionEvent(event));
    }

    private void setImmersiveMode() {
        WindowManager.LayoutParams lp = getWindow().getAttributes();
        try {
            Field field = lp.getClass().getField("layoutInDisplayCutoutMode");
            //Field constValue = lp.getClass().getDeclaredField("LAYOUT_IN_DISPLAY_CUTOUT_MODE_NEVER");
            Field constValue = lp.getClass().getDeclaredField("LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES");
            field.setInt(lp, constValue.getInt(null));

            // https://developer.android.com/training/system-ui/immersive
            int flag = View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                    | View.SYSTEM_UI_FLAG_FULLSCREEN
                    | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                    | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                    | View.SYSTEM_UI_FLAG_LAYOUT_STABLE;

            flag |= View.class.getDeclaredField("SYSTEM_UI_FLAG_IMMERSIVE_STICKY").getInt(null);
            View view = getWindow().getDecorView();
            view.setSystemUiVisibility(flag);

        } catch (NoSuchFieldException | IllegalAccessException e) {
            e.printStackTrace();
        }
    }

    protected void initView() {
        mRootLayout = findViewById(contentViewId);
        if (mWebViewHelper == null) {
            mWebViewHelper = new CocosWebViewHelper(mRootLayout);
        }

        if (mVideoHelper == null) {
            mVideoHelper = new CocosVideoHelper(this, mRootLayout);
        }
    }



    public SurfaceView getSurfaceView() {
        return this.mSurfaceView;
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        CocosHelper.unregisterBatteryLevelReceiver(this);
        CocosAudioFocusManager.unregisterAudioFocusListener(this);
        CanvasRenderingContext2DImpl.destroy();
        CocosHelper.destroy();
        GlobalObject.destroy();
        CocosWebViewHelper.resetStaticVariables();
        CocosSensorHandler.resetStaticVariables();

        mVideoHelper.destroy();
        mSurfaceView.setOnTouchListener(null);
        mSurfaceView.getHolder().removeCallback(this);

        mRootLayout.removeAllViews();
        mRootLayout = null;

        mSensorHandler = null;
        mWebViewHelper = null;
        mVideoHelper = null;
        mSurfaceView = null;
    }

    @Override
    protected void onPause() {
        super.onPause();
        mSensorHandler.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        mSensorHandler.onResume();
        Utils.hideVirtualButton();
        if (CocosAudioFocusManager.isAudioFocusLoss()) {
            CocosAudioFocusManager.registerAudioFocusListener(this);
        }
    }

    @Override
    protected void onStop() {
        super.onStop();
        mSurfaceView.setVisibility(View.INVISIBLE);
        if (null != mSurfaceViewArray) {
            for (CocosSurfaceView surfaceView : mSurfaceViewArray) {
                surfaceView.setVisibility(View.INVISIBLE);
            }
        }
    }

    @Override
    protected void onStart() {
        super.onStart();
        mSurfaceView.setVisibility(View.VISIBLE);
        if (null != mSurfaceViewArray) {
            for (CocosSurfaceView surfaceView : mSurfaceViewArray) {
                surfaceView.setVisibility(View.VISIBLE);
            }
        }
        if (mRotation == INITIAL_ROTATION
            && getRequestedOrientation() == ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE) {
            //onConfigurationChange can be triggered at the mode of 'sensor or fullSensor'. Here only handles the sensorLandscape mode.
            mRotation = CocosHelper.getDeviceRotation();
            mSurfaceView.addOnLayoutChangeListener((v, left, top, right, bottom, oldLeft, oldTop, oldRight, oldBottom) -> {
                int rotation = CocosHelper.getDeviceRotation();
                if (mRotation != rotation) {
                    mRotation = rotation;
                    this.onConfigurationChangedNative(this.getGameActivityNativeHandle());
                }
            });
        }
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus && CocosAudioFocusManager.isAudioFocusLoss()) {
            CocosAudioFocusManager.registerAudioFocusListener(this);
        }
    }

    // invoke from native code
    @SuppressWarnings({"UnusedDeclaration"})
    private void createSurface(int x, int y, int width, int height, int windowId) {
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                CocosSurfaceView view = new CocosSurfaceView(CocosActivity.this, windowId);
                view.setLayoutParams(new FrameLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT));
                FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(width, height);
                params.leftMargin = x;
                params.topMargin = y;
                //mSubsurfaceView.setBackgroundColor(Color.BLUE);
                mRootLayout.addView(view, params);
                if (null == mSurfaceViewArray) {
                    mSurfaceViewArray = new ArrayList<>();
                }
                mSurfaceViewArray.add(view);
            }
        });
    }

    private void onLoadNativeLibraries() {
        try {
            ApplicationInfo ai = getPackageManager().getApplicationInfo(getPackageName(), PackageManager.GET_META_DATA);

            Bundle bundle = ai.metaData;
            String libName = bundle.getString("android.app.lib_name");
            if (TextUtils.isEmpty(libName)) {
                Log.e(TAG, "can not find library, please config android.app.lib_name at AndroidManifest.xml");
            }
            assert libName != null;
            System.loadLibrary(libName);
            getIntent().putExtra(GameActivity.META_DATA_LIB_NAME, libName);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
