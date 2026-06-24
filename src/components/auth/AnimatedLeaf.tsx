import React, { useEffect, useRef } from "react";
import { Animated, Easing } from "react-native";
import Svg, { Path } from "react-native-svg";

export interface LeafConfig {
  id: number;
  top: number;
  left: number;
  duration: number;
  delay: number;
  tx: number;
  ty: number;
  rot: number;
  maxOpacity: number;
  scale: number;
}

const AnimatedLeaf = ({ config }: { config: LeafConfig }) => {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const movementAnimation = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: config.duration,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    const timeoutId = setTimeout(() => {
      movementAnimation.start();
    }, config.delay);

    return () => {
      clearTimeout(timeoutId);
      movementAnimation.stop();
    };
  }, []);

  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [0, config.tx] });
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [0, config.ty] });
  const rotate = progress.interpolate({ inputRange: [0, 1], outputRange: ["0deg", `${config.rot}deg`] });
  const opacity = progress.interpolate({
    inputRange: [0, 0.15, 0.85, 1],
    outputRange: [0, config.maxOpacity, config.maxOpacity, 0],
  });

  return (
    <Animated.View
      style={{
        position: "absolute",
        top: `${config.top}%`,
        left: `${config.left}%`,
        opacity,
        transform: [{ translateX }, { translateY }, { rotate }, { scale: config.scale }],
      }}
    >
      <Svg viewBox="0 0 24 24" width={20} height={20}>
        <Path d="M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22l1-2.3A4.49,4.49 0 0,0 8,20C19,20 22,3 22,3c0,0-2.07,0-5,5Z" fill="#ffffff" />
      </Svg>
    </Animated.View>
  );
};

export default AnimatedLeaf;