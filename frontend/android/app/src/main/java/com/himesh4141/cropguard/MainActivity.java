package com.himesh4141.cropguard;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(SecureSessionPlugin.class);
        registerPlugin(CropGuardGooglePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
