import React, { useEffect, useRef, useState } from "react";
import { Animated } from "react-native";

interface Props {
  value: number;
  style?: object;
}

export function AnimatedNumber({ value, style }: Props) {
  const anim = useRef(new Animated.Value(0)).current;
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    anim.setValue(0);

    Animated.timing(anim, {
      toValue: value,
      duration: 900,
      useNativeDriver: false,
    }).start();

    const id = anim.addListener(({ value: v }) =>
      setDisplayed(Math.floor(v)),
    );

    return () => anim.removeListener(id);
  }, [value, anim]);

  return <Animated.Text style={style}>{displayed}</Animated.Text>;
}