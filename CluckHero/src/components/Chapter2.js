import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import GameWorld from './GameWorld';
import { Audio } from 'expo-av';

// Import Chapter 1 music temporarily
const chapter1Music = require('../../assets/chapter-1.mp3');

const Chapter2 = () => {
  const [sound, setSound] = useState(null);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);

  // Initialize Chapter 2 specific audio
  useEffect(() => {
    let isMounted = true;
    console.log('Initializing Chapter 2 audio...');

    const setupAudio = async () => {
      try {
        console.log('Setting up audio mode...');
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: true,
        });
        console.log('Audio mode set up successfully');

        console.log('Loading Chapter 1 sound file temporarily...');
        const { sound: audioSound } = await Audio.Sound.createAsync(
          chapter1Music,
          { 
            shouldPlay: true,
            volume: 1.0,
            isLooping: true
          }
        );
        console.log('Chapter 1 sound loaded successfully');

        if (isMounted) {
          setSound(audioSound);
          setIsMusicPlaying(true);
          console.log('Chapter 2 sound state updated');
        }
      } catch (error) {
        console.error('Error in Chapter 2 audio setup:', error);
      }
    };

    setupAudio();

    return () => {
      console.log('Cleaning up Chapter 2 audio...');
      isMounted = false;
      if (sound) {
        sound.unloadAsync().catch(error => {
          console.error('Error unloading Chapter 2 sound:', error);
        });
      }
    };
  }, []);

  return (
    <View style={styles.container}>
      <GameWorld 
        chapter={2}
        sound={sound}
        isMusicPlaying={isMusicPlaying}
        // Add any other Chapter 2 specific props here
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#222',
  },
});

export default Chapter2; 