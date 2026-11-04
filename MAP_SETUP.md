# Android maps and location

## Renderer and provider

Wastoo uses `@maplibre/maplibre-react-native` (the lockfile resolves version
11.5.0) with its Expo config plugin. The map style is MapTiler Streets v2:

```text
https://api.maptiler.com/maps/streets-v2/style.json?key=<EXPO_PUBLIC_MAPTILER_API_KEY>
```

This is a hosted production style, not MapLibre demo tiles or the public
OpenStreetMap raster tile service. MapLibre renders the map and its markers. On Android, the local
`wastoo-location` Expo module uses Android's `LocationManager` directly
(GPS, network, and passive providers) for foreground location; it does not
request a coordinate from Google's fused location service. On iOS, the app
continues to use Expo Location. Map attribution is enabled.

The app's Google Services file and Google Services Gradle plugin are retained
for the existing authentication/Firebase integration. There is no
`react-native-maps` or Google Maps Android SDK dependency for map rendering.

## MapTiler key

Create a MapTiler Cloud account and a dedicated API key for the Wastoo mobile
app. MapTiler's plan, quota, and billing terms apply; review the account's
current plan before production use and monitor its analytics/usage limits.

The map style is requested directly from the installed app, so its API key is
necessarily visible in the app bundle and network requests. Set it as
`EXPO_PUBLIC_MAPTILER_API_KEY`; do not put a private server token or other
server credential in this variable. Use a separate key for this app, rotate it
if exposed, and configure provider-side usage/security controls supported for
the native MapLibre request. MapTiler recommends an Allowed User-Agent rule
for native apps; MapLibre React Native does not expose a custom User-Agent
setting in its JavaScript map API, so verify the native request header before
applying that restriction. An API key is required; without one the app shows a
configuration message instead of silently falling back to public demo tiles.

For local development, add the key to `.env` and keep that file out of source
control. If `.env` does not exist yet, create it from the example without
overwriting an existing local environment file:

```powershell
Set-Location C:\Users\lenovo\shared-projects\Wastoo\mobile
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
notepad .env
```

Replace the placeholder with the MapTiler key. For EAS, add
`EXPO_PUBLIC_MAPTILER_API_KEY` to the development (and separately, any
preview/production) environment in the Expo project's environment-variable
settings before building.

## Android configuration and build

The Expo config enables the MapLibre plugin and requests foreground-only
location permission. Android includes `ACCESS_COARSE_LOCATION`,
`ACCESS_FINE_LOCATION`, and `INTERNET`; no background location permission or
Google Maps API key is required. New Architecture is enabled consistently in
Expo and the generated Gradle properties because this project's Reanimated 4
dependency requires it. The installed MapLibre 11.5.0 native package is used
with its Expo config plugin. The local Android Expo module is autolinked from
`modules/wastoo-location`; it has no Google Play services dependency. The
`expo-location` package remains installed for iOS, but the Android location
hook does not call its fused-provider implementation.

After setting the MapTiler key in `.env`, run these commands from PowerShell:

```powershell
Set-Location C:\Users\lenovo\shared-projects\Wastoo\mobile
npx expo prebuild --platform android
npx expo run:android
```

This regenerates/synchronizes the native Android project and builds/installs the
development app on a connected device or emulator. To build the debug APK
without installing it:

```powershell
Set-Location C:\Users\lenovo\shared-projects\Wastoo\mobile
.\android\gradlew.bat -p .\android :app:assembleDebug
```

The APK is written to
`android\app\build\outputs\apk\debug\app-debug.apk`.

For an internal EAS development-client APK, first configure the EAS development
environment variable above, then run:

```powershell
Set-Location C:\Users\lenovo\shared-projects\Wastoo\mobile
npx eas-cli@latest build --platform android --profile development
```

MapLibre, the local `LocationManager` module, and the Android
permission/architecture settings are native, so those changes require a new
development APK. The MapTiler key is read by the
JavaScript bundle: for an EAS development client, also run Metro with the key
available in its environment (or in the local `.env` file):

```powershell
Set-Location C:\Users\lenovo\shared-projects\Wastoo\mobile
npx expo start --dev-client
```

Changing only the MapTiler key requires re-bundling/reloading JavaScript, not a
native APK rebuild. If Android reports that the Wastoo LocationManager module
is missing, install a newly rebuilt development APK; restarting Metro cannot
add native code to an already-installed client.

## Physical Android GPS test

1. Configure the MapTiler key, install the newly built development APK on a
   physical Android phone, and start Metro as above. Connect the phone to the
   internet and the development server.
2. In Android Settings, enable **Location**. For a first location fix, test
   outdoors or near a window.
3. Open Wastoo's collector map in Algeria. Before a GPS fix, it should show an
   Algeria overview rather than an arbitrary city. Nearby pickup/center queries
   start only after a validated device coordinate is available.
4. Grant Wastoo foreground location permission. Confirm the map animates to
   the phone's actual position, the blue user-location indicator is present,
   and the `GPS latitude, longitude` badge shows coordinates matching the
   phone's location (in Algeria, generally within about latitude 19–37 and
   longitude -9–12). Do not use the fact that map tiles rendered as evidence
   that GPS worked.
5. Confirm streets, labels, and buildings load. The map attribution control
   should be visible. Check MapTiler usage/analytics if tiles do not load.
6. Move to a different location or wait for a fresh fix, then press the
   crosshair recenter button. Confirm both the displayed coordinates and camera
   update; the button obtains a current position rather than reusing a fixed
   camera coordinate.
7. Deny location permission. Confirm the map stays on the Algeria overview,
   explains that permission is needed for nearby pickups, and offers a retry.
   If Android no longer offers the prompt, use the displayed Settings action,
   grant permission in app settings, return to Wastoo, and retry.
8. Turn Android Location off and retry. Confirm Wastoo explains how to turn
   device Location back on and remains usable without pretending the overview
   is the user's current position.
9. With location enabled, select existing recycling pickup and center markers.
   Confirm their previews, detail navigation, and route/request-pickup actions
   still work after panning and recentering.

Expo Location and the map-style API key changes are not verified on a physical
device by a successful TypeScript/build check alone. Complete the test above
with a real phone and compare the displayed coordinates to its actual
location.
