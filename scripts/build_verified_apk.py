"""Build one release APK with the existing key; never create or replace keys.

Usage: python scripts/build_verified_apk.py --output-dir PATH [--gui-password]
The password is entered locally, never passed as a command-line argument.
Run the documented frontend/backend checks before this release step.
"""

from __future__ import annotations

import argparse
import getpass
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import zipfile
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FRONTEND = ROOT / "frontend"
ANDROID = FRONTEND / "android"
KEY = Path.home() / "CropGuard-Private-Signing-Keys/cropguard-upload-key.p12"
EXPECTED_CERT = "0e6ae67fe3599f1c5f59dfc245278366c2da33b509f56dc7db6a189a6497366d"
API = "https://cropguard-api-himesh4141.onrender.com/api/v1"
SECRET_NAMES = (
    "CROPGUARD_RELEASE_STORE_PASSWORD",
    "CROPGUARD_RELEASE_KEY_PASSWORD",
    "CROPGUARD_RELEASE_KEYSTORE",
    "CROPGUARD_RELEASE_KEY_ALIAS",
)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", required=True, type=Path)
    parser.add_argument("--gui-password", action="store_true")
    args = parser.parse_args()
    output = args.output_dir.resolve()
    output.mkdir(parents=True, exist_ok=True)
    log_file = output / "apk-build.log"
    log_file.write_text("CropGuard local verified release build\n", encoding="utf-8")

    def log(message):
        print(message, flush=True)
        with log_file.open("a", encoding="utf-8") as stream:
            stream.write(message + "\n")

    clean_env = {k: v for k, v in os.environ.items() if k not in SECRET_NAMES}
    # This project's Gradle 8.2.1 uses the installed Java 17 runtime.
    java = Path(r"C:\Program Files\Eclipse Adoptium\jdk-17.0.20.101-hotspot")
    sdk = Path(
        os.environ.get("ANDROID_HOME", str(Path.home() / "AppData/Local/Android/Sdk"))
    )
    build_tools = sdk / "build-tools/36.0.0"
    for path in [
        KEY,
        java / "bin/java.exe",
        build_tools / "apksigner.bat",
        ANDROID / "gradlew.bat",
    ]:
        if not path.is_file():
            raise RuntimeError(f"Required existing file missing: {path}")
    clean_env.update(
        JAVA_HOME=str(java), ANDROID_HOME=str(sdk), ANDROID_SDK_ROOT=str(sdk)
    )
    clean_env["PATH"] = str(java / "bin") + os.pathsep + clean_env.get("PATH", "")

    def run(command, cwd=ROOT, env=None, record=True):
        result = subprocess.run(
            [str(x) for x in command],
            check=False,
            cwd=cwd,
            env=env or clean_env,
            text=True,
            encoding="utf-8",
            errors="replace",
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
        )
        if record:
            log(result.stdout)
        if result.returncode:
            raise RuntimeError(
                f"{Path(str(command[0])).name} failed (exit {result.returncode}). "
                + (
                    "See apk-build.log."
                    if record
                    else "Check the signing password/key."
                )
            )
        return result.stdout

    old_apk = ROOT / "CropGuard-Releases/CropGuard-AI-v1.0.7-release.apk"
    previous = run(
        [
            build_tools / "apksigner.bat",
            "verify",
            "--verbose",
            "--print-certs",
            old_apk,
        ],
        record=False,
    )
    if EXPECTED_CERT not in previous.lower():
        raise RuntimeError(
            "Existing APK signer does not match the expected release certificate"
        )
    gradle = ANDROID / "app/build.gradle"
    gradle_text = gradle.read_text(encoding="utf-8-sig")
    if (
        'applicationId "com.himesh4141.cropguard"' not in gradle_text
        or 'versionName "1.0.7"' not in gradle_text
    ):
        raise RuntimeError("Unexpected package/version; review before building")
    # Code 9 upgrades the locally present code 8 APK. Never overwrite that APK.
    code = int(re.search(r"versionCode\s+(\d+)", gradle_text)[1])
    if code not in (8, 9):
        raise RuntimeError(f"Unexpected existing versionCode {code}")
    target = output / "CropGuard-AI-v1.0.7-build9-release.apk"
    if target.exists():
        raise RuntimeError("Verified target APK already exists; refusing to overwrite")

    frontend_env = dict(clean_env, VITE_API_BASE_URL=API, VITE_APP_ENV="production")
    run(["npm.cmd", "run", "build", "--", "--base=./"], cwd=FRONTEND, env=frontend_env)
    bundle = "\n".join(
        p.read_text(encoding="utf-8") for p in (FRONTEND / "dist/assets").glob("*.js")
    )
    if API not in bundle or "http://localhost:8000/api/v1" in bundle:
        raise RuntimeError("Unexpected API configuration in built JavaScript")
    run(
        ["npx.cmd", "--no-install", "cap", "sync", "android"],
        cwd=FRONTEND,
        env=frontend_env,
    )

    if args.gui_password:
        import tkinter as tk
        from tkinter import simpledialog

        root = tk.Tk()
        root.withdraw()
        root.attributes("-topmost", True)
        secret = simpledialog.askstring(
            "CropGuard APK signing",
            "Enter the EXISTING CropGuard release-key password.\nIt stays in this process and is never saved to disk.",
            show="*",
            parent=root,
        )
        root.destroy()
    else:
        secret = getpass.getpass("Existing CropGuard release-key password (hidden): ")
    if not secret:
        raise RuntimeError("Signing canceled; no APK built")

    signing_env = dict(clean_env)
    signing_env.update(
        CROPGUARD_RELEASE_KEYSTORE=str(KEY),
        CROPGUARD_RELEASE_STORE_PASSWORD=secret,
        CROPGUARD_RELEASE_KEY_PASSWORD=secret,
        CROPGUARD_RELEASE_KEY_ALIAS="cropguardrelease",
    )
    listing = run(
        [
            java / "bin/keytool.exe",
            "-list",
            "-v",
            "-keystore",
            KEY,
            "-storepass:env",
            "CROPGUARD_RELEASE_STORE_PASSWORD",
            "-alias",
            "cropguardrelease",
        ],
        env=signing_env,
        record=False,
    )
    if EXPECTED_CERT not in listing.lower().replace(":", ""):
        raise RuntimeError(
            "Signing key certificate does not match the installed release lineage"
        )
    del listing, secret
    log("Existing signing key verified; password not logged.")
    backup = (
        ROOT
        / ".cropguard-backups"
        / ("apk-build-" + datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S"))
    )
    backup.mkdir(parents=True, exist_ok=False)
    shutil.copy2(gradle, backup / "build.gradle")
    shutil.copy2(old_apk, backup / old_apk.name)
    gradle.write_text(
        re.sub(r"versionCode\s+\d+", "versionCode 9", gradle_text), encoding="utf-8"
    )
    log("Preserved previous APK and Gradle configuration: " + str(backup))
    try:
        # One batched APK task; no clean, AAB, or repeated release builds.
        run(
            [ANDROID / "gradlew.bat", "--no-daemon", "assembleRelease"],
            cwd=ANDROID,
            env=signing_env,
        )
    finally:
        for key in SECRET_NAMES:
            signing_env.pop(key, None)
    apk = ANDROID / "app/build/outputs/apk/release/app-release.apk"
    signature = run(
        [build_tools / "apksigner.bat", "verify", "--verbose", "--print-certs", apk],
        record=False,
    )
    if (
        EXPECTED_CERT not in signature.lower()
        or "Verified using v2 scheme (APK Signature Scheme v2): true" not in signature
    ):
        raise RuntimeError("APK signer or whole-file signature verification failed")
    metadata = run([build_tools / "aapt.exe", "dump", "badging", apk], record=False)
    if (
        not re.search(
            r"package: name='com.himesh4141.cropguard' versionCode='9' versionName='1.0.7'",
            metadata,
        )
        or "application-debuggable" in metadata
    ):
        raise RuntimeError("APK version/package/debug configuration is incorrect")
    manifest = run(
        [build_tools / "aapt.exe", "dump", "xmltree", apk, "AndroidManifest.xml"],
        record=False,
    )
    if not re.search(r"usesCleartextTraffic.*0x0\b", manifest) or not re.search(
        r"allowBackup.*0x0\b", manifest
    ):
        raise RuntimeError(
            "APK network/backup settings differ from the reviewed configuration"
        )
    with zipfile.ZipFile(apk) as archive:
        for name in archive.namelist():
            if name.endswith((".p12", ".keystore", ".jks", ".env")):
                raise RuntimeError("Private artifact unexpectedly bundled")
        for source in (FRONTEND / "dist").rglob("*"):
            if source.is_file():
                packaged = (
                    "assets/public/" + source.relative_to(FRONTEND / "dist").as_posix()
                )
                if archive.read(packaged) != source.read_bytes():
                    raise RuntimeError(
                        "Bundled assets do not match verified frontend: " + packaged
                    )
    shutil.copy2(apk, target)
    digest = hashlib.sha256(target.read_bytes()).hexdigest()
    (output / "SHA256SUMS.txt").write_text(
        f"{digest}  {target.name}\n", encoding="utf-8"
    )
    (output / "apk-verification.json").write_text(
        json.dumps(
            {
                "apk": target.name,
                "sha256": digest,
                "package": "com.himesh4141.cropguard",
                "versionName": "1.0.7",
                "versionCode": 9,
                "certificate_sha256": EXPECTED_CERT,
                "signature_verified": True,
                "v2_signature": True,
                "frontend_assets_match": True,
                "debuggable": False,
                "cleartext_traffic": False,
                "backup": str(backup),
                "device_install_test": "not performed",
                "deployment": "local artifact only",
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    log("SUCCESS: " + str(target))
    log("SHA256: " + digest)


if __name__ == "__main__":
    # Windows redirected consoles may default to a legacy code page while
    # npm/Gradle emit Unicode; logging must never abort an otherwise good build.
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    try:
        main()
    except (RuntimeError, OSError, ValueError, KeyError, zipfile.BadZipFile) as exc:
        print("Release stopped: " + str(exc), file=sys.stderr, flush=True)
        sys.exit(1)
