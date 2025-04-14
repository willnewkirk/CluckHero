import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Dimensions, PanResponder } from 'react-native';
import { GameContext } from '../context/GameContext';

const TILE_SIZE = 32; // Size of each tile in pixels
const PLAYER_SIZE = 24; // Size of the player in pixels
const WORLD_SIZE = 50; // Number of tiles in each direction

const GameWorld = () => {
  const [playerPosition, setPlayerPosition] = useState({
    x: WORLD_SIZE * TILE_SIZE / 2,
    y: WORLD_SIZE * TILE_SIZE / 2
  });
  const [cameraOffset, setCameraOffset] = useState({ x: 0, y: 0 });
  const screenDimensions = useRef(Dimensions.get('window'));

  // Calculate camera offset to keep player centered
  useEffect(() => {
    const centerX = screenDimensions.current.width / 2;
    const centerY = screenDimensions.current.height / 2;
    setCameraOffset({
      x: centerX - playerPosition.x,
      y: centerY - playerPosition.y
    });
  }, [playerPosition]);

  // Handle touch events
  const handleTouch = (event) => {
    const { locationX, locationY } = event.nativeEvent;
    const targetX = locationX - cameraOffset.x;
    const targetY = locationY - cameraOffset.y;
    
    // Move player to tapped position
    setPlayerPosition({
      x: targetX,
      y: targetY
    });
  };

  // Render a single tile
  const renderTile = (x, y) => {
    const isGrass = (x + y) % 2 === 0;
    return (
      <View
        key={`${x}-${y}`}
        style={[
          styles.tile,
          {
            left: x * TILE_SIZE,
            top: y * TILE_SIZE,
            backgroundColor: isGrass ? '#7CFC00' : '#90EE90'
          }
        ]}
      />
    );
  };

  // Generate the game world
  const renderWorld = () => {
    const tiles = [];
    for (let y = 0; y < WORLD_SIZE; y++) {
      for (let x = 0; x < WORLD_SIZE; x++) {
        tiles.push(renderTile(x, y));
      }
    }
    return tiles;
  };

  return (
    <View style={styles.container} onTouchEnd={handleTouch}>
      <View
        style={[
          styles.world,
          {
            transform: [
              { translateX: cameraOffset.x },
              { translateY: cameraOffset.y }
            ]
          }
        ]}
      >
        {renderWorld()}
        <View
          style={[
            styles.player,
            {
              left: playerPosition.x - PLAYER_SIZE / 2,
              top: playerPosition.y - PLAYER_SIZE / 2
            }
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#87CEEB', // Sky blue background
    overflow: 'hidden'
  },
  world: {
    position: 'absolute',
    width: WORLD_SIZE * TILE_SIZE,
    height: WORLD_SIZE * TILE_SIZE
  },
  tile: {
    position: 'absolute',
    width: TILE_SIZE,
    height: TILE_SIZE
  },
  player: {
    position: 'absolute',
    width: PLAYER_SIZE,
    height: PLAYER_SIZE,
    backgroundColor: '#8B4513', // Brown color for the farmer
    borderRadius: PLAYER_SIZE / 2
  }
});

export default GameWorld; 