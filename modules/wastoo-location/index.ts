import { requireOptionalNativeModule } from "expo-modules-core";

export type NativeDeviceLocation = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
  timestamp: number;
  provider: string;
};

export type NativeLocationStatus = {
  gpsAvailable: boolean;
  gpsEnabled: boolean;
  networkAvailable: boolean;
  networkEnabled: boolean;
  passiveAvailable: boolean;
  passiveEnabled: boolean;
  locationServicesEnabled: boolean;
};

export type WastooLocationModuleType = {
  getProviderStatus(): Promise<NativeLocationStatus>;
  getLastKnownPosition(): Promise<NativeDeviceLocation | null>;
  getCurrentPosition(
    requestId: string,
    timeoutMillis: number
  ): Promise<NativeDeviceLocation>;
  cancelCurrentPosition(requestId: string): void;
};

const nativeModule = requireOptionalNativeModule<WastooLocationModuleType>(
  "WastooLocation"
);

export class WastooLocationModuleUnavailableError extends Error {
  readonly code = "NATIVE_MODULE_UNAVAILABLE";

  constructor() {
    super(
      "The Wastoo Android LocationManager module is not present in this app build. Rebuild and install the Android development client."
    );
    this.name = "WastooLocationModuleUnavailableError";
  }
}

export function requireWastooLocationModule(): WastooLocationModuleType {
  if (!nativeModule) {
    throw new WastooLocationModuleUnavailableError();
  }
  return nativeModule;
}

export default nativeModule;
