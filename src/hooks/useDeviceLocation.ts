import { useCallback, useEffect, useRef, useState } from "react";
import {
  PermissionsAndroid,
  Platform,
} from "react-native";
import * as Location from "expo-location";
import NativeWastooLocation, {
  requireWastooLocationModule,
  type NativeDeviceLocation,
  type NativeLocationStatus,
} from "../../modules/wastoo-location";

export type LocationIssue =
  | "permission-denied"
  | "permission-blocked"
  | "services-disabled"
  | "gps-disabled"
  | "provider-unavailable"
  | "timeout"
  | "native-module-unavailable"
  | "service-failure"
  | "unavailable";

type DeviceLocationState = {
  location: Location.LocationObject | null;
  issue: LocationIssue | null;
  isLoading: boolean;
};

const LAST_KNOWN_MAX_AGE_MS = 120_000;
const LOCATION_REQUEST_TIMEOUT_MS = 25_000;

function isValidLocation(
  location: Location.LocationObject | null | undefined
): location is Location.LocationObject {
  if (!location) return false;

  const { latitude, longitude } = location.coords;
  return (
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function fromNativeLocation(
  result: NativeDeviceLocation
): Location.LocationObject | null {
  if (
    !Number.isFinite(result.latitude) ||
    result.latitude < -90 ||
    result.latitude > 90 ||
    !Number.isFinite(result.longitude) ||
    result.longitude < -180 ||
    result.longitude > 180 ||
    !Number.isFinite(result.timestamp)
  ) {
    return null;
  }

  return {
    coords: {
      latitude: result.latitude,
      longitude: result.longitude,
      accuracy:
        typeof result.accuracy === "number" &&
        Number.isFinite(result.accuracy) &&
        result.accuracy >= 0
          ? result.accuracy
          : null,
      altitude:
        typeof result.altitude === "number" &&
        Number.isFinite(result.altitude)
          ? result.altitude
          : null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
    },
    timestamp: result.timestamp,
    mocked: false,
  };
}

function isRecent(location: Location.LocationObject): boolean {
  return (
    location.timestamp <= Date.now() + 60_000 &&
    Date.now() - location.timestamp <= LAST_KNOWN_MAX_AGE_MS
  );
}

function getNativeLocationIssue(error: unknown): LocationIssue {
  const nativeError = error as { code?: string; message?: string };
  const code = nativeError?.code;

  switch (code) {
    case "PERMISSION_DENIED":
    case "permission-denied":
      return "permission-denied";
    case "permission-blocked":
      return "permission-blocked";
    case "LOCATION_SERVICES_DISABLED":
      return "services-disabled";
    case "GPS_DISABLED":
      return "gps-disabled";
    case "PROVIDER_UNAVAILABLE":
      return "provider-unavailable";
    case "LOCATION_TIMEOUT":
      return "timeout";
    case "NATIVE_MODULE_UNAVAILABLE":
      return "native-module-unavailable";
    default:
      if (typeof nativeError?.message === "string") {
        return "service-failure";
      }
      return "unavailable";
  }
}

async function requestAndroidPermission(): Promise<LocationIssue | null> {
  const results = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
  ]);
  const fine = results[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
  const coarse = results[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION];

  if (
    fine === PermissionsAndroid.RESULTS.GRANTED ||
    coarse === PermissionsAndroid.RESULTS.GRANTED
  ) {
    return null;
  }

  if (
    fine === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN ||
    coarse === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN
  ) {
    return "permission-blocked";
  }
  return "permission-denied";
}

async function getAndroidLocation(
  requestId: string,
  isCurrentRequest: () => boolean,
  publishLastKnown: (location: Location.LocationObject) => void
): Promise<Location.LocationObject> {
  const nativeLocation = requireWastooLocationModule();

  const permissionIssue = await requestAndroidPermission();
  if (permissionIssue) {
    throw Object.assign(new Error(permissionIssue), { code: permissionIssue });
  }
  if (!isCurrentRequest()) {
    throw Object.assign(new Error("Location request was cancelled."), {
      code: "CANCELLED",
    });
  }

  const status: NativeLocationStatus =
    await nativeLocation.getProviderStatus();
  if (!isCurrentRequest()) {
    throw Object.assign(new Error("Location request was cancelled."), {
      code: "CANCELLED",
    });
  }
  if (!status.gpsAvailable && !status.networkAvailable) {
    throw Object.assign(new Error("No GPS or network location provider exists."), {
      code: "PROVIDER_UNAVAILABLE",
    });
  }
  if (!status.locationServicesEnabled) {
    throw Object.assign(new Error("Android Location is disabled."), {
      code: "LOCATION_SERVICES_DISABLED",
    });
  }

  let lastKnown: Location.LocationObject | null = null;
  try {
    const result = await nativeLocation.getLastKnownPosition();
    const normalized = result ? fromNativeLocation(result) : null;
    if (normalized && isRecent(normalized)) {
      lastKnown = normalized;
      if (isCurrentRequest()) publishLastKnown(normalized);
    }
  } catch (error) {
    console.warn("Could not read the last known Android location.", error);
  }

  if (!isCurrentRequest()) {
    throw Object.assign(new Error("Location request was cancelled."), {
      code: "CANCELLED",
    });
  }

  try {
    const result = await nativeLocation.getCurrentPosition(
      requestId,
      LOCATION_REQUEST_TIMEOUT_MS
    );
    const normalized = fromNativeLocation(result);
    if (!normalized || !isValidLocation(normalized)) {
      throw new Error("Android returned invalid location coordinates.");
    }
    return normalized;
  } catch (error) {
    if (lastKnown) throw Object.assign(error as Error, { lastKnown });
    throw error;
  }
}

async function getExpoLocation(
  publishLastKnown: (location: Location.LocationObject) => void
): Promise<Location.LocationObject> {
  let permission = await Location.getForegroundPermissionsAsync();
  if (permission.status !== "granted" && permission.canAskAgain) {
    permission = await Location.requestForegroundPermissionsAsync();
  }
  if (permission.status !== "granted") {
    throw Object.assign(new Error("Foreground location permission is required."), {
      code: permission.canAskAgain ? "permission-denied" : "permission-blocked",
    });
  }
  if (!(await Location.hasServicesEnabledAsync())) {
    throw Object.assign(new Error("Device location services are disabled."), {
      code: "LOCATION_SERVICES_DISABLED",
    });
  }

  try {
    const lastKnown = await Location.getLastKnownPositionAsync({
      maxAge: LAST_KNOWN_MAX_AGE_MS,
      requiredAccuracy: 2_000,
    });
    if (isValidLocation(lastKnown)) publishLastKnown(lastKnown);
  } catch (error) {
    console.warn("Could not read the last known device location.", error);
  }

  const current = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
    mayShowUserSettingsDialog: true,
  });
  if (!isValidLocation(current)) {
    throw new Error("The location provider returned invalid coordinates.");
  }
  return current;
}

export function getLocationIssueMessage(
  issue: LocationIssue,
  hasLocation: boolean
): string {
  switch (issue) {
    case "permission-denied":
      return "Location permission is required to find nearby pickups. Allow location access and retry.";
    case "permission-blocked":
      return "Location permission is blocked. Open Wastoo's app settings to allow location access.";
    case "services-disabled":
      return "Device Location is turned off. Enable Location in Android Quick Settings or Settings, then retry.";
    case "gps-disabled":
      return "GPS is turned off and no fresh network location was available. Enable GPS and retry.";
    case "provider-unavailable":
      return "This device has no available GPS or network location provider.";
    case "timeout":
      return "Android did not return a fresh location in time. Move outdoors and retry.";
    case "native-module-unavailable":
      return "This Android app build does not include Wastoo's native location module. Install a newly rebuilt development APK.";
    case "service-failure":
      return "Android could not read your location. Check Location settings and retry.";
    case "unavailable":
      return hasLocation
        ? "Couldn't refresh GPS. Showing the last known position; retry to update it."
        : "Couldn't determine your GPS position. Check device Location, move outdoors, and retry.";
  }
}

export function useDeviceLocation() {
  const [state, setState] = useState<DeviceLocationState>({
    location: null,
    issue: null,
    isLoading: true,
  });
  const mountedRef = useRef(false);
  const requestIdRef = useRef(0);
  const nativeRequestIdRef = useRef<string | null>(null);

  const requestLocation = useCallback(async () => {
    const previousNativeRequest = nativeRequestIdRef.current;
    if (Platform.OS === "android" && previousNativeRequest) {
      NativeWastooLocation?.cancelCurrentPosition(previousNativeRequest);
    }

    const requestId = ++requestIdRef.current;
    const nativeRequestId = `wastoo-location-${requestId}`;
    nativeRequestIdRef.current = nativeRequestId;
    const isCurrentRequest = () =>
      mountedRef.current && requestIdRef.current === requestId;

    setState((current) => ({ ...current, issue: null, isLoading: true }));

    const publishLastKnown = (location: Location.LocationObject) => {
      if (isCurrentRequest()) {
        setState((current) => ({
          ...current,
          location,
          issue: null,
          isLoading: true,
        }));
      }
    };

    try {
      const location =
        Platform.OS === "android"
          ? await getAndroidLocation(
              nativeRequestId,
              isCurrentRequest,
              publishLastKnown
            )
          : await getExpoLocation(publishLastKnown);

      if (isCurrentRequest()) {
        setState({ location, issue: null, isLoading: false });
      }
      return location;
    } catch (error) {
      const lastKnown = (error as { lastKnown?: Location.LocationObject })
        ?.lastKnown;
      const issue = getNativeLocationIssue(error);

      if (isCurrentRequest()) {
        setState((current) => ({
          location: lastKnown ?? (Platform.OS === "ios" ? current.location : null),
          issue,
          isLoading: false,
        }));
      }
      if (
        isCurrentRequest() &&
        (issue === "native-module-unavailable" ||
          issue === "service-failure" ||
          issue === "unavailable")
      ) {
        console.warn("Could not acquire the current device location.", error);
      }
      return lastKnown ?? null;
    } finally {
      if (nativeRequestIdRef.current === nativeRequestId) {
        nativeRequestIdRef.current = null;
      }
      if (isCurrentRequest()) {
        setState((current) => ({ ...current, isLoading: false }));
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void requestLocation();

    return () => {
      mountedRef.current = false;
      requestIdRef.current += 1;
      const requestId = nativeRequestIdRef.current;
      nativeRequestIdRef.current = null;
      if (Platform.OS === "android" && requestId) {
        NativeWastooLocation?.cancelCurrentPosition(requestId);
      }
    };
  }, [requestLocation]);

  return {
    ...state,
    requestLocation,
  };
}
