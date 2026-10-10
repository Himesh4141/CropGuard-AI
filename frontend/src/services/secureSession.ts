import {
  Capacitor,
  registerPlugin,
} from "@capacitor/core";

interface NativeSessionPlugin {
  save(options: { refreshToken: string }): Promise<void>;
  read(): Promise<{ refreshToken?: string }>;
  clear(): Promise<void>;
}

const plugin = registerPlugin<NativeSessionPlugin>("SecureSession");

export const secureSession = {
  isNative(): boolean {
    return Capacitor.isNativePlatform();
  },

  async read(): Promise<string | null> {
    if (!Capacitor.isNativePlatform()) return null;
    const result = await plugin.read();
    return result.refreshToken ?? null;
  },

  async save(refreshToken: string): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    if (!refreshToken) throw new Error("Missing native refresh token");
    await plugin.save({ refreshToken });
  },

  async clear(): Promise<void> {
    if (Capacitor.isNativePlatform()) await plugin.clear();
  },
};
