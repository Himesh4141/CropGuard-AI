import type {
  CapacitorConfig,
} from "@capacitor/cli";


const config: CapacitorConfig = {
  appId:
    "com.himesh4141.cropguard",

  appName:
    "CropGuard AI",

  webDir:
    "dist",

  server: {
    hostname:
      "localhost",

    androidScheme:
      "https",
  },
};


export default config;