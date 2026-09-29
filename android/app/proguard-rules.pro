# ProGuard Rules for Nodara ERP Android App
-keep class com.nodara.erp.data.model.** { *; }
-keepclassmembers class * {
    @com.google.gson.annotations.SerializedName <fields>;
}
