package com.himesh4141.cropguard;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.PluginMethod;

import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

@CapacitorPlugin(name = "SecureSession")
public class SecureSessionPlugin extends Plugin {
    private static final String KEY_ALIAS = "cropguard_refresh_key_v1";
    private static final String PREFS = "cropguard_secure_session_v1";
    private static final String DATA = "encrypted_refresh";
    private static final String IV = "nonce";

    private SharedPreferences prefs() {
        return getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    private SecretKey key() throws Exception {
        KeyStore store = KeyStore.getInstance("AndroidKeyStore");
        store.load(null);
        KeyStore.Entry existing = store.getEntry(KEY_ALIAS, null);
        if (existing instanceof KeyStore.SecretKeyEntry) {
            return ((KeyStore.SecretKeyEntry) existing).getSecretKey();
        }
        KeyGenerator generator = KeyGenerator.getInstance(
            KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
        generator.init(new KeyGenParameterSpec.Builder(
            KEY_ALIAS, KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setKeySize(256)
            .build());
        return generator.generateKey();
    }

    @PluginMethod
    public void save(PluginCall call) {
        String token = call.getString("refreshToken");
        if (token == null || token.isEmpty() || token.length() > 4096) {
            call.reject("Invalid session token");
            return;
        }
        try {
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, key());
            byte[] encrypted = cipher.doFinal(token.getBytes(StandardCharsets.UTF_8));
            boolean ok = prefs().edit()
                .putString(DATA, Base64.encodeToString(encrypted, Base64.NO_WRAP))
                .putString(IV, Base64.encodeToString(cipher.getIV(), Base64.NO_WRAP))
                .commit();
            if (!ok) throw new IllegalStateException("Session not saved");
            call.resolve();
        } catch (Exception e) {
            call.reject("Secure session storage failed");
        }
    }

    @PluginMethod
    public void read(PluginCall call) {
        JSObject output = new JSObject();
        String encrypted = prefs().getString(DATA, null);
        String nonce = prefs().getString(IV, null);
        if (encrypted == null || nonce == null) {
            call.resolve(output);
            return;
        }
        try {
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, key(),
                new GCMParameterSpec(128, Base64.decode(nonce, Base64.NO_WRAP)));
            byte[] plain = cipher.doFinal(Base64.decode(encrypted, Base64.NO_WRAP));
            output.put("refreshToken", new String(plain, StandardCharsets.UTF_8));
            call.resolve(output);
        } catch (Exception e) {
            // Device restore, invalidated Keystore key, or corruption: fail closed.
            prefs().edit().remove(DATA).remove(IV).commit();
            call.resolve(output);
        }
    }

    @PluginMethod
    public void clear(PluginCall call) {
        boolean ok = prefs().edit().remove(DATA).remove(IV).commit();
        if (ok) call.resolve();
        else call.reject("Could not clear stored session");
    }
}
