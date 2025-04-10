import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

const OpeningSequence = ({ onComplete }) => {
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    // Fade in the quote
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      }),
      Animated.delay(2000), // Hold the quote for 2 seconds
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 2000,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Call onComplete after the sequence is done
      onComplete();
    });
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.quoteContainer, { opacity: fadeAnim }]}>
        <Text style={styles.quoteText}>
          "Forgiveness is not about those who hurt us"
        </Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quoteContainer: {
    padding: 20,
  },
  quoteText: {
    color: 'white',
    fontSize: 24,
    textAlign: 'center',
    fontFamily: 'PressStart2P-Regular',
  },
});

export default OpeningSequence; 