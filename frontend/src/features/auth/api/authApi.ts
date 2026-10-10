import type {
  AuthResponse,
  LoginPayload,
  RegisterPayload,
} from "@/features/auth/types";
import { apiClient } from "@/services/apiClient";
import { secureSession } from "@/services/secureSession";
import type { User } from "@/types/user";

interface MobileAuthResponse extends AuthResponse {
  refresh_token: string;
}

async function saveNativeResponse(
  result: MobileAuthResponse,
): Promise<AuthResponse> {
  // Failing closed: a native session is not established if the secret
  // cannot be encrypted in the Android Keystore.
  await secureSession.save(result.refresh_token);
  return result;
}

export const authApi = {
  async login(payload: LoginPayload): Promise<AuthResponse> {
    if (secureSession.isNative()) {
      const response = await apiClient.post<MobileAuthResponse>(
        "/auth/mobile/login", payload,
      );
      return saveNativeResponse(response.data);
    }
    const response = await apiClient.post<AuthResponse>(
      "/auth/login", payload,
    );
    return response.data;
  },

  async register(payload: RegisterPayload): Promise<AuthResponse> {
    if (secureSession.isNative()) {
      const response = await apiClient.post<MobileAuthResponse>(
        "/auth/mobile/register", payload,
      );
      return saveNativeResponse(response.data);
    }
    const response = await apiClient.post<AuthResponse>(
      "/auth/register", payload,
    );
    return response.data;
  },

  async refresh(): Promise<AuthResponse> {
    if (secureSession.isNative()) {
      const refreshToken = await secureSession.read();
      if (!refreshToken) throw new Error("No native session");
      const response = await apiClient.post<MobileAuthResponse>(
        "/auth/mobile/refresh", { refresh_token: refreshToken },
      );
      return saveNativeResponse(response.data);
    }
    const response = await apiClient.post<AuthResponse>(
      "/auth/refresh",
    );
    return response.data;
  },

  async me(): Promise<User> {
    const response = await apiClient.get<User>("/users/me");
    return response.data;
  },

  async logout(): Promise<void> {
    if (secureSession.isNative()) {
      const refreshToken = await secureSession.read();
      // Clear locally even if Render is asleep; revoke remotely best-effort.
      await secureSession.clear();
      if (refreshToken) {
        await apiClient.post("/auth/mobile/logout", {
          refresh_token: refreshToken,
        }, { timeout: 12_000 });
      }
      return;
    }
    await apiClient.post("/auth/logout", undefined, { timeout: 12_000 });
  },
};
