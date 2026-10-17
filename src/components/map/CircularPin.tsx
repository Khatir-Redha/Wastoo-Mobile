import React from "react";
import { Marker } from "@maplibre/maplibre-react-native";
import { View, StyleSheet } from "react-native";
import Svg, { Circle, ClipPath, Defs, Image as SvgImage } from "react-native-svg";
import { MaterialCommunityIcons } from "@expo/vector-icons";

interface CircularPinProps {
  coordinate: { latitude: number; longitude: number };
  image?: string | null;
  ringColor?: string;
  iconName?: keyof typeof MaterialCommunityIcons.glyphMap;
  size?: number;
  isSelected?: boolean;
  onPress?: () => void;
}

export default function CircularPin({
  coordinate,
  image,
  ringColor = "#16a34a",
  iconName = "image-outline",
  size = 42,
  isSelected = false,
  onPress,
}: CircularPinProps) {
  const pinSize = isSelected ? size + 8 : size;
  const stroke = isSelected ? 3.5 : 2.5;
  const ringR = pinSize / 2 - 1;
  const clipR = ringR - 1;
  const inner = pinSize - stroke * 2;

  return (
    <Marker
      lngLat={[coordinate.longitude, coordinate.latitude]}
      onPress={onPress}
    >
      <View
        style={[
          styles.container,
          {
            width: pinSize + 6,
            height: pinSize + 6,
          },
        ]}
      >
        {/* Selection glow ring */}
        {isSelected && (
          <View
            style={[
              styles.selectionHalo,
              {
                width: pinSize + 6,
                height: pinSize + 6,
                borderRadius: (pinSize + 6) / 2,
                borderColor: ringColor,
              },
            ]}
          />
        )}

        <Svg width={pinSize} height={pinSize} viewBox={`0 0 ${pinSize} ${pinSize}`}>
          <Defs>
            <ClipPath id={`pinClip-${coordinate.latitude}-${coordinate.longitude}`}>
              <Circle cx={pinSize / 2} cy={pinSize / 2} r={clipR} />
            </ClipPath>
          </Defs>

          <Circle
            cx={pinSize / 2}
            cy={pinSize / 2}
            r={ringR}
            fill="#ffffff"
            stroke={ringColor}
            strokeWidth={stroke}
          />

          {image ? (
            <SvgImage
              href={image}
              x={stroke}
              y={stroke}
              width={inner}
              height={inner}
              preserveAspectRatio="xMidYMid slice"
              clipPath={`url(#pinClip-${coordinate.latitude}-${coordinate.longitude})`}
            />
          ) : null}
        </Svg>

        {!image && (
          <View
            style={[
              StyleSheet.absoluteFillObject,
              styles.centerContent,
            ]}
          >
            <MaterialCommunityIcons
              name={iconName}
              size={pinSize * 0.48}
              color={ringColor}
            />
          </View>
        )}
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  selectionHalo: {
    position: "absolute",
    borderWidth: 2,
    backgroundColor: "rgba(8, 127, 91, 0.15)",
  },
  centerContent: {
    alignItems: "center",
    justifyContent: "center",
  },
});
