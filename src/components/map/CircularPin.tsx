import { Marker } from "react-native-maps";
import { View } from "react-native";
import Svg, { Circle, ClipPath, Defs, Image as SvgImage } from "react-native-svg";
import { MaterialCommunityIcons } from "@expo/vector-icons";

interface CircularPinProps {
  coordinate: { latitude: number; longitude: number };
  image?: string | null;
  ringColor?: string;
  iconName?: keyof typeof MaterialCommunityIcons.glyphMap;
  size?: number;
  onPress?: () => void;
}

export default function CircularPin({
  coordinate,
  image,
  ringColor = "#16a34a",
  iconName = "image-outline",
  size = 44,
  onPress,
}: CircularPinProps) {
  // react-native-maps snapshots custom markers in a fixed ~34px box anchored
  // top-left, so keep the view within that box and let the circle fill it.
  const drawSize = Math.min(size, 34);
  const stroke = 3;
  const ringR = drawSize / 2 - 1;
  const clipR = ringR - 1;
  const inner = drawSize - stroke * 2;

  return (
    <Marker
      coordinate={coordinate}
      onPress={onPress}
      anchor={{ x: 0.5, y: 0.5 }}
    >
      <View
        style={{
          width: drawSize,
          height: drawSize,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Svg width={drawSize} height={drawSize} viewBox={`0 0 ${drawSize} ${drawSize}`}>
          <Defs>
            <ClipPath id="circularPinClip">
              <Circle cx={drawSize / 2} cy={drawSize / 2} r={clipR} />
            </ClipPath>
          </Defs>

          <Circle
            cx={drawSize / 2}
            cy={drawSize / 2}
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
              clipPath="url(#circularPinClip)"
            />
          ) : null}
        </Svg>

        {!image ? (
          <View
            style={{
              position: "absolute",
              width: drawSize,
              height: drawSize,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MaterialCommunityIcons
              name={iconName}
              size={drawSize * 0.5}
              color="#9ca3af"
            />
          </View>
        ) : null}
      </View>
    </Marker>
  );
}
