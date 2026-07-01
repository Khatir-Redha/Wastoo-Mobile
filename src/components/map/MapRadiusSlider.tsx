import { StyleSheet, Text, View } from "react-native";
import Slider from "@react-native-community/slider";

interface MapRadiusSliderProps {
  radius: number;
  loadingPosts: boolean;
  onRadiusChange: (value: number) => void;
}

export default function MapRadiusSlider({
  radius,
  loadingPosts,
  onRadiusChange,
}: MapRadiusSliderProps) {
  return (
    <View style={styles.sliderContainer}>
      <Text style={styles.radiusText}>
        Radius: {radius} km {loadingPosts && "(Updating...)"}
      </Text>

      <Slider
        minimumValue={10}
        maximumValue={100}
        step={10}
        value={radius}
        onValueChange={onRadiusChange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sliderContainer: {
    position: "absolute",
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: "white",
    borderRadius: 12,
    padding: 12,
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  radiusText: {
    textAlign: "center",
    marginBottom: 8,
    fontWeight: "600",
  },
});
