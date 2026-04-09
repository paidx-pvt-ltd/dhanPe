package com.example.dhanpe

import android.content.pm.ApplicationInfo
import android.app.KeyguardManager
import android.os.Build
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.embedding.android.FlutterActivity
import io.flutter.plugin.common.MethodChannel
import java.io.File

class MainActivity : FlutterActivity() {
    private val securityChannel = "dhanpe/device_security"
    private val trustedInstallers = setOf(
        "com.android.vending",
        "com.google.android.feedback",
        "com.android.packageinstaller",
        "com.google.android.packageinstaller"
    )

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, securityChannel)
            .setMethodCallHandler { call, result ->
                when (call.method) {
                    "assessDeviceSecurity" -> {
                        result.success(
                            mapOf(
                                "deviceLockEnabled" to isDeviceLockEnabled(),
                                "deviceCompromised" to isDeviceCompromised(),
                                "installerTrusted" to isInstallerTrusted(),
                            )
                        )
                    }
                    else -> result.notImplemented()
                }
            }
    }

    private fun isDeviceLockEnabled(): Boolean {
        val keyguardManager = getSystemService(KEYGUARD_SERVICE) as? KeyguardManager
        return keyguardManager?.isDeviceSecure == true
    }

    private fun isInstallerTrusted(): Boolean {
        val isDebuggable = (applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE) != 0
        if (isDebuggable) {
            return true
        }

        val installerPackage = packageManager.getInstallerPackageName(packageName)
            ?: return false
        return trustedInstallers.contains(installerPackage)
    }

    private fun isDeviceCompromised(): Boolean {
        return hasTestKeys() || hasRootManagementApps() || hasSuBinary()
    }

    private fun hasTestKeys(): Boolean {
        return Build.TAGS?.contains("test-keys") == true
    }

    private fun hasSuBinary(): Boolean {
        val knownPaths = listOf(
            "/system/bin/su",
            "/system/xbin/su",
            "/sbin/su",
            "/vendor/bin/su",
            "/su/bin/su",
        )
        return knownPaths.any { File(it).exists() }
    }

    private fun hasRootManagementApps(): Boolean {
        val packages = listOf(
            "com.topjohnwu.magisk",
            "eu.chainfire.supersu",
            "com.koushikdutta.superuser",
            "com.thirdparty.superuser",
        )
        return packages.any { packageName ->
            runCatching {
                packageManager.getPackageInfo(packageName, 0)
            }.isSuccess
        }
    }
}
