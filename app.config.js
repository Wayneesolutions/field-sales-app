// Expo config. Set API_BASE_URL when building, e.g. in eas.json or:
//   API_BASE_URL=https://crm.example.com/api/v1 npx expo start
const API_BASE_URL = process.env.API_BASE_URL || "http://10.0.2.2:3000/api/v1";

module.exports = {
  expo: {
    name: "Field Sales",
    slug: "wayne-field-sales",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    splash: { image: "./assets/icon.png", resizeMode: "contain", backgroundColor: "#0F3D91" },
    android: {
      package: "com.wayneesolutions.fieldsales",
      versionCode: 1,
      adaptiveIcon: { foregroundImage: "./assets/icon.png", backgroundColor: "#0F3D91" },
      permissions: [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION",
        "FOREGROUND_SERVICE",
        "FOREGROUND_SERVICE_LOCATION",
        "CAMERA",
        "INTERNET",
        "ACCESS_NETWORK_STATE",
        "REQUEST_IGNORE_BATTERY_OPTIMIZATIONS"
      ],
      // Pulled in by libraries but not used; keeping them out means fewer scary prompts for the rep.
      blockedPermissions: [
        "android.permission.RECORD_AUDIO",
        "android.permission.SYSTEM_ALERT_WINDOW",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE",
      ],
      // Allows a plain http:// API during testing. Use https in production.
      usesCleartextTraffic: API_BASE_URL.startsWith("http://"),
    },
    ios: {
      bundleIdentifier: "com.wayneesolutions.fieldsales",
      infoPlist: {
        UIBackgroundModes: ["location", "fetch"],
        NSLocationWhenInUseUsageDescription: "Your location is used to mark attendance and client visits.",
        NSLocationAlwaysAndWhenInUseUsageDescription: "While you are checked in, your location is shared with your manager to track field visits. Tracking stops when you check out.",
        NSCameraUsageDescription: "The camera is used for your check-in selfie and visit photos.",
      },
    },
    plugins: [
      "expo-secure-store",
      ["expo-location", {
        locationAlwaysAndWhenInUsePermission: "While you are checked in, your location is shared with your manager to track field visits. Tracking stops when you check out.",
        isAndroidBackgroundLocationEnabled: true,
        isAndroidForegroundServiceEnabled: true,
      }],
      ["expo-image-picker", {
        cameraPermission: "The camera is used for your check-in selfie and visit photos.",
        photosPermission: false,
        microphonePermission: false,
      }],
      ["expo-build-properties", { android: { usesCleartextTraffic: API_BASE_URL.startsWith("http://") } }],
    ],
    extra: {
      apiBaseUrl: API_BASE_URL,
      eas: { projectId: process.env.EAS_PROJECT_ID },
    },
  },
};
