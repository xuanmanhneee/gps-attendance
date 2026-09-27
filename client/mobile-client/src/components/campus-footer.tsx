<<<<<<< HEAD
import { DancingScript_700Bold, useFonts } from '@expo-google-fonts/dancing-script';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Animated, ImageBackground, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';

const campusBackground = require('../../assets/images/dlu-bg.jpg');
const AnimatedImageBackground = Animated.createAnimatedComponent(ImageBackground);

export function CampusFooter() {
  const { width } = useWindowDimensions();
  const [fontsLoaded] = useFonts({ DancingScript_700Bold });
=======
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import {
  Animated,
  ImageBackground,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

const campusBackground = require('../../assets/images/dlu-bg.jpg');
const AnimatedImageBackground =
  Animated.createAnimatedComponent(ImageBackground);

export function CampusFooter() {
  const { width } = useWindowDimensions();
>>>>>>> 6fd913c335f579fabcfa125705e1b5a16fa99917
  const imageOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.timing(imageOpacity, {
      toValue: 0.92,
      duration: 1200,
      useNativeDriver: true,
    });

    animation.start();
<<<<<<< HEAD
=======

>>>>>>> 6fd913c335f579fabcfa125705e1b5a16fa99917
    return () => animation.stop();
  }, [imageOpacity]);

  return (
<<<<<<< HEAD
    <View pointerEvents="none" style={styles.container}>
      <AnimatedImageBackground
        source={campusBackground}
        style={{ flex: 1, opacity: imageOpacity, justifyContent: 'flex-end' }}
        imageStyle={styles.image}
        resizeMode="cover"
      >
        {/* 1. Gradient mờ đỉnh: Chỉ phủ 55% nửa trên của ảnh */}
        <LinearGradient
          colors={[
            'rgba(247,251,248,1)',
            'rgba(247,251,248,0.7)',
            'rgba(247,251,248,0)',
          ]}
          locations={[0, 0.45, 1]}
          style={styles.fadeOverlay}
        />

        {/* 2. Khối Wave ghim chặt chân ảnh */}
        <View style={styles.waveLayer}>
          <Svg width={width} height={112} viewBox={`0 0 ${width} 112`} style={styles.wave}>
            {/* Lớp sóng bóng mờ phía sau */}
=======
    <View style={[styles.container, styles.pointerEventsNone]}>
      <AnimatedImageBackground
        source={campusBackground}
        style={{
          flex: 1,
          opacity: imageOpacity,
          justifyContent: 'flex-end',
        }}
        imageStyle={styles.image}
        resizeMode="cover"
      >
        <View style={styles.fadeOverlay} />

        <View style={styles.waveLayer}>
          <Svg
            width={width}
            height={112}
            viewBox={`0 0 ${width} 112`}
            style={styles.wave}
          >
>>>>>>> 6fd913c335f579fabcfa125705e1b5a16fa99917
            <Path
              d={`M0 39 Q ${width * 0.22} 10, ${width * 0.5} 32 T ${width} 22 L${width} 112 L0 112 Z`}
              fill="rgba(23,78,52,0.18)"
            />
<<<<<<< HEAD
            {/* Lớp sóng chính: ĐẶT MÀU ĐỤC 100% (#EBF5EE) để bịt kín chân ảnh */}
=======

>>>>>>> 6fd913c335f579fabcfa125705e1b5a16fa99917
            <Path
              d={`M0 34 Q ${width * 0.22} 5, ${width * 0.5} 27 T ${width} 17 L${width} 112 L0 112 Z`}
              fill="#EBF5EE"
            />
          </Svg>

<<<<<<< HEAD
          {/* 3. Chữ & Gạch chân */}
          <View style={styles.textWrapper}>
            <Text style={[styles.slogan, fontsLoaded && styles.scriptFont]}>Tri thức tạo giá trị</Text>
=======
          <View style={styles.textWrapper}>
            <Text style={styles.slogan}>Tri thức tạo giá trị</Text>
>>>>>>> 6fd913c335f579fabcfa125705e1b5a16fa99917
            <View style={styles.underline} />
          </View>
        </View>
      </AnimatedImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 200,
    justifyContent: 'flex-end',
    zIndex: 1,
  },
<<<<<<< HEAD
  image: {
    opacity: 1,
  },
=======

  image: {
    opacity: 1,
  },

>>>>>>> 6fd913c335f579fabcfa125705e1b5a16fa99917
  fadeOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
<<<<<<< HEAD
    height: '55%', // Phủ mờ từ đỉnh xuống 55% rồi ngắt
    zIndex: 1,
  },
  waveLayer: {
    position: 'absolute',
    bottom: 0, // Ghim chặt vào viền đáy
=======
    height: '55%',
    zIndex: 1,
  },

  waveLayer: {
    position: 'absolute',
    bottom: 0,
>>>>>>> 6fd913c335f579fabcfa125705e1b5a16fa99917
    left: 0,
    right: 0,
    height: 112,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
<<<<<<< HEAD
=======

>>>>>>> 6fd913c335f579fabcfa125705e1b5a16fa99917
  wave: {
    position: 'absolute',
    bottom: 0,
    left: 0,
  },
<<<<<<< HEAD
=======

>>>>>>> 6fd913c335f579fabcfa125705e1b5a16fa99917
  textWrapper: {
    alignItems: 'center',
    marginTop: 24,
    zIndex: 3,
<<<<<<< HEAD
    shadowColor: '#174E34',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
=======
    boxShadow: '0px 2px 3px rgba(23, 78, 52, 0.15)',
    elevation: 2,
  },

  pointerEventsNone: {
    pointerEvents: 'none',
  },

>>>>>>> 6fd913c335f579fabcfa125705e1b5a16fa99917
  slogan: {
    color: '#0F613C',
    fontSize: 22,
    fontStyle: 'italic',
    fontWeight: '700',
  },
<<<<<<< HEAD
  scriptFont: {
    fontFamily: 'DancingScript_700Bold',
    fontStyle: 'normal',
  },
=======

>>>>>>> 6fd913c335f579fabcfa125705e1b5a16fa99917
  underline: {
    width: 82,
    height: 2,
    backgroundColor: '#0F613C',
    borderRadius: 2,
    marginTop: 4,
    transform: [{ rotate: '-3deg' }],
  },
<<<<<<< HEAD
});
=======
});
>>>>>>> 6fd913c335f579fabcfa125705e1b5a16fa99917
