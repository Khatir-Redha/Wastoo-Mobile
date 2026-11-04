package expo.modules.wastoolocation

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import androidx.core.content.ContextCompat
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class WastooLocationModule : Module() {
  private val mainHandler = Handler(Looper.getMainLooper())
  private val requests = mutableMapOf<String, LocationRequestSession>()

  override fun definition() = ModuleDefinition {
    Name("WastooLocation")

    AsyncFunction("getProviderStatus") {
      val manager = locationManager()
      val providers = manager.allProviders.toSet()
      val gpsAvailable = LocationManager.GPS_PROVIDER in providers
      val networkAvailable = LocationManager.NETWORK_PROVIDER in providers
      val passiveAvailable = LocationManager.PASSIVE_PROVIDER in providers
      val gpsEnabled = isProviderEnabled(manager, LocationManager.GPS_PROVIDER)
      val networkEnabled = isProviderEnabled(manager, LocationManager.NETWORK_PROVIDER)
      val passiveEnabled = isProviderEnabled(manager, LocationManager.PASSIVE_PROVIDER)

      mapOf(
        "gpsAvailable" to gpsAvailable,
        "gpsEnabled" to gpsEnabled,
        "networkAvailable" to networkAvailable,
        "networkEnabled" to networkEnabled,
        "passiveAvailable" to passiveAvailable,
        "passiveEnabled" to passiveEnabled,
        "locationServicesEnabled" to (gpsEnabled || networkEnabled || passiveEnabled)
      )
    }

    AsyncFunction("getLastKnownPosition") {
      requireForegroundPermission()
      val manager = locationManager()
      val providers = listOf(
        LocationManager.GPS_PROVIDER,
        LocationManager.NETWORK_PROVIDER,
        LocationManager.PASSIVE_PROVIDER
      )

      providers
        .filter { it in manager.allProviders }
        .mapNotNull { provider ->
          try {
            manager.getLastKnownLocation(provider)
          } catch (_: SecurityException) {
            null
          }
        }
        .maxWithOrNull(
          compareBy<Location> { it.time }.thenByDescending { it.accuracy }
        )
        ?.let(::locationToMap)
    }

    AsyncFunction("getCurrentPosition") { requestId: String, timeoutMillis: Double, promise: expo.modules.kotlin.Promise ->
      val timeout = timeoutMillis.toLong().coerceIn(1_000L, MAX_TIMEOUT_MILLIS)
      mainHandler.post {
        startLocationRequest(requestId, timeout, promise)
      }
    }

    Function("cancelCurrentPosition") { requestId: String ->
      mainHandler.post { finishRequest(requestId, errorCode = "CANCELLED") }
    }

    OnDestroy {
      mainHandler.post {
        requests.keys.toList().forEach { finishRequest(it, errorCode = "CANCELLED") }
      }
    }
  }

  @SuppressLint("MissingPermission")
  private fun startLocationRequest(
    requestId: String,
    timeoutMillis: Long,
    promise: expo.modules.kotlin.Promise
  ) {
    finishRequest(requestId, errorCode = "CANCELLED")

    if (!hasForegroundPermission()) {
      promise.reject("PERMISSION_DENIED", "Foreground location permission is required.", null)
      return
    }

    val manager = try {
      locationManager()
    } catch (error: Exception) {
      promise.reject("LOCATION_SERVICE_FAILURE", error.message, error)
      return
    }

    val available = manager.allProviders.toSet()
    val gpsAvailable = LocationManager.GPS_PROVIDER in available
    val networkAvailable = LocationManager.NETWORK_PROVIDER in available
    val gpsEnabled = isProviderEnabled(manager, LocationManager.GPS_PROVIDER)
    val enabledProviders = listOf(
      LocationManager.GPS_PROVIDER,
      LocationManager.NETWORK_PROVIDER,
      LocationManager.PASSIVE_PROVIDER
    ).filter { provider ->
      provider in available && isProviderEnabled(manager, provider)
    }

    if (enabledProviders.isEmpty()) {
      val errorCode = if (!gpsAvailable && !networkAvailable) {
        "PROVIDER_UNAVAILABLE"
      } else {
        "LOCATION_SERVICES_DISABLED"
      }
      promise.reject(errorCode, "No Android location provider is currently enabled.", null)
      return
    }

    val session = LocationRequestSession(
      requestId,
      manager,
      promise,
      gpsAvailable,
      gpsEnabled,
      System.currentTimeMillis()
    )
    requests[requestId] = session
    session.timeout = Runnable {
      if (session.bestLocation != null) {
        finishRequest(requestId, location = session.bestLocation)
      } else {
        finishRequest(
          requestId,
          errorCode = when {
            session.gpsAvailable && !session.gpsEnabled -> "GPS_DISABLED"
            else -> "LOCATION_TIMEOUT"
          }
        )
      }
    }
    mainHandler.postDelayed(session.timeout!!, timeoutMillis)

    for (provider in enabledProviders) {
      val listener = object : LocationListener {
        override fun onLocationChanged(location: Location) {
          if (
            requests[requestId] !== session ||
            location.time < session.startedAt - FRESH_LOCATION_TOLERANCE_MILLIS ||
            !isValid(location)
          ) return
          val currentBest = session.bestLocation
          if (currentBest == null || isBetterLocation(location, currentBest)) {
            session.bestLocation = location
          }

          val best = session.bestLocation ?: return
          if (best.accuracy <= DESIRED_ACCURACY_METERS) {
            finishRequest(requestId, location = best)
          }
        }

        @Deprecated("Deprecated in Android")
        override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) = Unit

        override fun onProviderEnabled(provider: String) = Unit

        override fun onProviderDisabled(provider: String) {
          if (requests[requestId] !== session) return
          val anyProviderEnabled = enabledProviders.any {
            isProviderEnabled(manager, it)
          }
          if (!anyProviderEnabled) {
            finishRequest(
              requestId,
              errorCode = when {
                session.gpsAvailable && !session.gpsEnabled -> "GPS_DISABLED"
                else -> "LOCATION_SERVICES_DISABLED"
              }
            )
          }
        }
      }

      try {
        manager.requestLocationUpdates(provider, 0L, 0f, listener, Looper.getMainLooper())
        session.listeners.add(listener)
      } catch (_: SecurityException) {
        finishRequest(
          requestId,
          errorCode = "PERMISSION_DENIED",
          message = "Location permission was revoked during the request."
        )
        return
      } catch (error: Exception) {
        session.providerErrors.add(error)
      }
    }

    if (session.listeners.isEmpty()) {
      finishRequest(
        requestId,
        errorCode = "LOCATION_SERVICE_FAILURE",
        message = "Android could not start any enabled location provider.",
        cause = session.providerErrors.firstOrNull()
      )
    }
  }

  private fun finishRequest(
    requestId: String,
    location: Location? = null,
    errorCode: String? = null,
    message: String? = null,
    cause: Throwable? = null
  ) {
    val session = requests.remove(requestId) ?: return
    session.timeout?.let(mainHandler::removeCallbacks)
    session.listeners.forEach { listener ->
      try {
        session.manager.removeUpdates(listener)
      } catch (_: SecurityException) {
        // Permission may have been revoked while the provider was active.
      } catch (_: IllegalArgumentException) {
        // The listener may already have been removed by the platform.
      }
    }

    when {
      location != null -> session.promise.resolve(locationToMap(location))
      errorCode != null -> session.promise.reject(
        errorCode,
        message ?: errorMessage(errorCode),
        cause
      )
    }
  }

  private fun errorMessage(code: String): String = when (code) {
    "GPS_DISABLED" -> "The GPS provider is disabled and no fresh location was received."
    "LOCATION_TIMEOUT" -> "Android did not provide a fresh location before the timeout."
    "LOCATION_SERVICES_DISABLED" -> "Android location services are disabled."
    "PROVIDER_UNAVAILABLE" -> "This device has no GPS or network location provider."
    "PERMISSION_DENIED" -> "Foreground location permission is required."
    else -> "Android failed to acquire the device location."
  }

  private fun locationManager(): LocationManager {
    val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
    return context.getSystemService(Context.LOCATION_SERVICE) as? LocationManager
      ?: throw IllegalStateException("Android LocationManager is unavailable.")
  }

  private fun hasForegroundPermission(): Boolean {
    val context = appContext.reactContext ?: return false
    return ContextCompat.checkSelfPermission(
      context,
      Manifest.permission.ACCESS_FINE_LOCATION
    ) == PackageManager.PERMISSION_GRANTED ||
      ContextCompat.checkSelfPermission(
        context,
        Manifest.permission.ACCESS_COARSE_LOCATION
      ) == PackageManager.PERMISSION_GRANTED
  }

  private fun requireForegroundPermission() {
    if (!hasForegroundPermission()) {
      throw SecurityException("Foreground location permission is required.")
    }
  }

  private fun isProviderEnabled(manager: LocationManager, provider: String): Boolean {
    return try {
      provider in manager.allProviders && manager.isProviderEnabled(provider)
    } catch (_: SecurityException) {
      false
    } catch (_: IllegalArgumentException) {
      false
    }
  }

  private fun isValid(location: Location): Boolean =
    location.latitude.isFinite() &&
      location.latitude in -90.0..90.0 &&
      location.longitude.isFinite() &&
      location.longitude in -180.0..180.0

  private fun isBetterLocation(candidate: Location, current: Location): Boolean {
    if (candidate.time > current.time + LOCATION_TIME_DELTA_MILLIS) return true
    if (candidate.time < current.time - LOCATION_TIME_DELTA_MILLIS) return false
    return candidate.accuracy < current.accuracy
  }

  private fun locationToMap(location: Location): Map<String, Any?> = mapOf(
    "latitude" to location.latitude,
    "longitude" to location.longitude,
    "accuracy" to if (location.hasAccuracy()) location.accuracy.toDouble() else null,
    "altitude" to if (location.hasAltitude()) location.altitude else null,
    "timestamp" to location.time.toDouble(),
    "provider" to location.provider
  )

  private class LocationRequestSession(
    val requestId: String,
    val manager: LocationManager,
    val promise: expo.modules.kotlin.Promise,
    val gpsAvailable: Boolean,
    val gpsEnabled: Boolean,
    val startedAt: Long
  ) {
    val listeners = mutableListOf<LocationListener>()
    val providerErrors = mutableListOf<Throwable>()
    var bestLocation: Location? = null
    var timeout: Runnable? = null
  }

  private companion object {
    const val DESIRED_ACCURACY_METERS = 50f
    const val LOCATION_TIME_DELTA_MILLIS = 120_000L
    const val FRESH_LOCATION_TOLERANCE_MILLIS = 5_000L
    const val MAX_TIMEOUT_MILLIS = 30_000L
  }
}
