import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Dimensions, Animated, Text, TouchableWithoutFeedback, Image, Easing } from 'react-native';
import { GameContext } from '../context/GameContext';
import { Audio } from 'expo-av';
import { useNavigation } from '@react-navigation/native';

// Import images directly - try multiple approaches to ensure one works
const playerFrontImage = require('../../assets/player-front.png');
const playerBackImage = require('../../assets/player-back.png');
const playerLeftImage = require('../../assets/player-left.png');
const playerRightImage = require('../../assets/player-right.png');
const chickenImage = require('../../assets/chicken.png');
const farmerFrontImage = require('../../assets/farmer-front.png');
const farmerBackImage = require('../../assets/farmer-back.png');
const marketImage = require('../../assets/market.png');
const factory1Image = require('../../assets/factory1.png');
const factory2Image = require('../../assets/factory2.png');
const factory3Image = require('../../assets/factory3.png');
const antagonistFrontImage = require('../../assets/antagonist-front.png');
const antagonistBackImage = require('../../assets/antagonist-back.png');
const torch0Image = require('../../assets/torch-0.png');
const torch1Image = require('../../assets/torch-1.png');
const torch2Image = require('../../assets/torch-2.png');

// Import audio file
const chapter1Music = require('../../assets/chapter-1.mp3');

const TILE_SIZE = 32; // Size of each tile in pixels
const PLAYER_SIZE = 80; // Increased from 64 to 80 to make player even bigger
const WORLD_SIZE = 50; // Number of tiles in each direction
const FACTORY_SIZE = TILE_SIZE * 16; // Make factory 16x16 tiles (smaller than before)

const GameWorld = ({ chapter = 1, sound: chapter2Sound, isMusicPlaying: chapter2MusicPlaying }) => {
  const navigation = useNavigation();
  const [playerPosition, setPlayerPosition] = useState({
    x: WORLD_SIZE * TILE_SIZE / 2,
    y: WORLD_SIZE * TILE_SIZE / 2
  });
  const [playerDirection, setPlayerDirection] = useState('down'); // down, up, left, right
  const [isWalking, setIsWalking] = useState(false);
  const [cameraOffset, setCameraOffset] = useState({ x: 0, y: 0 });
  const [visitedTiles, setVisitedTiles] = useState(new Set());
  const [tiles, setTiles] = useState({});
  const [tapMarker, setTapMarker] = useState(null); // Store where the user tapped on the screen
  const [chickenPosition, setChickenPosition] = useState(null); // Chicken position
  const [chickenDirection, setChickenDirection] = useState('down'); // Chicken direction
  const [isChickenWalking, setIsChickenWalking] = useState(false); // Chicken walking state
  const [isChickenIdling, setIsChickenIdling] = useState(true); // Chicken idle animation state
  const [showMarketRoom, setShowMarketRoom] = useState(false); // Show market room UI
  const [farmerPosition, setFarmerPosition] = useState(null); // Farmer position
  const [farmerDirection, setFarmerDirection] = useState('down'); // Farmer direction
  const [isFarmerWalking, setIsFarmerWalking] = useState(false); // Farmer walking state
  const [showFarmerDialogue, setShowFarmerDialogue] = useState(false); // Show farmer greeting
  const [showFactoryDialogue, setShowFactoryDialogue] = useState(false);
  const [isInFactory, setIsInFactory] = useState(false);
  const [factoryInteriorTiles, setFactoryInteriorTiles] = useState({});
  const [eggCount, setEggCount] = useState(0);
  const [isEggCounterActive, setIsEggCounterActive] = useState(false);
  const [hasSpeedBoost, setHasSpeedBoost] = useState(false);
  const [hasChickenFeed, setHasChickenFeed] = useState(false);
  const [hasBetterEggs, setHasBetterEggs] = useState(false);
  const [eggProductionRate, setEggProductionRate] = useState(1);
  const [moveSpeed, setMoveSpeed] = useState(400); // Convert MOVE_SPEED to state variable
  const [canMove, setCanMove] = useState(false); // New state to control player movement
  const screenDimensions = useRef(Dimensions.get('window'));
  const playerRef = useRef({ x: 0, y: 0 }); // Reference to track current player position
  const worldRef = useRef(null); // Reference to the world View for measuring
  const isMoving = useRef(false);
  const walkingBob = useRef(new Animated.Value(0)).current;
  const chickenBob = useRef(new Animated.Value(0)).current; // Chicken bobbing animation
  const spawnPoint = useRef({ x: 0, y: 0 }); // Store the spawn point coordinates
  const chickenRef = useRef({ x: 0, y: 0 }); // Reference for chicken position
  const chickenMoveTimeout = useRef(null); // Timeout for chicken movement
  const farmerRef = useRef({ x: 0, y: 0 }); // Reference for farmer position
  const farmerBob = useRef(new Animated.Value(0)).current; // Farmer bobbing animation
  const hasFarmerGreeted = useRef(false); // Ensure the greeting only happens once
  const startTime = useRef(Date.now());
  const bobOffset = useRef(0);
  const currentTargetRef = useRef(null);
  const [factoryAnimationState, setFactoryAnimationState] = useState(1);
  const factoryAnimationRef = useRef(null);
  // Add state for chicken dialogue
  const [showChickenDialogue, setShowChickenDialogue] = useState(false);
  // Add state for protagonist dialogue
  const [showProtagonistDialogue, setShowProtagonistDialogue] = useState(false);
  const [antagonistPosition, setAntagonistPosition] = useState({ x: 0, y: 0 });
  const [antagonistDirection, setAntagonistDirection] = useState('front');
  const [showAntagonist, setShowAntagonist] = useState(false);
  const antagonistRef = useRef({ x: 0, y: 0 });
  // Add state for antagonist dialogue
  const [showAntagonistDialogue, setShowAntagonistDialogue] = useState(false);
  const [antagonistReachedPlayer, setAntagonistReachedPlayer] = useState(false);
  const [antagonistReturning, setAntagonistReturning] = useState(false);
  // Add state for spawn lock
  const [spawnLock, setSpawnLock] = useState(true);
  // Add new state variables for the sequence
  const [showSelfDialogue, setShowSelfDialogue] = useState(false);
  const [showChapterText, setShowChapterText] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [sound, setSound] = useState(null);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  // Add new state for explore alert
  const [showExploreAlert, setShowExploreAlert] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [hasPlayerApproachedFarmer, setHasPlayerApproachedFarmer] = useState(false);
  // Add new state variables for thunderstorm
  const [lightningFlash, setLightningFlash] = useState(false);
  const [rainOpacity, setRainOpacity] = useState(0.5);
  // Add state for rain animation
  const rainAnim = useRef(new Animated.Value(0)).current;
  const rainAnimationRef = useRef(null);
  const bloodSpatterPositions = useRef(null);
  // Add new state for newspaper dialogue
  const [showNewspaperDialogue, setShowNewspaperDialogue] = useState(false);
  const [franticChickenPos, setFranticChickenPos] = useState({ x: 0, y: 0 });
  const franticChickenRef = useRef({ x: 0, y: 0 });
  const franticChickenTimer = useRef(null);
  // Add state for rain animation
  const rainDrops = useRef(null);
  // Add state for torch animation
  const [torchFrame, setTorchFrame] = useState(0);
  const torchAnimationRef = useRef(null);

  // Initialize the world with initial tiles centered on the player's starting position
  useEffect(() => {
    // Center the player in the world
    const centerX = Math.floor(WORLD_SIZE / 2);
    const centerY = Math.floor(WORLD_SIZE / 2);
    
    // Store spawn point
    spawnPoint.current = {
      x: centerX,
      y: centerY
    };
    
    // Initialize player position at center
    const initialPlayerPos = {
      x: centerX * TILE_SIZE,
      y: centerY * TILE_SIZE
    };
    setPlayerPosition(initialPlayerPos);
    playerRef.current = initialPlayerPos;
    
    // Initialize chicken position slightly behind player
    const initialChickenPos = {
      x: initialPlayerPos.x - 20,
      y: initialPlayerPos.y + 10
    };
    setChickenPosition(initialChickenPos);
    chickenRef.current = initialChickenPos;
    
    // Position farmer near the player - visible but at a short distance
    const initialFarmerPos = {
      x: initialPlayerPos.x + TILE_SIZE * 4, // 4 tiles to the right
      y: initialPlayerPos.y - TILE_SIZE * 2  // 2 tiles up
    };
    setFarmerPosition(initialFarmerPos);
    farmerRef.current = initialFarmerPos;
    
    // Only initialize antagonist in Chapter 1
    if (chapter === 1) {
      // Initialize antagonist position at bottom of screen, moved up a bit
      const initialAntagonistPos = {
        x: centerX * TILE_SIZE,
        y: (WORLD_SIZE - 3) * TILE_SIZE // Moved up 2 tiles from bottom
      };
      antagonistRef.current = initialAntagonistPos;
      setAntagonistPosition(initialAntagonistPos);
      setShowAntagonist(true);
      setAntagonistDirection('back'); // Start facing back
    } else {
      // In Chapter 2, give player 10 eggs and enable movement immediately
      setEggCount(10);
      setCanMove(true);
      setSpawnLock(false);
    }
    
    // Update camera to center on player
    updateCameraOffset();
    
    // Pre-generate all tiles as a static background
    const allTiles = generateTiles();
    
    // Mark all tiles as visited since they're all pre-generated
    const allVisitedTiles = new Set(Object.keys(allTiles));
    setVisitedTiles(allVisitedTiles);
    setTiles(allTiles);
    
    // Only show farmer dialogue in Chapter 1
    if (chapter === 1) {
      // Start the farmer greeting sequence after a short delay
      setTimeout(() => {
        if (!hasFarmerGreeted.current) {
          startFarmerGreeting();
        }
      }, 2000);
    } else {
      // In Chapter 2, enable movement immediately and ensure no spawn lock
      setCanMove(true);
      setSpawnLock(false);
    }
  }, [chapter]);

  // Animate walking frames
  useEffect(() => {
    if (isWalking) {
      // Create a repeating bobbing animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(walkingBob, {
            toValue: -3,
            duration: 150,
            useNativeDriver: false
          }),
          Animated.timing(walkingBob, {
            toValue: 0,
            duration: 150,
            useNativeDriver: false
          })
        ])
      ).start();
    } else {
      // Reset bob position
      walkingBob.setValue(0);
    }

    return () => {
      // Clean up animation when component unmounts
      walkingBob.stopAnimation();
    };
  }, [isWalking]);

  // Animate farmer walking
  useEffect(() => {
    if (isFarmerWalking) {
      // Create a smoother repeating bobbing animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(farmerBob, {
            toValue: -2,
            duration: 200, // Slower for smoother animation
            useNativeDriver: true,
            easing: Easing.sine
          }),
          Animated.timing(farmerBob, {
            toValue: 0,
            duration: 200, // Slower for smoother animation
            useNativeDriver: true,
            easing: Easing.sine
          })
        ])
      ).start();
    } else {
      // Reset bob position
      farmerBob.setValue(0);
    }

    return () => {
      // Clean up animation when component unmounts
      farmerBob.stopAnimation();
    };
  }, [isFarmerWalking]);

  // Animate chicken walking
  useEffect(() => {
    if (isChickenWalking) {
      // Reset previous animation
      chickenBob.stopAnimation();
      
      // Create a smoother repeating bobbing animation for chicken
      Animated.loop(
        Animated.sequence([
          Animated.timing(chickenBob, {
            toValue: -2,
            duration: 150, 
            useNativeDriver: true,
            easing: Easing.sine
          }),
          Animated.timing(chickenBob, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
            easing: Easing.sine
          })
        ])
      ).start();
    } else if (isChickenIdling) {
      // Reset previous animation
      chickenBob.stopAnimation();
      
      // Start the gentle idle bobbing animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(chickenBob, {
            toValue: -1,
            duration: 800, 
            useNativeDriver: true,
            easing: Easing.sine
          }),
          Animated.timing(chickenBob, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
            easing: Easing.sine
          })
        ])
      ).start();
    } else {
      // Reset animation if not walking or idling
      chickenBob.setValue(0);
    }

    return () => {
      // Clean up animation when component unmounts
      chickenBob.stopAnimation();
    };
  }, [isChickenWalking, isChickenIdling]);

  // Completely disable the tap marker rendering
  const renderTapMarker = () => {
    return null;
  };

  // Update tile generation to include spawn path
  const generateTiles = () => {
    const allTiles = {};
    const specialX = 295;
    const specialY = 887;
    const specialRadius = 5 * 1.3; // Increased by 1.3 times
    const spawnRadius = 5;
    const pathWidth = 3;
    
    // Calculate center coordinates
    const centerX = Math.floor(WORLD_SIZE / 2);
    const centerY = Math.floor(WORLD_SIZE / 2);

    // New path coordinates
    const pathStartX = 495;
    const pathStartY = 870;
    const pathEndX = 664;
    const pathEndY = 850;

    for (let y = 0; y < WORLD_SIZE; y++) {
      for (let x = 0; x < WORLD_SIZE; x++) {
        const tileKey = `${x}-${y}`;
        const tileX = x * TILE_SIZE;
        const tileY = y * TILE_SIZE;
        
        // Calculate distance from spawn point
        const spawnDistance = Math.sqrt(
          Math.pow(x - centerX, 2) + 
          Math.pow(y - centerY, 2)
        );
        
        // Calculate distance from special coordinates
        const distance = Math.sqrt(
          Math.pow(tileX - specialX, 2) + 
          Math.pow(tileY - specialY, 2)
        );
        
        // Check if tile is on the original path
        const isOnOriginalPath = (
          // Horizontal path segment
          (y >= centerY - pathWidth/2 && y <= centerY + pathWidth/2 && 
           x >= centerX && x <= Math.floor(specialX/TILE_SIZE)) ||
          // Vertical path segment
          (x >= Math.floor(specialX/TILE_SIZE) - pathWidth/2 && 
           x <= Math.floor(specialX/TILE_SIZE) + pathWidth/2 && 
           y >= centerY && y <= Math.floor(specialY/TILE_SIZE))
        );

        // Check if tile is on the new path
        const isOnNewPath = (
          // Calculate if tile is within the path width of the line segment
          (tileX >= pathStartX - pathWidth * TILE_SIZE/2 && 
           tileX <= pathEndX + pathWidth * TILE_SIZE/2 &&
           tileY >= Math.min(pathStartY, pathEndY) - pathWidth * TILE_SIZE/2 &&
           tileY <= Math.max(pathStartY, pathEndY) + pathWidth * TILE_SIZE/2)
        );
        
        // If within spawn radius, make it brown path
        // If within special radius, make it grey
        // If on path, make it alternating brown
        // Otherwise normal grass with variation
        const isGrey = distance <= specialRadius * TILE_SIZE;
        const isSpawnArea = spawnDistance <= spawnRadius;
        
        // Randomly make some grass tiles darker
        const isDarkerGrass = Math.random() < 0.3; // 30% chance of being darker
        
        // For path tiles, alternate between light and dark brown
        const isPathTile = (isOnOriginalPath || isOnNewPath) && !isGrey;
        const isAlternatingLight = isPathTile && ((x + y) % 2 === 0);
        
        allTiles[tileKey] = { 
          x, 
          y, 
          type: (x === centerX && y === centerY) ? 'market' : 
               (isGrey ? 'grey' : 
                (isPathTile ? (isAlternatingLight ? 'lightPath' : 'path') :
                 (isSpawnArea ? (isAlternatingLight ? 'lightPath' : 'path') : 
                  (isDarkerGrass ? 'darkGrass' : 'grass'))))
        };
      }
    }
    
    return allTiles;
  };

  // Update chicken follow logic
  useEffect(() => {
    // Simple timer-based chicken follow at consistent intervals
    const followInterval = setInterval(() => {
      if (!chickenPosition || !playerRef.current) return;
      
      // Always position chicken behind player based on player direction
      // Calculate the target position based on player direction
      let targetOffsetX = 0;
      let targetOffsetY = 0;
      
      switch (playerDirection) {
        case 'up':
          targetOffsetX = 0;
          targetOffsetY = 60;
          break;
        case 'down':
          targetOffsetX = 0;
          targetOffsetY = -60;
          break;
        case 'left':
          targetOffsetX = 60;
          targetOffsetY = 0;
          break;
        case 'right':
          targetOffsetX = -60;
          targetOffsetY = 0;
          break;
      }
      
      // Calculate exact target position
      const targetX = playerRef.current.x + targetOffsetX;
      const targetY = playerRef.current.y + targetOffsetY;
      
      // Calculate how far chicken is from desired position
      const dx = targetX - chickenRef.current.x;
      const dy = targetY - chickenRef.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Fixed chicken speed with gradual acceleration based on distance
      let speed = 0.1; // Base speed
      
      // If very far away, gradually increase speed
      if (distance > 200) {
        speed = 0.3;
      } else if (distance > 100) {
        speed = 0.2;
      }
      
      // Only move if chicken needs to (avoids micro-movements)
      if (distance > 3) {
        setIsChickenWalking(true);
        setIsChickenIdling(false);
        
        // Set chicken direction based on player direction
        setChickenDirection(playerDirection);
        
        // Update chicken position with smooth movement
        const newX = chickenRef.current.x + dx * speed;
        const newY = chickenRef.current.y + dy * speed;
        
        chickenRef.current = {
          x: newX,
          y: newY
        };
        
        setChickenPosition({
          x: newX,
          y: newY
        });
      } else {
        // Close enough, just idle
        setIsChickenWalking(false);
        setIsChickenIdling(true);
      }
    }, 16); // 60fps update rate
    
    return () => clearInterval(followInterval);
  }, [playerDirection]);

  // Update camera position to keep player centered
  const updateCameraOffset = () => {
    const centerX = screenDimensions.current.width / 2;
    const centerY = screenDimensions.current.height / 2;
    setCameraOffset({
      x: centerX - playerRef.current.x,
      y: centerY - playerRef.current.y
    });
  };

  // Handle movement when tap marker is set - disabled since we now move directly in handleTouch
  useEffect(() => {
    // This effect is now disabled as we handle movement directly in handleTouch
    // Keep the effect for debugging purposes but don't trigger movement
    if (tapMarker) {
      console.log('Tap marker updated:', tapMarker);
    }
  }, [tapMarker]);

  // Move the player to the exact tapped location with animation
  const movePlayer = (targetX, targetY) => {
    if (isMoving.current) return;
    
    // Check for collision with market
    const { x: marketX, y: marketY } = spawnPoint.current;
    const marketSize = TILE_SIZE * 3; // 3x3 tiles to match the image size
    const marketLeft = marketX * TILE_SIZE - TILE_SIZE;
    const marketTop = (marketY * TILE_SIZE) - TILE_SIZE * 3.5;
    const marketRight = marketLeft + marketSize;
    const marketBottom = marketTop + marketSize;
    
    // Check if the path to target would intersect with the market
    const isTargetInsideMarket = (
      targetX >= marketLeft && 
      targetX <= marketRight && 
      targetY >= marketTop && 
      targetY <= marketBottom
    );
    
    // Check if the player is close to the market for interaction
    const playerToMarketCenterX = (marketLeft + marketRight) / 2 - playerRef.current.x;
    const playerToMarketCenterY = (marketTop + marketBottom) / 2 - playerRef.current.y;
    const distanceToMarket = Math.sqrt(
      playerToMarketCenterX * playerToMarketCenterX + 
      playerToMarketCenterY * playerToMarketCenterY
    );
    const isCloseToMarket = distanceToMarket < TILE_SIZE * 2.5; // Within 2.5 tiles
    
    // If the player clicked on the market AND is close, open the market room
    if (isTargetInsideMarket) {
      if (isCloseToMarket) {
        setShowMarketRoom(true);
      } else {
        // Player is too far, try to move closer to the market
        // Find a point near the market to move to
        const angle = Math.atan2(playerToMarketCenterY, playerToMarketCenterX);
        const nearMarketX = (marketLeft + marketRight) / 2 - Math.cos(angle) * TILE_SIZE * 2;
        const nearMarketY = (marketTop + marketBottom) / 2 - Math.sin(angle) * TILE_SIZE * 2;
        
        // Try to move to this position instead
        moveToWithCollisionCheck(nearMarketX, nearMarketY);
      }
      return;
    }
    
    // Otherwise proceed with normal movement with collision check
    moveToWithCollisionCheck(targetX, targetY);
  };

  // Helper function to move with collision detection
  const moveToWithCollisionCheck = (targetX, targetY) => {
    if (isInFactory) {
      // Check factory interior boundaries
      const minX = TILE_SIZE; // One tile in from the left border
      const minY = TILE_SIZE; // One tile in from the top border
      const maxX = 19 * TILE_SIZE - TILE_SIZE; // One tile in from the right border
      const maxY = 19 * TILE_SIZE - TILE_SIZE; // One tile in from the bottom border

      // Clamp target position to factory boundaries
      const clampedTargetX = Math.max(minX, Math.min(maxX, targetX));
      const clampedTargetY = Math.max(minY, Math.min(maxY, targetY));

      // If target was clamped, show a visual indicator that we hit the border
      if (clampedTargetX !== targetX || clampedTargetY !== targetY) {
        console.log("Hit factory border!");
      }

      // Always proceed with movement, even if hitting the border
      startMovement(clampedTargetX, clampedTargetY);
    } else {
      // Original world boundary checks
      const worldBorderPadding = TILE_SIZE / 2;
      const minX = worldBorderPadding;
      const minY = worldBorderPadding;
      const maxX = WORLD_SIZE * TILE_SIZE - worldBorderPadding;
      const maxY = WORLD_SIZE * TILE_SIZE - worldBorderPadding;

      // Clamp target position to world boundaries
      const clampedTargetX = Math.max(minX, Math.min(maxX, targetX));
      const clampedTargetY = Math.max(minY, Math.min(maxY, targetY));

      // If target was clamped, show a visual indicator that we hit the border
      if (clampedTargetX !== targetX || clampedTargetY !== targetY) {
        console.log("Hit world border!");
      }

      // Get factory boundaries for collision check
      if (spawnPoint.current) {
        const { x, y } = spawnPoint.current;
        const factoryX = x * TILE_SIZE - FACTORY_SIZE * 1.5 - TILE_SIZE * 2;
        const factoryY = y * TILE_SIZE - FACTORY_SIZE / 2 - TILE_SIZE;
        
        // Check if the target position is inside the factory
        const isTargetInsideFactory = (
          clampedTargetX >= factoryX && 
          clampedTargetX <= factoryX + FACTORY_SIZE && 
          clampedTargetY >= factoryY && 
          clampedTargetY <= factoryY + FACTORY_SIZE
        );
        
        // If target is inside factory, show dialogue instead of moving
        if (isTargetInsideFactory) {
          setShowFactoryDialogue(true);
          return; // Cancel movement and show dialogue
        }
      }
      
      // Always proceed with movement, even if hitting the border
      startMovement(clampedTargetX, clampedTargetY);
    }
  };

  // Optimize movement handling
  const startMovement = (targetX, targetY) => {
    // Store the new target
    currentTargetRef.current = { x: targetX, y: targetY };
    
    // Always reset movement state when starting new movement
    isMoving.current = false;
    setIsWalking(false);
    
    // Small delay to ensure state is reset
    setTimeout(() => {
      isMoving.current = true;
      setIsWalking(true);

      // Determine the direction of movement for proper animation
      const dx = targetX - playerRef.current.x;
      const dy = targetY - playerRef.current.y;
      
      if (Math.abs(dx) > Math.abs(dy)) {
        setPlayerDirection(dx > 0 ? 'right' : 'left');
      } else {
        setPlayerDirection(dy > 0 ? 'down' : 'up');
      }

      const distance = Math.sqrt(dx * dx + dy * dy);
      const duration = (distance / moveSpeed) * 1000;
      
      // Calculate the movement increment per frame
      const steps = Math.max(5, Math.floor(duration / 16)); // Reduced steps for better performance
      const incrementX = dx / steps;
      const incrementY = dy / steps;

      // Define world boundaries
      const worldBorderPadding = TILE_SIZE / 2;
      const minX = worldBorderPadding;
      const minY = worldBorderPadding;
      const maxX = WORLD_SIZE * TILE_SIZE - worldBorderPadding;
      const maxY = WORLD_SIZE * TILE_SIZE - worldBorderPadding;
      
      // Start animation loop
      let step = 0;
      const moveStep = () => {
        if (!isMoving.current) return;
        
        if (step >= steps) {
          // Animation complete
          playerRef.current = { x: targetX, y: targetY };
          setPlayerPosition({ x: targetX, y: targetY });
          updateCameraOffset();
          isMoving.current = false;
          setIsWalking(false);
          setTapMarker(null);
          return;
        }
        
        // Update player position incrementally
        const newX = playerRef.current.x + incrementX;
        const newY = playerRef.current.y + incrementY;
        
        // Check world boundaries during movement
        playerRef.current = {
          x: Math.max(minX, Math.min(maxX, newX)),
          y: Math.max(minY, Math.min(maxY, newY))
        };
        
        // Update state to trigger re-render
        setPlayerPosition({ ...playerRef.current });
        updateCameraOffset();
        
        step++;
        requestAnimationFrame(moveStep);
      };
      
      // Start the animation
      moveStep();
    }, 0);
  };

  // Check if a line intersects with a rectangle
  const doesLineIntersectRect = (x1, y1, x2, y2, rectLeft, rectTop, rectRight, rectBottom) => {
    // Check if either end of the line is inside the rectangle
    if ((x1 >= rectLeft && x1 <= rectRight && y1 >= rectTop && y1 <= rectBottom) ||
        (x2 >= rectLeft && x2 <= rectRight && y2 >= rectTop && y2 <= rectBottom)) {
      return true;
    }
    
    // Check if the line intersects any of the rectangle edges
    // Top edge
    if (lineIntersectsSegment(x1, y1, x2, y2, rectLeft, rectTop, rectRight, rectTop)) return true;
    // Right edge
    if (lineIntersectsSegment(x1, y1, x2, y2, rectRight, rectTop, rectRight, rectBottom)) return true;
    // Bottom edge
    if (lineIntersectsSegment(x1, y1, x2, y2, rectLeft, rectBottom, rectRight, rectBottom)) return true;
    // Left edge
    if (lineIntersectsSegment(x1, y1, x2, y2, rectLeft, rectTop, rectLeft, rectBottom)) return true;
    
    return false;
  };

  // Check if two line segments intersect
  const lineIntersectsSegment = (x1, y1, x2, y2, x3, y3, x4, y4) => {
    const d = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
    if (d === 0) return false;
    
    const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / d;
    const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / d;
    
    return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
  };

  // Find a path around the market to reach the target
  const findPathAroundMarket = (targetX, targetY) => {
    // Get market boundaries
    const { x: marketX, y: marketY } = spawnPoint.current;
    const marketSize = TILE_SIZE * 3; // 3x3 tiles to match the image size
    const marketLeft = marketX * TILE_SIZE - TILE_SIZE;
    const marketTop = (marketY * TILE_SIZE) - TILE_SIZE * 3.5;
    const marketRight = marketLeft + marketSize;
    const marketBottom = marketTop + marketSize;
    
    // Define potential waypoints around the market
    const waypoints = [
      { x: marketLeft - TILE_SIZE, y: marketTop - TILE_SIZE },    // Top-left
      { x: marketRight + TILE_SIZE, y: marketTop - TILE_SIZE },   // Top-right
      { x: marketLeft - TILE_SIZE, y: marketBottom + TILE_SIZE }, // Bottom-left
      { x: marketRight + TILE_SIZE, y: marketBottom + TILE_SIZE } // Bottom-right
    ];
    
    // Find the waypoint that is closest to both the player and the target
    let bestWaypoint = null;
    let bestScore = Infinity;
    
    for (let waypoint of waypoints) {
      // Calculate distances
      const distToPlayer = Math.sqrt(
        Math.pow(waypoint.x - playerRef.current.x, 2) + 
        Math.pow(waypoint.y - playerRef.current.y, 2)
      );
      const distToTarget = Math.sqrt(
        Math.pow(waypoint.x - targetX, 2) + 
        Math.pow(waypoint.y - targetY, 2)
      );
      
      // Score is the sum of distances
      const score = distToPlayer + distToTarget;
      
      // Check if this waypoint creates a valid path
      const crossToWaypoint = doesLineIntersectRect(
        playerRef.current.x, playerRef.current.y,
        waypoint.x, waypoint.y,
        marketLeft, marketTop, marketRight, marketBottom
      );
      const crossFromWaypoint = doesLineIntersectRect(
        waypoint.x, waypoint.y,
        targetX, targetY,
        marketLeft, marketTop, marketRight, marketBottom
      );
      
      if (!crossToWaypoint && !crossFromWaypoint && score < bestScore) {
        bestWaypoint = waypoint;
        bestScore = score;
      }
    }
    
    return bestWaypoint;
  };

  // Spawn new grass tiles around a visited tile
  const spawnGrassTiles = (centerX, centerY) => {
    const newTiles = {};
    for (let y = centerY - 2; y <= centerY + 2; y++) {
      for (let x = centerX - 2; x <= centerX + 2; x++) {
        if (x >= 0 && x < WORLD_SIZE && y >= 0 && y < WORLD_SIZE) {
          const tileKey = `${x}-${y}`;
          // Only add if it doesn't already exist in tiles
          if (!tiles[tileKey]) {
            // Don't overwrite the market tile
            if (x === spawnPoint.current.x && y === spawnPoint.current.y) {
              newTiles[tileKey] = { x, y, type: 'market' };
            } else {
              newTiles[tileKey] = { x, y, type: 'grass' };
            }
          }
        }
      }
    }
    
    if (Object.keys(newTiles).length > 0) {
      setTiles(prev => ({ ...prev, ...newTiles }));
    }
  };

  // Update handleTouch to handle factory doorway interaction
  const handleTouch = (event) => {
    // Don't allow movement if spawn locked or any dialogue is active
    if (spawnLock || showFarmerDialogue || showFactoryDialogue || showChickenDialogue || showProtagonistDialogue || showAntagonistDialogue) {
      return;
    }

    // Get the raw screen coordinates where the user tapped
    const { pageX, pageY } = event.nativeEvent;
    
    // Convert screen coordinates to world coordinates
    const worldX = pageX - cameraOffset.x;
    const worldY = pageY - cameraOffset.y;

    // Check if user tapped on the factory doorway when inside factory
    if (isInFactory) {
      const doorX = 0;
      const doorY = 9 * TILE_SIZE; // Center of the doorway
      const doorWidth = TILE_SIZE;
      const doorHeight = TILE_SIZE * 3; // 3 tiles tall doorway
      
      if (worldX >= doorX - doorWidth/2 && worldX <= doorX + doorWidth/2 &&
          worldY >= doorY - doorHeight/2 && worldY <= doorY + doorHeight/2) {
        // Exit factory and return to spawn point
        setIsInFactory(false);
        if (spawnPoint.current) {
          const { x, y } = spawnPoint.current;
          const spawnX = x * TILE_SIZE;
          const spawnY = y * TILE_SIZE;
          setPlayerPosition({ x: spawnX, y: spawnY });
          playerRef.current = { x: spawnX, y: spawnY };
          updateCameraOffset();
        }
        return;
      }
    }
    
    // Check if user tapped on the chicken circle
    const circleRadius = 50;
    const centerX = WORLD_SIZE * TILE_SIZE - 200;
    const centerY = 200;
    const distanceFromCenter = Math.sqrt(
      Math.pow(worldX - centerX, 2) + 
      Math.pow(worldY - centerY, 2)
    );
    
    if (distanceFromCenter <= circleRadius + 20) {
      setShowChickenDialogue(true);
      return;
    }
    
    // Check if user tapped on the factory - now with much larger hitbox
    if (!spawnPoint.current) return;
    
    const { x, y } = spawnPoint.current;
    const factoryX = x * TILE_SIZE - FACTORY_SIZE * 1.5 - TILE_SIZE * 2;
    const factoryY = y * TILE_SIZE - FACTORY_SIZE / 2 - TILE_SIZE;
    
    // Calculate the center of the factory
    const factoryCenterX = factoryX + FACTORY_SIZE/2;
    const factoryCenterY = factoryY + FACTORY_SIZE/2;
    
    // Create a much larger hitbox around the factory (200x200 pixels)
    const hitboxSize = 200;
    const isTapOnFactory = (
      worldX >= factoryCenterX - hitboxSize/2 && 
      worldX <= factoryCenterX + hitboxSize/2 && 
      worldY >= factoryCenterY - hitboxSize/2 && 
      worldY <= factoryCenterY + hitboxSize/2
    );
    
    if (isTapOnFactory) {
      setShowFactoryDialogue(true);
      return; // Don't move when opening dialogue
    }
    
    // Cancel any existing movement
    if (isMoving.current) {
      isMoving.current = false;
      setIsWalking(false);
    }
    
    // Check if user tapped on the farmer
    if (farmerPosition) {
      const farmerClickArea = PLAYER_SIZE * 0.75; // Make click area a bit larger than farmer
      const isTapOnFarmer = (
        worldX >= farmerPosition.x - farmerClickArea/2 &&
        worldX <= farmerPosition.x + farmerClickArea/2 &&
        worldY >= farmerPosition.y - farmerClickArea/2 &&
        worldY <= farmerPosition.y + farmerClickArea/2
      );
      
      // Check if player is close enough to interact with farmer
      const playerToFarmerX = farmerPosition.x - playerRef.current.x;
      const playerToFarmerY = farmerPosition.y - playerRef.current.y;
      const distanceToFarmer = Math.sqrt(
        playerToFarmerX * playerToFarmerX + 
        playerToFarmerY * playerToFarmerY
      );
      const isCloseToFarmer = distanceToFarmer < TILE_SIZE * 2.5; // Within 2.5 tiles
      
      if (isTapOnFarmer) {
        if (isCloseToFarmer) {
          // Player is close enough, show the dialogue
          setHasPlayerApproachedFarmer(true);
          setShowFarmerDialogue(true);
          return; // Don't move when opening dialogue
        } else {
          // Player is too far, try to move closer to the farmer
          const angle = Math.atan2(playerToFarmerY, playerToFarmerX);
          const nearFarmerX = farmerPosition.x - Math.cos(angle) * TILE_SIZE * 1.5;
          const nearFarmerY = farmerPosition.y - Math.sin(angle) * TILE_SIZE * 1.5;
          
          // Move to new target
          currentTargetRef.current = { x: nearFarmerX, y: nearFarmerY };
          moveToWithCollisionCheck(nearFarmerX, nearFarmerY);
          return;
        }
      }
    }
    
    // Get market boundaries for interaction check
    const { x: marketX, y: marketY } = spawnPoint.current;
    const marketSize = TILE_SIZE * 3; // 3x3 tiles to match the image size
    const marketLeft = marketX * TILE_SIZE - TILE_SIZE;
    const marketTop = (marketY * TILE_SIZE) - TILE_SIZE * 3.5;
    const marketRight = marketLeft + marketSize;
    const marketBottom = marketTop + marketSize;
    
    // Check if the tap is on the market building
    const isTapOnMarket = (
      worldX >= marketLeft && 
      worldX <= marketRight && 
      worldY >= marketTop && 
      worldY <= marketBottom
    );
    
    // Check if player is close enough to interact with market
    const playerToMarketCenterX = (marketLeft + marketRight) / 2 - playerRef.current.x;
    const playerToMarketCenterY = (marketTop + marketBottom) / 2 - playerRef.current.y;
    const distanceToMarket = Math.sqrt(
      playerToMarketCenterX * playerToMarketCenterX + 
      playerToMarketCenterY * playerToMarketCenterY
    );
    const isCloseToMarket = distanceToMarket < TILE_SIZE * 2.5; // Within 2.5 tiles
    
    // If user tapped on market and is close enough, open market interface
    if (isTapOnMarket) {
      if (isCloseToMarket) {
        setShowMarketRoom(true);
        return; // Don't move player when opening market
      } else {
        // Player is too far, try to move closer to the market
        // Find a point near the market to move to
        const angle = Math.atan2(playerToMarketCenterY, playerToMarketCenterX);
        const nearMarketX = (marketLeft + marketRight) / 2 - Math.cos(angle) * TILE_SIZE * 2;
        const nearMarketY = (marketTop + marketBottom) / 2 - Math.sin(angle) * TILE_SIZE * 2;
        
        // Move to new target
        currentTargetRef.current = { x: nearMarketX, y: nearMarketY };
        moveToWithCollisionCheck(nearMarketX, nearMarketY);
        return;
      }
    }
    
    // Only check for antagonist interaction in Chapter 1
    if (chapter === 1 && showAntagonist && !hasBetterEggs) {
      const antagonistSize = TILE_SIZE * 3;
      const antagonistLeft = antagonistPosition.x - antagonistSize / 2;
      const antagonistTop = antagonistPosition.y - antagonistSize / 2;
      const antagonistRight = antagonistLeft + antagonistSize;
      const antagonistBottom = antagonistTop + antagonistSize;

      if (worldX >= antagonistLeft && worldX <= antagonistRight &&
          worldY >= antagonistTop && worldY <= antagonistBottom) {
        setShowAntagonistDialogue(true);
        return;
      }
    }
    
    // For any other tap, move directly to the tapped location
    currentTargetRef.current = { x: worldX, y: worldY };
    moveToWithCollisionCheck(worldX, worldY);
  };

  // Optimize tile rendering to only render visible tiles
  const renderTile = (tileKey) => {
    const tile = isInFactory ? factoryInteriorTiles[tileKey] : tiles[tileKey];
    if (!tile) return null;
    
    // Only render tiles that are visible in the viewport
    const screenWidth = screenDimensions.current.width;
    const screenHeight = screenDimensions.current.height;
    
    const visibleLeft = -cameraOffset.x;
    const visibleTop = -cameraOffset.y;
    const visibleRight = visibleLeft + screenWidth;
    const visibleBottom = visibleTop + screenHeight;
    
    const tileLeft = tile.x * TILE_SIZE;
    const tileTop = tile.y * TILE_SIZE;
    const tileRight = tileLeft + TILE_SIZE;
    const tileBottom = tileTop + TILE_SIZE;
    
    // Check if tile is visible in viewport
    if (tileRight < visibleLeft || tileLeft > visibleRight || 
        tileBottom < visibleTop || tileTop > visibleBottom) {
      return null;
    }
    
    return (
      <View
        key={tileKey}
        style={[
          styles.tile,
          {
            left: tileLeft,
            top: tileTop,
            backgroundColor: tile.type === 'market' ? '#8B4513' : 
                           tile.type === 'grey' ? '#808080' : 
                           tile.type === 'door' ? '#4A4A4A' :
                           tile.type === 'factoryBorder' ? '#333333' :
                           tile.type === 'path' ? '#8B4513' : 
                           tile.type === 'lightPath' ? '#A0522D' :
                           tile.type === 'darkGrass' ? '#2D5A27' : '#3D8B37',
            opacity: 1,
            borderWidth: 1,
            borderColor: tile.type === 'market' ? '#A0522D' : 
                        tile.type === 'grey' ? '#666666' : 
                        tile.type === 'door' ? '#000000' :
                        tile.type === 'factoryBorder' ? '#000000' :
                        tile.type === 'path' ? '#A0522D' : 
                        tile.type === 'lightPath' ? '#CD853F' :
                        tile.type === 'darkGrass' ? '#1E3D1E' : '#2D5A27'
          }
        ]}
      />
    );
  };

  // Render the market building (larger, 2x2 tiles)
  const renderMarket = () => {
    if (!spawnPoint.current) return null;
    
    const { x, y } = spawnPoint.current;
    const marketSize = TILE_SIZE * 3; // Make market 3x3 tiles to accommodate image
    
    return (
      <View
        style={{
          position: 'absolute',
          width: marketSize,
          height: marketSize, // Adjust height based on image aspect ratio
          left: x * TILE_SIZE - TILE_SIZE, // Center on spawn point
          top: (y * TILE_SIZE) - TILE_SIZE * 3.5, // Keep the position consistent
          zIndex: 8 // Above tiles but below player
        }}
      >
        {/* Market building image */}
        <Image 
          source={marketImage} 
          style={{
            width: '100%',
            height: '100%',
            resizeMode: 'contain'
          }}
        />
      </View>
    );
  };

  // Render shadow overlay for unexplored area
  const renderShadowOverlay = () => {
    // Calculate shadow dimensions to cover the entire world
    return (
      <View style={[
        styles.shadowOverlay,
        {
          width: WORLD_SIZE * TILE_SIZE,
          height: WORLD_SIZE * TILE_SIZE,
        }
      ]} />
    );
  };

  // Render the player character based on direction and walking state
  const renderPlayer = () => {
    // Determine which image to use based on direction
    let playerImage;
    switch(playerDirection) {
      case 'up':
        playerImage = playerBackImage;
        break;
      case 'down':
        playerImage = playerFrontImage;
        break;
      case 'left':
        playerImage = playerLeftImage;
        break;
      case 'right':
        playerImage = playerRightImage;
        break;
      default:
        playerImage = playerFrontImage; // Default fallback
    }

    return (
      <View
        style={[
          styles.playerContainer,
          {
            left: playerPosition.x - PLAYER_SIZE / 2,
            top: playerPosition.y - PLAYER_SIZE / 2,
            width: PLAYER_SIZE,
            height: PLAYER_SIZE,
            // Add padding to ensure the image isn't cut off
            overflow: 'visible'
          }
        ]}
      >
        <Animated.View 
          style={[
            styles.playerBody,
            {
              width: PLAYER_SIZE,
              height: PLAYER_SIZE,
              transform: [
                { translateY: walkingBob }
              ]
            }
          ]}
        >
          <Image 
            source={playerImage} 
            style={{width: PLAYER_SIZE, height: PLAYER_SIZE}}
            resizeMode="contain"
          />
        </Animated.View>
      </View>
    );
  };

  // Render the chicken companion
  const renderChicken = () => {
    if (!chickenPosition) return null;
    
    // Chicken size
    const chickenSize = 24; // Decreased from 32 to 24 to make chicken even smaller
    
    return (
      <View
        style={[
          styles.chickenContainer,
          {
            left: chickenPosition.x - chickenSize / 2,
            top: chickenPosition.y - chickenSize / 2,
            width: chickenSize,
            height: chickenSize,
          }
        ]}
      >
        <Animated.View 
          style={[
            styles.chickenBody,
            {
              transform: [
                { translateY: chickenBob }
              ]
            }
          ]}
        >
          <Image 
            source={chickenImage} 
            style={{width: chickenSize, height: chickenSize}}
            resizeMode="contain"
          />
        </Animated.View>
      </View>
    );
  };

  // Update chicken circle group
  const renderChickenCircle = () => {
    if (chapter === 1) {
      const circleRadius = 50;
      const centerX = WORLD_SIZE * TILE_SIZE - 200;
      const centerY = 200;
      const chickenSize = 24;
      
      const chickenPositions = Array.from({ length: 5 }, (_, i) => {
        const angle = (i * 2 * Math.PI / 5) - Math.PI / 2;
        return {
          x: centerX + circleRadius * Math.cos(angle),
          y: centerY + circleRadius * Math.sin(angle),
          rotation: angle + Math.PI
        };
      });
      
      return (
        <View style={[
          styles.chickenCircleContainer,
          {
            left: centerX - circleRadius - 20,
            top: centerY - circleRadius - 20,
            width: (circleRadius * 2) + 40,
            height: (circleRadius * 2) + 40,
            backgroundColor: 'transparent',
            borderWidth: 0,
          }
        ]}>
          {chickenPositions.map((pos, index) => (
            <View
              key={`circle-chicken-${index}`}
              style={[
                styles.chickenContainer,
                {
                  left: pos.x - centerX + circleRadius + 20,
                  top: pos.y - centerY + circleRadius + 20,
                  width: chickenSize,
                  height: chickenSize,
                  transform: [{ rotate: `${pos.rotation}rad` }]
                }
              ]}
            >
              <Animated.View 
                style={[
                  styles.chickenBody,
                  {
                    transform: [
                      { translateY: chickenBob }
                    ]
                  }
                ]}
              >
                <Image 
                  source={chickenImage} 
                  style={{width: chickenSize, height: chickenSize}}
                  resizeMode="contain"
                />
              </Animated.View>
            </View>
          ))}
        </View>
      );
    } else {
      // Chapter 2: Blood spatters and frantic chicken
      const centerX = WORLD_SIZE * TILE_SIZE - 200;
      const centerY = 200;
      
      return (
        <>
          {/* Blood spatters as part of the ground */}
          <View style={[
            styles.bloodSpatterContainer,
            {
              left: centerX - 100,
              top: centerY - 100,
              width: 200,
              height: 200,
              zIndex: 1 // Place below other elements
            }
          ]}>
            {bloodSpatterPositions.current?.map((pos, i) => (
              <View
                key={`blood-spatter-${i}`}
                style={[
                  styles.bloodSpatter,
                  {
                    left: `${pos.left}%`,
                    top: `${pos.top}%`,
                    width: pos.size,
                    height: pos.size,
                    borderRadius: 0
                  }
                ]}
              />
            ))}
          </View>
          {/* Add frantic chicken with direct position updates */}
          <View
            style={[
              styles.chickenContainer,
              {
                left: franticChickenPos.x - 12,
                top: franticChickenPos.y - 12,
                width: 24,
                height: 24,
                zIndex: 6
              }
            ]}
          >
            <Animated.View 
              style={[
                styles.chickenBody,
                {
                  transform: [
                    { translateY: chickenBob }
                  ]
                }
              ]}
            >
              <Image 
                source={chickenImage} 
                style={{width: 24, height: 24}}
                resizeMode="contain"
              />
            </Animated.View>
          </View>
        </>
      );
    }
  };

  // Render the farmer character
  const renderFarmer = () => {
    if (!farmerPosition) return null;
    
    // Determine which image to use based on direction
    const farmerImage = farmerDirection === 'up' ? farmerBackImage : farmerFrontImage;
    
    return (
      <View
        style={[
          styles.farmerContainer,
          {
            left: farmerPosition.x - PLAYER_SIZE / 2,
            top: farmerPosition.y - PLAYER_SIZE / 2,
            width: PLAYER_SIZE,
            height: PLAYER_SIZE,
            overflow: 'visible',
            zIndex: 9 // Below player but above most elements
          }
        ]}
      >
        <Animated.View 
          style={[
            styles.farmerBody,
            {
              width: PLAYER_SIZE,
              height: PLAYER_SIZE,
              transform: [
                { translateY: farmerBob }
              ]
            }
          ]}
        >
          <Image 
            source={farmerImage} 
            style={{width: PLAYER_SIZE, height: PLAYER_SIZE}}
            resizeMode="contain"
          />
        </Animated.View>
      </View>
    );
  };

  // Debug overlay to show coordinates
  const renderDebugInfo = () => {
    if (!__DEV__) return null;
    
    return (
      <View style={styles.debugOverlay}>
        <Text style={styles.debugText}>
          Player: ({Math.round(playerPosition.x)}, {Math.round(playerPosition.y)})
        </Text>
        {tapMarker && (
          <Text style={styles.debugText}>
            Tap: ({Math.round(tapMarker.screenX)}, {Math.round(tapMarker.screenY)})
          </Text>
        )}
        <Text style={styles.debugText}>
          Camera: ({Math.round(cameraOffset.x)}, {Math.round(cameraOffset.y)})
        </Text>
      </View>
    );
  };

  // Update market room UI with upgrade effects
  const renderMarketRoom = () => {
    if (!showMarketRoom) return null;
    
    return (
      <View style={styles.marketRoomContainer}>
        <View style={styles.marketRoomContent}>
          <Text style={styles.marketRoomTitle}>WELCOME TO THE MARKET</Text>
          
          <View style={styles.marketItems}>
            {marketItems.map((item, index) => (
              <View key={index} style={styles.marketItem}>
                <View style={styles.marketItemIcon}>
                  <Text style={styles.marketItemIconText}>{item.icon}</Text>
                </View>
                <Text style={styles.marketItemText}>
                  {item.name} {item.name === 'Speed Boost' && hasSpeedBoost ? '(Purchased)' : 
                             item.name === 'Chicken Feed' && hasChickenFeed ? '(Purchased)' : 
                             item.name === 'Better Eggs' && hasBetterEggs ? '(Purchased)' : ''}
                </Text>
                <TouchableWithoutFeedback onPress={() => {
                  if (item.price <= eggCount) {
                    setEggCount(prev => prev - item.price);
                    if (item.onPurchase) {
                      item.onPurchase();
                    }
                    switch (item.name) {
                      case 'Speed Boost':
                        setHasSpeedBoost(true);
                        setMoveSpeed(prev => prev * 1.2);
                        break;
                      case 'Chicken Feed':
                        setHasChickenFeed(true);
                        setEggProductionRate(prev => prev + 1);
                        break;
                      case 'Better Eggs':
                        setHasBetterEggs(true);
                        break;
                      case 'Newspaper':
                        setShowNewspaperDialogue(true);
                        break;
                    }
                  }
                }}>
                  <View style={[
                    styles.marketItemPrice,
                    { backgroundColor: (item.price <= eggCount) ? '#4CAF50' : '#9E9E9E' }
                  ]}>
                    <Text style={styles.marketItemPriceText}>{item.price} eggs</Text>
                  </View>
                </TouchableWithoutFeedback>
              </View>
            ))}
          </View>
          
          <TouchableWithoutFeedback onPress={() => setShowMarketRoom(false)}>
            <View style={styles.marketCloseButton}>
              <Text style={styles.marketCloseText}>CLOSE</Text>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </View>
    );
  };

  // Update factory dialogue component
  const renderFactoryDialogue = () => {
    if (!showFactoryDialogue) return null;
    
    return (
      <View style={styles.dialogueContainer}>
        <View style={styles.dialogueContent}>
          <View style={styles.dialogueHeader}>
            <Text style={styles.dialogueTitle}>Factory</Text>
          </View>
          <Text style={styles.dialogueText}>
            {chapter === 2 
              ? "Would you like to enter the factory?"
              : isEggCounterActive 
                ? "You've already started production!"
                : "Welcome to the factory! Eggs are being produced automatically. Each egg is worth 1 coin."}
          </Text>
          {chapter === 2 && (
            <View style={styles.dialogueButtons}>
              <TouchableWithoutFeedback onPress={() => {
                setShowFactoryDialogue(false);
                setIsInFactory(true);
                // Generate factory interior tiles with doorway and border
                const interiorTiles = {};
                for (let y = 0; y < 20; y++) {
                  for (let x = 0; x < 20; x++) {
                    const tileKey = `${x}-${y}`;
                    // Add doorway on the left side (3 tiles tall)
                    if (x === 0 && y >= 8 && y <= 10) {
                      interiorTiles[tileKey] = { 
                        x, 
                        y, 
                        type: 'door'
                      };
                    } else if (x === 0 || x === 19 || y === 0 || y === 19) {
                      // Add border tiles
                      interiorTiles[tileKey] = { 
                        x, 
                        y, 
                        type: 'factoryBorder'
                      };
                    } else {
                      interiorTiles[tileKey] = { 
                        x, 
                        y, 
                        type: 'grey'
                      };
                    }
                  }
                }
                setFactoryInteriorTiles(interiorTiles);
                // Position player in factory
                const centerX = 10 * TILE_SIZE;
                const centerY = 5 * TILE_SIZE; // Start higher up
                setPlayerPosition({ x: centerX, y: centerY });
                playerRef.current = { x: centerX, y: centerY };
                updateCameraOffset();
              }}>
                <View style={styles.dialogueButton}>
                  <Text style={styles.dialogueButtonText}>Yes</Text>
                </View>
              </TouchableWithoutFeedback>
              <TouchableWithoutFeedback onPress={() => {
                setShowFactoryDialogue(false);
              }}>
                <View style={styles.dialogueButton}>
                  <Text style={styles.dialogueButtonText}>No</Text>
                </View>
              </TouchableWithoutFeedback>
            </View>
          )}
          {chapter === 1 && (
            <TouchableWithoutFeedback onPress={() => {
              setShowFactoryDialogue(false);
              if (!isEggCounterActive) {
                setIsEggCounterActive(true);
              }
            }}>
              <View style={styles.dialogueButton}>
                <Text style={styles.dialogueButtonText}>
                  {isEggCounterActive ? "OK" : "Start Production"}
                </Text>
              </View>
            </TouchableWithoutFeedback>
          )}
        </View>
      </View>
    );
  };

  // Farmer dialogue with a more Pokemon-style dialog box
  const renderFarmerDialogue = () => {
    if (!showFarmerDialogue) return null;
    
    return (
      <View style={styles.dialogueContainer}>
        <View style={styles.dialogueContent}>
          <View style={styles.dialogueHeader}>
            <Text style={styles.dialogueTitle}>Farmer</Text>
          </View>
          <Text style={styles.dialogueText}>
            {chapter === 2 
              ? "You're by yourself on this one man.."
              : hasPlayerApproachedFarmer 
                ? "Go find something to do, can't you see I'm busy?!"
                : "Welcome to CluckHero! You must be the new hire, look a bit funny though. You sure you're in the right place? Anyways... I should get to work. Let me know if you have any questions!"}
          </Text>
          <TouchableWithoutFeedback onPress={() => {
            setShowFarmerDialogue(false);
            if (!canMove) {
              setCanMove(true); // Enable movement after dialogue is closed
            }
          }}>
            <View style={styles.dialogueButton}>
              <Text style={styles.dialogueButtonText}>OK</Text>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </View>
    );
  };

  // Update egg counter effect to include upgrades
  useEffect(() => {
    let eggInterval;
    if (isEggCounterActive) {
      eggInterval = setInterval(() => {
        setEggCount(prev => {
          let newCount = prev + eggProductionRate;
          if (hasBetterEggs) {
            newCount += 2; // Add 2 eggs per second instead of doubling
          }
          return newCount;
        });
      }, 1000);
    }
    return () => {
      if (eggInterval) {
        clearInterval(eggInterval);
      }
    };
  }, [isEggCounterActive, eggProductionRate, hasBetterEggs]);

  // Update egg counter component
  const renderEggCounter = () => {
    // Show egg counter in both Chapter 1 and 2
    return (
      <View style={{
        position: 'absolute',
        top: 50,
        right: 10,
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: 10,
        borderRadius: 5,
        shadowColor: '#000',
        shadowOffset: { width: 2, height: 2 },
        shadowOpacity: 0.5,
        shadowRadius: 0
      }}>
        <Text style={{
          color: 'white',
          fontSize: 16,
          fontFamily: 'PressStart2P-Regular',
          letterSpacing: 0,
          lineHeight: 20
        }}>
          Eggs: {eggCount}
        </Text>
      </View>
    );
  };

  // Render the world border
  const renderWorldBorder = () => {
    return (
      <View style={styles.worldBorderContainer}>
        {/* Top border */}
        <View style={[styles.worldBorder, styles.worldBorderTop]} />
        
        {/* Bottom border */}
        <View style={[styles.worldBorder, styles.worldBorderBottom]} />
        
        {/* Left border */}
        <View style={[styles.worldBorder, styles.worldBorderLeft]} />
        
        {/* Right border */}
        <View style={[styles.worldBorder, styles.worldBorderRight]} />
        
        {/* Corner pieces */}
        <View style={[styles.worldBorderCorner, { top: 0, left: 0 }]} />
        <View style={[styles.worldBorderCorner, { top: 0, right: 0 }]} />
        <View style={[styles.worldBorderCorner, { bottom: 0, left: 0 }]} />
        <View style={[styles.worldBorderCorner, { bottom: 0, right: 0 }]} />
      </View>
    );
  };

  // Start the farmer greeting sequence
  const startFarmerGreeting = () => {
    hasFarmerGreeted.current = true;
    setIsFarmerWalking(true);
    
    // Calculate a position with more space between farmer and player
    const targetX = playerRef.current.x + TILE_SIZE * 2.5; // Increased from 1 to 2.5 tiles away
    const targetY = playerRef.current.y;                   // Same Y position
    
    // Set initial facing direction based on relative position
    const dx = targetX - farmerRef.current.x;
    const dy = targetY - farmerRef.current.y;
    
    if (Math.abs(dx) > Math.abs(dy)) {
      setFarmerDirection(dx > 0 ? 'right' : 'left');
    } else {
      setFarmerDirection(dy > 0 ? 'down' : 'up');
    }
    
    // Start farmer walking animation
    animateFarmerToPosition(targetX, targetY, () => {
      // When the farmer reaches the position, face the player
      setFarmerDirection('left'); // Assuming player is to the left of the farmer now
      
      // Create a talking animation effect before showing dialogue
      const talkingAnimation = Animated.sequence([
        Animated.timing(farmerBob, { toValue: -2, duration: 150, useNativeDriver: true, easing: Easing.sine }),
        Animated.timing(farmerBob, { toValue: 0, duration: 150, useNativeDriver: true, easing: Easing.sine }),
        Animated.timing(farmerBob, { toValue: -2, duration: 150, useNativeDriver: true, easing: Easing.sine }),
        Animated.timing(farmerBob, { toValue: 0, duration: 150, useNativeDriver: true, easing: Easing.sine })
      ]);
      
      // Run the talking animation twice
      Animated.sequence([
        talkingAnimation,
        talkingAnimation
      ]).start(() => {
        // After talking animation, show dialogue
        setIsFarmerWalking(false);
        setShowFarmerDialogue(true);
      });
    });
  };

  // Animate the farmer walking to a specific position
  const animateFarmerToPosition = (targetX, targetY, onComplete) => {
    const dx = targetX - farmerRef.current.x;
    const dy = targetY - farmerRef.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Set direction based on movement
    if (Math.abs(dx) > Math.abs(dy)) {
      setFarmerDirection(dx > 0 ? 'right' : 'left');
    } else {
      setFarmerDirection(dy > 0 ? 'down' : 'up');
    }
    
    // Calculate duration based on distance
    const duration = (distance / moveSpeed) * 1000; // Use base MOVE_SPEED without multiplier
    
    // Animate in smaller steps for smoother movement
    const steps = Math.max(40, Math.floor(duration / 16)); // Increased from 20 to 40 for smoother motion
    const incrementX = dx / steps;
    const incrementY = dy / steps;
    
    let currentStep = 0;
    
    const moveStep = () => {
      if (currentStep >= steps) {
        // Animation complete
        farmerRef.current = { x: targetX, y: targetY };
        setFarmerPosition({ x: targetX, y: targetY });
        if (onComplete) onComplete();
        return;
      }
      
      // Update farmer position with a slight easing effect for smoother motion
      const progress = currentStep / steps;
      const easedProgress = 0.5 - Math.cos(progress * Math.PI) / 2; // Simple easing function
      
      farmerRef.current = {
        x: farmerRef.current.x + incrementX,
        y: farmerRef.current.y + incrementY
      };
      
      setFarmerPosition({ ...farmerRef.current });
      
      currentStep++;
      requestAnimationFrame(moveStep);
    };
    
    // Start animation
    moveStep();
  };

  // Add factory animation effect
  useEffect(() => {
    // Animate factory between states
    factoryAnimationRef.current = setInterval(() => {
      setFactoryAnimationState(prev => (prev % 3) + 1); // Cycle through 1, 2, 3
    }, 1000); // Switch every second

    return () => {
      if (factoryAnimationRef.current) {
        clearInterval(factoryAnimationRef.current);
      }
    };
  }, []);

  // Add factory rendering function
  const renderFactory = () => {
    if (!spawnPoint.current) return null;
    
    const { x, y } = spawnPoint.current;
    const factoryX = x * TILE_SIZE - FACTORY_SIZE * 1.5 - TILE_SIZE * 2; // Move left by 2 tiles
    const factoryY = y * TILE_SIZE - FACTORY_SIZE / 2 - TILE_SIZE; // Move up by 1 tile
    
    return (
      <View
        style={{
          position: 'absolute',
          width: FACTORY_SIZE,
          height: FACTORY_SIZE,
          left: factoryX,
          top: factoryY,
          zIndex: 7,
          backgroundColor: 'transparent'
        }}
      >
        <Image 
          source={factoryAnimationState === 1 ? factory1Image : 
                 factoryAnimationState === 2 ? factory2Image : factory3Image} 
          style={{
            width: '100%',
            height: '100%',
            resizeMode: 'contain',
            position: 'absolute'
          }}
        />
        {/* Add solid hitbox for factory interaction - now matches image size */}
        <View
          style={{
            position: 'absolute',
            width: FACTORY_SIZE,
            height: FACTORY_SIZE,
            left: 0,
            top: 0,
            backgroundColor: 'transparent',
            zIndex: 8
          }}
        />
      </View>
    );
  };

  // Add chicken dialogue component
  const renderChickenDialogue = () => {
    if (!showChickenDialogue) return null;
    
    return (
      <View style={styles.dialogueContainer}>
        <View style={styles.dialogueContent}>
          <View style={styles.dialogueHeader}>
            <Text style={styles.dialogueTitle}>You</Text>
          </View>
          <Text style={styles.dialogueText}>
            {chapter === 1 
              ? "Gluck gluck. Gluck? GLUCK?"
              : "What the cluck... what have I gotten myself into.."}
          </Text>
          <TouchableWithoutFeedback onPress={() => {
            setShowChickenDialogue(false);
            if (chapter === 1) {
              setShowProtagonistDialogue(true);
            }
          }}>
            <View style={styles.dialogueButton}>
              <Text style={styles.dialogueButtonText}>OK</Text>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </View>
    );
  };

  // Add protagonist dialogue component
  const renderProtagonistDialogue = () => {
    if (!showProtagonistDialogue) return null;
    
    return (
      <View style={styles.dialogueContainer}>
        <View style={styles.dialogueContent}>
          <View style={styles.dialogueHeader}>
            <Text style={styles.dialogueTitle}>You</Text>
          </View>
          <Text style={styles.dialogueText}>
            I'm beginning to think this isn't just a simple clicker game...
          </Text>
          <TouchableWithoutFeedback onPress={() => setShowProtagonistDialogue(false)}>
            <View style={styles.dialogueButton}>
              <Text style={styles.dialogueButtonText}>OK</Text>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </View>
    );
  };

  const renderCoordinates = () => {
    return (
      <View style={{
        position: 'absolute',
        top: 50, // Moved down from 30 to 50
        left: 10,
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: 6,
        borderRadius: 4,
        zIndex: 10
      }}>
        <Text style={{
          color: 'white',
          fontSize: 10,
          fontFamily: 'PressStart2P-Regular'
        }}>
          X: {Math.floor(playerPosition.x)} Y: {Math.floor(playerPosition.y)}
        </Text>
      </View>
    );
  };

  // Add antagonist movement effect
  useEffect(() => {
    if (!showAntagonist || !hasBetterEggs) return;

    // Calculate center coordinates
    const centerX = Math.floor(WORLD_SIZE / 2);
    const centerY = Math.floor(WORLD_SIZE / 2);

    const moveInterval = setInterval(() => {
      const dx = playerPosition.x - antagonistRef.current.x;
      const dy = playerPosition.y - antagonistRef.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // If returning to spawn
      if (antagonistReturning) {
        const spawnDx = (centerX * TILE_SIZE) - antagonistRef.current.x;
        const spawnDy = ((WORLD_SIZE - 3) * TILE_SIZE) - antagonistRef.current.y;
        const spawnDistance = Math.sqrt(spawnDx * spawnDx + spawnDy * spawnDy);

        if (spawnDistance > 1) {
          const speed = 3;
          const moveX = (spawnDx / spawnDistance) * speed;
          const moveY = (spawnDy / spawnDistance) * speed;

          antagonistRef.current = {
            x: antagonistRef.current.x + moveX,
            y: antagonistRef.current.y + moveY
          };
          setAntagonistPosition(antagonistRef.current);

          // Update direction based on movement
          if (Math.abs(spawnDx) > Math.abs(spawnDy)) {
            setAntagonistDirection(spawnDx > 0 ? 'front' : 'back');
          }
        } else {
          // Reached spawn position
          setAntagonistReturning(false);
          setShowAntagonist(false); // Hide antagonist after reaching spawn
        }
        return;
      }

      // Only move if distance is greater than 4 tiles (128 pixels)
      if (distance > TILE_SIZE * 4) {
        const speed = 3;
        const moveX = (dx / distance) * speed;
        const moveY = (dy / distance) * speed;

        antagonistRef.current = {
          x: antagonistRef.current.x + moveX,
          y: antagonistRef.current.y + moveY
        };
        setAntagonistPosition(antagonistRef.current);

        // Update direction based on movement
        if (Math.abs(dx) > Math.abs(dy)) {
          setAntagonistDirection(dx > 0 ? 'front' : 'back');
        }
      } else if (!antagonistReachedPlayer) {
        // Reached player for the first time
        setAntagonistReachedPlayer(true);
        setShowAntagonistDialogue(true);
      }
    }, 16); // ~60fps

    return () => clearInterval(moveInterval);
  }, [showAntagonist, playerPosition, hasBetterEggs, antagonistReachedPlayer, antagonistReturning]);

  // Update market purchase handler
  const handleMarketPurchase = (item) => {
    if (eggCount < item.price) return;

    setEggCount(prev => prev - item.price);
    
    switch (item.name) {
      case 'Speed Boost':
        setHasSpeedBoost(true);
        setMoveSpeed(prev => prev * 1.2);
        break;
      case 'Chicken Feed':
        setHasChickenFeed(true);
        setEggProductionRate(prev => prev + 1);
        break;
      case 'Better Eggs':
        setHasBetterEggs(true);
        break;
      case 'Newspaper':
        setShowMarketRoom(false);
        setShowNewspaperDialogue(true);
        break;
    }
  };

  // Update antagonist rendering to only show in Chapter 1
  const renderAntagonist = () => {
    if (!showAntagonist || chapter !== 1) return null;

    return (
      <View
        style={{
          position: 'absolute',
          left: antagonistPosition.x - TILE_SIZE * 1.5,
          top: antagonistPosition.y - TILE_SIZE * 1.5,
          width: TILE_SIZE * 3,
          height: TILE_SIZE * 3,
          zIndex: 6,
          backgroundColor: 'transparent'
        }}
      >
        <Image
          source={antagonistDirection === 'front' ? antagonistFrontImage : antagonistBackImage}
          style={{
            width: '100%',
            height: '100%',
            resizeMode: 'contain'
          }}
        />
      </View>
    );
  };

  // Update market items with new prices
  const marketItems = chapter === 1 ? [
    {
      name: 'Speed Boost',
      description: 'Move 20% faster',
      price: 25,
      icon: '🏃'
    },
    {
      name: 'Chicken Feed',
      description: 'Increase egg production by 1 per second',
      price: 25,
      icon: '🌾'
    },
    {
      name: 'Better Eggs',
      description: 'Add 2 eggs per second',
      price: 100,
      icon: '🥚'
    }
  ] : [
    {
      name: 'Newspaper',
      description: 'Read the latest news',
      price: 10,
      icon: '📰'
    },
    {
      name: 'ID Card',
      description: 'Official identification',
      price: 2000,
      icon: '🪪'
    }
  ];

  // Add antagonist dialogue component
  const renderAntagonistDialogue = () => {
    if (!showAntagonistDialogue) return null;
    
    return (
      <View style={styles.dialogueContainer}>
        <View style={styles.dialogueContent}>
          <View style={styles.dialogueHeader}>
            <Text style={styles.dialogueTitle}>???</Text>
          </View>
          <Text style={styles.dialogueText}>
            {antagonistReachedPlayer 
              ? "You must be the new kid... you've got a lot to learn about this place."
              : "Patience...patience..."}
          </Text>
          <TouchableWithoutFeedback onPress={() => {
            setShowAntagonistDialogue(false);
            if (antagonistReachedPlayer) {
              setAntagonistReturning(true);
              // Start the sequence after antagonist starts returning
              setTimeout(() => {
                setShowSelfDialogue(true);
              }, 2000);
            }
          }}>
            <View style={styles.dialogueButton}>
              <Text style={styles.dialogueButtonText}>OK</Text>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </View>
    );
  };

  // Add self dialogue component
  const renderSelfDialogue = () => {
    if (!showSelfDialogue) return null;
    
    return (
      <View style={styles.dialogueContainer}>
        <View style={styles.dialogueContent}>
          <View style={styles.dialogueHeader}>
            <Text style={styles.dialogueTitle}>You</Text>
          </View>
          <Text style={styles.dialogueText}>
            {chapter === 1 
              ? "What is this 'place'???"
              : "This place looks different..."}
          </Text>
          <TouchableWithoutFeedback onPress={async () => {
            setShowSelfDialogue(false);
            
            // Start screen fade
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 2000,
              useNativeDriver: true,
              easing: Easing.inOut(Easing.ease)
            }).start(async () => {
              // After screen fade completes, show chapter text
              setShowChapterText(true);
              
              // Clean up Chapter 1 if transitioning to Chapter 2
              if (chapter === 1) {
                cleanupChapter1();
              }
              
              // Fade out music over 2 seconds
              if (sound) {
                try {
                  await sound.setVolumeAsync(0, { fadeDuration: 2000 });
                  await sound.stopAsync();
                } catch (error) {
                  console.error('Error fading music:', error);
                }
              }
              
              // After 10 seconds, fade out chapter text and navigate
              setTimeout(() => {
                Animated.timing(fadeAnim, {
                  toValue: 0,
                  duration: 2000,
                  useNativeDriver: true,
                  easing: Easing.inOut(Easing.ease)
                }).start(() => {
                  setShowChapterText(false);
                  if (chapter === 1) {
                    navigation.navigate('Chapter2');
                  }
                });
              }, 10000);
            });
          }}>
            <View style={styles.dialogueButton}>
              <Text style={styles.dialogueButtonText}>OK</Text>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </View>
    );
  };

  // Add fade overlay and chapter text with smooth animation
  const renderFadeAndChapter = () => {
    if (fadeAnim._value === 0 && !showChapterText) return null;

    return (
      <Animated.View style={[
        styles.fadeOverlay,
        { 
          opacity: fadeAnim,
          backgroundColor: 'black'
        }
      ]}>
        {showChapterText && (
          <Animated.View style={{
            opacity: fadeAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 1]
            }),
            transform: [{
              scale: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.8, 1]
              })
            }]
          }}>
            <Text style={styles.chapterText}>
              CHAPTER {chapter + 1}
            </Text>
          </Animated.View>
        )}
      </Animated.View>
    );
  };

  // Add spawn lock timer effect
  useEffect(() => {
    const spawnTimer = setTimeout(() => {
      setSpawnLock(false);
    }, 5000); // 5 seconds

    return () => clearTimeout(spawnTimer);
  }, []);

  // Initialize audio
  useEffect(() => {
    let isMounted = true;
    console.log('Initializing audio...');

    const setupAudio = async () => {
      try {
        console.log('Setting up audio mode...');
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: true,
        });
        console.log('Audio mode set up successfully');

        // Only load Chapter 1 music if we're in Chapter 1
        if (chapter === 1) {
          console.log('Loading sound file...');
          const { sound: audioSound } = await Audio.Sound.createAsync(
            chapter1Music,
            { 
              shouldPlay: true,
              volume: 1.0,
              isLooping: true
            }
          );
          console.log('Sound loaded successfully');

          if (isMounted) {
            setSound(audioSound);
            setIsMusicPlaying(true);
            console.log('Sound state updated');
          }
        } else {
          // In Chapter 2, use the provided sound from Chapter2 component
          setSound(chapter2Sound);
          setIsMusicPlaying(chapter2MusicPlaying);
        }
      } catch (error) {
        console.error('Error in audio setup:', error);
      }
    };

    setupAudio();

    return () => {
      console.log('Cleaning up audio...');
      isMounted = false;
      if (sound && chapter === 1) { // Only unload if it's Chapter 1's sound
        sound.unloadAsync().catch(error => {
          console.error('Error unloading sound:', error);
        });
      }
    };
  }, [chapter, chapter2Sound, chapter2MusicPlaying]);

  // Function to start music
  const startMusic = async () => {
    console.log('Attempting to start music...');
    if (!sound) {
      console.log('No sound object available');
      return;
    }

    try {
      console.log('Setting up sound...');
      await sound.setPositionAsync(0);
      await sound.setVolumeAsync(1.0);
      await sound.setIsLoopingAsync(true);
      console.log('Playing sound...');
      await sound.playAsync();
      setIsMusicPlaying(true);
      console.log('Music started successfully');
    } catch (error) {
      console.error('Error playing music:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
    }
  };

  // Start music when antagonist reaches player
  useEffect(() => {
    console.log('Checking antagonist state:', {
      reachedPlayer: antagonistReachedPlayer,
      isMusicPlaying
    });
    if (antagonistReachedPlayer && !isMusicPlaying) {
      console.log('Antagonist reached player, starting music');
      startMusic();
    }
  }, [antagonistReachedPlayer, isMusicPlaying]);

  // Add effect to show explore alert after farmer dialogue
  useEffect(() => {
    if (canMove && chapter === 1) { // Only show in Chapter 1
      const timer = setTimeout(() => {
        setShowExploreAlert(true);
        // Start pulsing animation
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.2,
              duration: 1000,
              useNativeDriver: true,
              easing: Easing.inOut(Easing.ease)
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 1000,
              useNativeDriver: true,
              easing: Easing.inOut(Easing.ease)
            })
          ])
        ).start();

        // Hide alert after 5 seconds
        setTimeout(() => {
          setShowExploreAlert(false);
        }, 5000);
      }, 15000); // Show after 15 seconds

      return () => clearTimeout(timer);
    }
  }, [canMove, chapter]);

  // Add render function for explore alert
  const renderExploreAlert = () => {
    if (!showExploreAlert) return null;

    return (
      <Animated.View style={[
        styles.exploreAlert,
        {
          transform: [{ scale: pulseAnim }],
          opacity: pulseAnim.interpolate({
            inputRange: [1, 1.2],
            outputRange: [0.8, 1]
          })
        }
      ]}>
        <Text style={styles.exploreAlertText}>Explore the Map</Text>
      </Animated.View>
    );
  };

  // Initialize blood spatter positions once
  useEffect(() => {
    if (chapter === 2 && !bloodSpatterPositions.current) {
      bloodSpatterPositions.current = Array.from({ length: 50 }, (_, i) => ({
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: 2 + Math.random() * 3
      }));
    }
  }, [chapter]);

  // Initialize rain drops with varying properties
  useEffect(() => {
    if (chapter === 2 && !rainDrops.current) {
      // Reduce number of drops to 15 for maximum performance
      rainDrops.current = Array.from({ length: 15 }, () => ({
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 1 + Math.random() * 2,
        speed: 0.5 + Math.random() * 0.5,
        opacity: 0.3 + Math.random() * 0.4,
        wind: -0.2 + Math.random() * 0.4
      }));
    }
  }, [chapter]);

  // Add thunderstorm effect for Chapter 2 with optimized performance
  useEffect(() => {
    if (chapter === 2) {
      // Reset the animation value
      rainAnim.setValue(0);
      
      // Create a continuous rain animation with optimized timing
      const rainAnimation = Animated.loop(
        Animated.timing(rainAnim, {
          toValue: 1,
          duration: 600, // Even faster animation for better performance
          useNativeDriver: true,
          easing: Easing.linear
        })
      );

      // Store and start the animation
      rainAnimationRef.current = rainAnimation;
      rainAnimation.start();

      // Optimize lightning effect
      const lightningInterval = setInterval(() => {
        if (Math.random() < 0.01) { // Further reduced frequency
          setLightningFlash(true);
          setTimeout(() => setLightningFlash(false), 5); // Shorter duration
        }
      }, 20000); // Much less frequent lightning

      return () => {
        // Proper cleanup
        if (rainAnimationRef.current) {
          rainAnimationRef.current.stop();
          rainAnimationRef.current = null;
        }
        clearInterval(lightningInterval);
        rainAnim.setValue(0);
      };
    }
  }, [chapter, rainAnim]);

  // Update rain rendering to be more performant
  const renderThunderstorm = () => {
    if (chapter !== 2) return null;

    return (
      <>
        {/* Dark overlay for storm with optimized transitions */}
        <Animated.View style={[
          styles.thunderstormOverlay,
          { 
            opacity: lightningFlash ? 0.1 : 0.7,
            backgroundColor: lightningFlash ? '#ffffff' : '#1a1a2e'
          }
        ]} />
        
        {/* Rain effect with optimized rendering */}
        <View style={styles.rainContainer}>
          {rainDrops.current?.map((drop, i) => (
            <Animated.View
              key={i}
              style={[
                styles.rainDrop,
                {
                  left: `${drop.x}%`,
                  top: `${drop.y}%`,
                  width: drop.size,
                  height: drop.size * 4,
                  opacity: drop.opacity,
                  transform: [
                    {
                      translateY: rainAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 150 * drop.speed] // Reduced distance for better performance
                      })
                    },
                    {
                      translateX: rainAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 5 * drop.wind] // Reduced wind effect
                      })
                    }
                  ]
                }
              ]}
            />
          ))}
        </View>
      </>
    );
  };

  // Add render function for lantern and light effect
  const renderLantern = () => {
    if (chapter !== 2) return null;

    // Get the current torch image based on frame
    const torchImage = [torch0Image, torch1Image, torch2Image][torchFrame];

    return (
      <>
        {/* Torch itself */}
        <View style={[
          styles.lantern,
          {
            left: 722 - 3 * TILE_SIZE + TILE_SIZE * 3, // Move one more tile right
            top: 715 - TILE_SIZE * 2, // Move one tile up
          }
        ]}>
          <Image 
            source={torchImage}
            style={[styles.torchImage, {
              width: 256, // Keep the same size
              height: 256,
            }]}
          />
        </View>
      </>
    );
  };

  // Add newspaper dialogue component
  const renderNewspaperDialogue = () => {
    if (!showNewspaperDialogue) return null;
    
    return (
      <View style={styles.newspaperContainer}>
        <View style={styles.newspaperContent}>
          <View style={styles.newspaperHeader}>
            <Text style={styles.newspaperTitle}>DAILY NEWS</Text>
            <Text style={styles.newspaperDate}>March 13, 2027</Text>
          </View>
          <View style={styles.newspaperBody}>
            <Text style={styles.newspaperHeadline}>BREAKING! PROTESTS!</Text>
            <Text style={styles.newspaperText}>
              The Cluckville community has had enough of the Evil Factory, but don't take it from us. A picket line has formed outside of the company's headquarters, with no sign of slowing down anytime soon.
            </Text>
          </View>
          <TouchableWithoutFeedback onPress={() => setShowNewspaperDialogue(false)}>
            <View style={styles.newspaperButton}>
              <Text style={styles.newspaperButtonText}>Close</Text>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </View>
    );
  };

  // Add effect for frantic chicken movement
  useEffect(() => {
    if (chapter === 2) {
      // Start the frantic chicken movement with direct position updates
      franticChickenTimer.current = setInterval(() => {
        const centerX = WORLD_SIZE * TILE_SIZE - 200;
        const centerY = 200;
        const radius = 100; // Keep within the spatter area
        
        // Calculate new random position within the circle
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * radius;
        const newX = centerX + Math.cos(angle) * distance;
        const newY = centerY + Math.sin(angle) * distance;
        
        // Update position directly
        setFranticChickenPos({ x: newX, y: newY });
      }, 1000); // Move every second

      return () => {
        if (franticChickenTimer.current) {
          clearInterval(franticChickenTimer.current);
        }
      };
    }
  }, [chapter]);

  // Add cleanup function for Chapter 1
  const cleanupChapter1 = () => {
    // Stop and unload Chapter 1 music
    if (sound && chapter === 1) {
      try {
        sound.stopAsync();
        sound.unloadAsync();
      } catch (error) {
        console.log('Sound already unloaded or not loaded');
      }
    }
    
    // Reset Chapter 1 specific state
    setShowFarmerDialogue(false);
    setShowFactoryDialogue(false);
    setShowChickenDialogue(false);
    setShowProtagonistDialogue(false);
    setShowExploreAlert(false);
    setHasPlayerApproachedFarmer(false);
    setFarmerPosition(null);
    setChickenPosition(null);
    setEggCount(0);
    setIsEggCounterActive(false);
    setHasSpeedBoost(false);
    setHasChickenFeed(false);
    setHasBetterEggs(false);
    setEggProductionRate(1);
    setMoveSpeed(400);
    
    // Clear any intervals or timeouts
    if (franticChickenTimer.current) {
      clearInterval(franticChickenTimer.current);
    }
    if (factoryAnimationRef.current) {
      clearInterval(factoryAnimationRef.current);
    }
  };

  // Add torch animation effect
  useEffect(() => {
    if (chapter === 2) {
      torchAnimationRef.current = setInterval(() => {
        setTorchFrame(prev => (prev + 1) % 3);
      }, 1000); // Slow down animation from 500ms to 1000ms
    }

    return () => {
      if (torchAnimationRef.current) {
        clearInterval(torchAnimationRef.current);
      }
    };
  }, [chapter]);

  return (
    <TouchableWithoutFeedback onPress={handleTouch}>
      <View style={styles.container}>
        <View 
          ref={worldRef}
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
          {/* Dark background for unexplored areas */}
          <View style={styles.unexploredBackground} />
          
          {/* Add thunderstorm effects - only show outside factory */}
          {!isInFactory && renderThunderstorm()}
          
          {/* Add lantern and light effect - only show outside factory */}
          {!isInFactory && renderLantern()}
          
          {/* Render world border - only show outside factory */}
          {!isInFactory && renderWorldBorder()}
          
          {/* Render all tiles - they will be filtered by renderTile */}
          {Object.keys(tiles).map(tileKey => renderTile(tileKey))}
          
          {/* Render factory - only show outside factory */}
          {!isInFactory && renderFactory()}
          
          {/* Render chicken companion - only show outside factory */}
          {!isInFactory && renderChicken()}
          
          {/* Render chicken circle group - only show outside factory */}
          {!isInFactory && renderChickenCircle()}
          
          {/* Render farmer - only show outside factory */}
          {!isInFactory && renderFarmer()}
          
          {/* Render market building - only show outside factory */}
          {!isInFactory && renderMarket()}
          
          {/* Render antagonist - only show outside factory */}
          {!isInFactory && renderAntagonist()}
          
          {/* Render player (only once) */}
          {renderPlayer()}
        </View>
        {/* Still call renderTapMarker() to maintain code structure */}
        {renderTapMarker()}
        
        {/* Market room UI overlay - only show outside factory */}
        {!isInFactory && renderMarketRoom()}
        
        {/* Farmer dialogue - only show outside factory */}
        {!isInFactory && renderFarmerDialogue()}
        
        {/* Factory dialogue - only show outside factory */}
        {!isInFactory && renderFactoryDialogue()}
        
        {/* Chicken dialogue - only show outside factory */}
        {!isInFactory && renderChickenDialogue()}
        
        {/* Protagonist dialogue - only show outside factory */}
        {!isInFactory && renderProtagonistDialogue()}
        
        {/* Antagonist dialogue - only show outside factory */}
        {!isInFactory && renderAntagonistDialogue()}
        
        {/* Egg counter - only show outside factory */}
        {!isInFactory && renderEggCounter()}
        {renderCoordinates()}
        
        {/* Self dialogue - only show outside factory */}
        {!isInFactory && renderSelfDialogue()}
        
        {/* Fade overlay and chapter text - only show outside factory */}
        {!isInFactory && renderFadeAndChapter()}
        
        {/* Add explore alert to the render list - only show outside factory */}
        {!isInFactory && renderExploreAlert()}
        
        {/* Add newspaper dialogue to the render list - only show outside factory */}
        {!isInFactory && renderNewspaperDialogue()}
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#222', // Dark background color
    overflow: 'hidden'
  },
  world: {
    position: 'absolute',
    width: WORLD_SIZE * TILE_SIZE,
    height: WORLD_SIZE * TILE_SIZE
  },
  unexploredBackground: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: '#1a3c59', // Dark blue color for unexplored areas
    borderWidth: 2,
    borderColor: '#111',
    // Add a pattern to make it look like unexplored territory
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  tile: {
    position: 'absolute',
    width: TILE_SIZE,
    height: TILE_SIZE
  },
  // Market building styles (market stand with shopkeeper)
  marketBuilding: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 7
  },
  marketCounter: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: '50%',
    backgroundColor: '#A0522D', // Dark brown counter
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#8B4513', // Brown border
    zIndex: 8
  },
  marketRoof: {
    position: 'absolute',
    top: 0,
    width: '110%', // Slightly wider than the stand
    height: '20%',
    backgroundColor: '#A0522D', // Brown roof
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderWidth: 2, 
    borderColor: '#8B4513',
    zIndex: 9,
    transform: [{ translateX: 0 }] // Center properly
  },
  marketSign: {
    position: 'absolute',
    top: -30, // Move sign further up to be fully visible
    width: '80%', // Increased width to fit text
    height: TILE_SIZE / 2, // Set explicit height
    backgroundColor: '#FFD700', // Gold sign
    borderWidth: 1,
    borderColor: '#DAA520',
    zIndex: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 5
  },
  marketSignText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#8B4513',
    textAlign: 'center',
    fontFamily: 'PressStart2P-Regular'
  },
  // Shopkeeper styles
  shopkeeper: {
    position: 'absolute',
    width: '50%',
    height: '45%',
    top: '25%', // Moved down a bit to ensure visibility
    zIndex: 10,
    alignItems: 'center' // Center shopkeeper
  },
  shopkeeperHead: {
    position: 'absolute',
    width: 24,
    height: 24,
    backgroundColor: '#FFE4B5', // Peach skin tone
    borderRadius: 12,
    top: 0,
    zIndex: 11
  },
  shopkeeperEye: {
    position: 'absolute',
    width: 3,
    height: 3,
    backgroundColor: '#000',
    borderRadius: 1.5,
    top: 8
  },
  shopkeeperSmile: {
    position: 'absolute',
    width: 8,
    height: 4,
    borderBottomWidth: 2,
    borderBottomColor: '#000',
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    bottom: 6,
    left: '50%',
    marginLeft: -4
  },
  shopkeeperBody: {
    position: 'absolute',
    width: 28,
    height: 20,
    backgroundColor: '#228B22', // Forest green outfit
    borderRadius: 5,
    top: 22,
    left: '50%',
    marginLeft: -14
  },
  playerContainer: {
    position: 'absolute',
    width: PLAYER_SIZE,
    height: PLAYER_SIZE,
    zIndex: 10, // Make sure player is above chicken and tiles
    overflow: 'visible'
  },
  playerBody: {
    width: PLAYER_SIZE,
    height: PLAYER_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible'
  },
  playerImage: {
    width: '100%',
    height: '100%',
    position: 'absolute'
  },
  debugOverlay: {
    position: 'absolute',
    top: 40,
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 5,
    zIndex: 30
  },
  debugText: {
    color: 'white',
    fontSize: 12,
    fontFamily: 'PressStart2P-Regular', // Pixelated font
    letterSpacing: 0,
    lineHeight: 16
  },
  shadowOverlay: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
  },
  // Chicken styles
  chickenContainer: {
    position: 'absolute',
    zIndex: 5, // Make sure chicken is behind player
    pointerEvents: 'none', // Don't intercept touches
    backgroundColor: 'transparent',
    overflow: 'visible'
  },
  chickenBody: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative'
  },
  chickenImage: {
    width: '100%',
    height: '100%',
    position: 'absolute'
  },
  // Market room styles
  marketRoomContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 50
  },
  marketRoomContent: {
    width: '80%',
    maxWidth: 400,
    backgroundColor: '#8B4513',
    borderRadius: 10,
    padding: 20,
    borderWidth: 3,
    borderColor: '#FFD700'
  },
  marketRoomTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'PressStart2P-Regular'
  },
  marketItems: {
    marginVertical: 10
  },
  marketItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 5,
    padding: 10,
    marginVertical: 5
  },
  marketItemIcon: {
    width: 30,
    height: 30,
    backgroundColor: '#FFD700',
    borderRadius: 15,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden'
  },
  marketItemIconText: {
    fontSize: 16,
    fontFamily: 'PressStart2P-Regular'
  },
  marketItemText: {
    flex: 1,
    color: 'white',
    fontSize: 12,
    fontFamily: 'PressStart2P-Regular'
  },
  marketItemPrice: {
    padding: 5,
    borderRadius: 5,
    minWidth: 80,
    alignItems: 'center'
  },
  marketItemPriceText: {
    color: 'white',
    fontSize: 12,
    fontFamily: 'PressStart2P-Regular'
  },
  marketCloseButton: {
    backgroundColor: '#D2B48C',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 20
  },
  marketCloseText: {
    color: '#8B4513',
    fontSize: 12,
    fontFamily: 'PressStart2P-Regular'
  },
  worldBorderContainer: {
    position: 'absolute',
    width: WORLD_SIZE * TILE_SIZE,
    height: WORLD_SIZE * TILE_SIZE,
    zIndex: 6 // Above background but below player and other elements
  },
  worldBorder: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderWidth: 4,
    borderColor: '#FFD700', // Gold border
    borderStyle: 'solid'
  },
  worldBorderTop: {
    top: 0,
    left: 0,
    right: 0,
    height: 8
  },
  worldBorderBottom: {
    bottom: 0,
    left: 0,
    right: 0,
    height: 8
  },
  worldBorderLeft: {
    top: 0,
    left: 0,
    bottom: 0,
    width: 8
  },
  worldBorderRight: {
    top: 0,
    right: 0,
    bottom: 0,
    width: 8
  },
  worldBorderCorner: {
    position: 'absolute',
    width: 16,
    height: 16,
    backgroundColor: '#FFD700', // Gold corners
    borderWidth: 1,
    borderColor: '#B8860B' // Darker gold outline
  },
  farmerContainer: {
    position: 'absolute',
    zIndex: 9, // Below player but above most elements
    pointerEvents: 'none', // Don't intercept touches
    backgroundColor: 'transparent',
    overflow: 'visible'
  },
  farmerBody: {
    width: PLAYER_SIZE,
    height: PLAYER_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative'
  },
  dialogueContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    zIndex: 100,
    padding: 20
  },
  dialogueContent: {
    width: '100%',
    backgroundColor: '#000',
    borderRadius: 10,
    padding: 15,
    borderWidth: 3,
    borderColor: '#FFF',
    marginBottom: 40
  },
  dialogueHeader: {
    borderBottomWidth: 1,
    borderBottomColor: '#6A9EEC',
    paddingBottom: 8,
    marginBottom: 12
  },
  dialogueTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6A9EEC',
    fontFamily: 'PressStart2P-Regular'
  },
  dialogueText: {
    color: 'white',
    fontSize: 16,
    marginBottom: 10,
    lineHeight: 22,
    fontFamily: 'PressStart2P-Regular'
  },
  dialogueButton: {
    alignSelf: 'flex-end',
    backgroundColor: 'transparent',
    padding: 5
  },
  dialogueButtonText: {
    color: '#6A9EEC',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'PressStart2P-Regular'
  },
  pathSegment: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.2)',
  },
  chickenCircleContainer: {
    position: 'absolute',
    zIndex: 5,
  },
  fadeOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 200
  },
  chapterText: {
    color: 'white',
    fontSize: 32,
    fontFamily: 'PressStart2P-Regular',
    textAlign: 'center'
  },
  exploreAlert: {
    position: 'absolute',
    top: '30%',
    left: '12%',
    transform: [{ translateX: -100 }, { translateY: -50 }],
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#FFD700',
    zIndex: 100,
    width: 300,
    alignItems: 'center'
  },
  exploreAlertText: {
    color: '#FFD700',
    fontSize: 16,
    fontFamily: 'PressStart2P-Regular',
    textAlign: 'center'
  },
  thunderstormOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1
  },
  rainContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
    overflow: 'hidden',
    willChange: 'transform',
    pointerEvents: 'none'
  },
  rainDrop: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 1,
    willChange: 'transform',
    pointerEvents: 'none'
  },
  lantern: {
    position: 'absolute',
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  lanternEmoji: {
    fontSize: 24,
  },
  lanternLight: {
    position: 'absolute',
    borderRadius: 100,
    zIndex: 1,
    shadowOffset: { width: 0, height: 0 },
  },
  newspaperContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100
  },
  newspaperContent: {
    width: '90%',
    height: '80%',
    backgroundColor: '#f0e6d2', // Changed to a yellowed paper color
    borderRadius: 5,
    padding: 20,
    borderWidth: 1,
    borderColor: '#8B4513', // Changed to a brown border
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 5
  },
  newspaperHeader: {
    borderBottomWidth: 2,
    borderBottomColor: '#8B4513', // Changed to match border color
    paddingBottom: 10,
    marginBottom: 20
  },
  newspaperTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    fontFamily: 'PressStart2P-Regular', // Changed to game font
    color: '#000'
  },
  newspaperDate: {
    fontSize: 14,
    textAlign: 'center',
    fontFamily: 'PressStart2P-Regular', // Changed to game font
    color: '#666',
    marginTop: 5
  },
  newspaperBody: {
    flex: 1,
    padding: 10
  },
  newspaperHeadline: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    fontFamily: 'PressStart2P-Regular', // Changed to game font
    color: '#000',
    marginBottom: 20
  },
  newspaperText: {
    fontSize: 18,
    fontFamily: 'PressStart2P-Regular', // Changed to game font
    color: '#000',
    lineHeight: 24
  },
  newspaperButton: {
    backgroundColor: '#8B4513', // Changed to match border color
    padding: 10,
    borderRadius: 5,
    marginTop: 20,
    alignSelf: 'center'
  },
  newspaperButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'PressStart2P-Regular', // Changed to game font
    textAlign: 'center'
  },
  bloodSpatterContainer: {
    position: 'absolute',
    zIndex: 5,
    backgroundColor: 'transparent'
  },
  bloodSpatter: {
    position: 'absolute',
    backgroundColor: '#8B0000',
    opacity: 0.9,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.3,
    shadowRadius: 1,
    elevation: 2
  },
  torchImage: {
    width: 32,
    height: 32,
    resizeMode: 'contain'
  },
  dialogueButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10
  },
});

export default GameWorld; 