plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")

    // Google services Gradle plugin (Firebase)
    id("com.google.gms.google-services")
}

android {
    namespace = "com.firegasdetector.app"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.firegasdetector.app"
        minSdk = 24
        targetSdk = 35
        versionCode = 1
        versionName = "1.0"
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    // Firebase BoM — versi library Firebase otomatis kompatibel
    implementation(platform("com.google.firebase:firebase-bom:34.14.0"))

    // Firebase products (tanpa versi eksplisit saat pakai BoM)
    implementation("com.google.firebase:firebase-analytics")

    // Tambahkan dependency Firebase lain di sini jika diperlukan:
    // implementation("com.google.firebase:firebase-auth")
    // implementation("com.google.firebase:firebase-database")
}
