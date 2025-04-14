import React from 'react';
import { View, StyleSheet } from 'react-native';
import GameWorld from '../components/GameWorld';

const GameScreen = () => {
  return (
    <View style={styles.container}>
      <GameWorld />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default GameScreen; 