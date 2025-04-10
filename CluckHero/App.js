import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useFonts, PressStart2P_400Regular } from '@expo-google-fonts/press-start-2p';
import * as SplashScreen from 'expo-splash-screen';
import GameWorld from './src/components/GameWorld';
import OpeningSequence from './src/components/OpeningSequence';

SplashScreen.preventAutoHideAsync();

export default function App() {
  const [showGame, setShowGame] = useState(false);
  const [fontsLoaded] = useFonts({
    'PressStart2P-Regular': PressStart2P_400Regular,
  });

  const onLayoutRootView = async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={styles.container} onLayout={onLayoutRootView}>
      {!showGame ? (
        <OpeningSequence onComplete={() => setShowGame(true)} />
      ) : (
        <View style={styles.gameContainer}>
          <GameWorld />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#222',
  },
  gameContainer: {
    flex: 1,
    backgroundColor: '#222',
  },
});
