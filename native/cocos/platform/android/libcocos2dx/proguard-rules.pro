# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in E:\developSoftware\Android\SDK/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:
-keep public class com.google.** { *; }
-keep public class com.android.** { *; }
-keep public class google.billing.** { *; }
-keep public class androidx.** { *; }
-keep class com.cocos.lib.CocosActivity {
    public <methods>;
    protected <methods>;
    private void createSurface(...);
}
