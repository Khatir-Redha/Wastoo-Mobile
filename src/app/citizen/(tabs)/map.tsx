import MapView, {Marker} from "react-native-maps";
import { View, StyleSheet } from "react-native";
import * as Location from "expo-location";
import { useEffect, useState } from "react";

export default function MapScreen() {
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null,
  );

  useEffect(() => {
    const getLocation = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") return;

      const currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation);
    };

    getLocation();
  }, []);

  if (!location) {
  return null; // or a loading spinner
}
  console.log(location.coords.latitude, location.coords.longitude);

  return (
    <View style={styles.container}>
      <MapView
        style={StyleSheet.absoluteFillObject}
        initialRegion={{
          latitude: 36.7538,
          longitude: 3.0588,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
      <Marker
        coordinate={{
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        }}
      />
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
