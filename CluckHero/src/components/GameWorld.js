import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Dimensions, Animated, Text, TouchableWithoutFeedback, Image, Easing } from 'react-native';
import { GameContext } from '../context/GameContext';

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

const TILE_SIZE = 32; // Size of each tile in pixels
const PLAYER_SIZE = 80; // Increased from 64 to 80 to make player even bigger
const WORLD_SIZE = 50; // Number of tiles in each direction
const FACTORY_SIZE = TILE_SIZE * 16; // Make factory 16x16 tiles (smaller than before)

const GameWorld = () => {
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
    
    // Update camera to center on player
    updateCameraOffset();
    
    // Pre-generate all tiles as a static background
    const allTiles = generateTiles();
    
    // Mark all tiles as visited since they're all pre-generated
    const allVisitedTiles = new Set(Object.keys(allTiles));
    setVisitedTiles(allVisitedTiles);
    setTiles(allTiles);
    
    // Start the farmer greeting sequence after a short delay
    setTimeout(() => {
      if (!hasFarmerGreeted.current) {
        startFarmerGreeting();
      }
    }, 1000);
  }, []);

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
    const specialRadius = 5;
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
    // Check world boundaries
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
    
    // Get market boundaries for interaction check - updated for the new image size
    const { x: marketX, y: marketY } = spawnPoint.current;
    const marketSize = TILE_SIZE * 3; // 3x3 tiles to match the image size
    const marketLeft = marketX * TILE_SIZE - TILE_SIZE;
    const marketTop = (marketY * TILE_SIZE) - TILE_SIZE * 3.5;
    const marketRight = marketLeft + marketSize;
    const marketBottom = marketTop + marketSize;
    
    // Check if the target position is inside the market
    const isTargetInsideMarket = (
      clampedTargetX >= marketLeft && 
      clampedTargetX <= marketRight && 
      clampedTargetY >= marketTop && 
      clampedTargetY <= marketBottom
    );
    
    // If target is inside market, don't allow movement there
    if (isTargetInsideMarket) {
      console.log("Can't walk through market!");
      return; // Cancel movement
    }
    
    // Calculate if the straight-line path would cross the market
    // Use expanded market boundaries to prevent cutting corners
    const willCrossMarket = doesLineIntersectRect(
      playerRef.current.x, playerRef.current.y,
      clampedTargetX, clampedTargetY,
      marketLeft, marketTop, marketRight, marketBottom
    );
    
    if (willCrossMarket) {
      // Find an alternative path around the market
      const alternativePath = findPathAroundMarket(clampedTargetX, clampedTargetY);
      if (alternativePath) {
        // Move to the waypoint first
        startMovement(alternativePath.x, alternativePath.y);
      } else {
        // Can't find a path, don't move
        console.log("Can't find path around market!");
        return;
      }
    } else {
      // Direct path doesn't cross market, proceed normally
      startMovement(clampedTargetX, clampedTargetY);
    }
  };

  // Start the actual movement animation
  const startMovement = (targetX, targetY) => {
    // Store the new target
    currentTargetRef.current = { x: targetX, y: targetY };
    
    // Always reset movement state when starting new movement
    isMoving.current = false;
    setIsWalking(false);
    
    // Small delay to ensure state is reset
    setTimeout(() => {
      console.log('Starting movement to:', targetX, targetY);
      isMoving.current = true;
      setIsWalking(true);

      // Determine the direction of movement for proper animation
      const dx = targetX - playerRef.current.x;
      const dy = targetY - playerRef.current.y;
      
      if (Math.abs(dx) > Math.abs(dy)) {
        // Horizontal movement is greater
        setPlayerDirection(dx > 0 ? 'right' : 'left');
      } else {
        // Vertical movement is greater
        setPlayerDirection(dy > 0 ? 'down' : 'up');
      }

      const distance = Math.sqrt(dx * dx + dy * dy);
      const duration = (distance / moveSpeed) * 1000; // Use base MOVE_SPEED without multiplier
      
      // Calculate the movement increment per frame
      const steps = duration / 16; // Approximately 60fps
      const incrementX = dx / steps;
      const incrementY = dy / steps;
      
      // Start animation loop
      let step = 0;
      const moveStep = () => {
        if (!isMoving.current) return; // Stop if movement was cancelled
        
        // Check if we have a new target
        if (currentTargetRef.current && 
            (currentTargetRef.current.x !== targetX || currentTargetRef.current.y !== targetY)) {
          // New target detected, restart movement
          isMoving.current = false;
          moveToWithCollisionCheck(currentTargetRef.current.x, currentTargetRef.current.y);
          return;
        }
        
        if (step >= steps) {
          // Animation complete
          playerRef.current = { x: targetX, y: targetY };
          setPlayerPosition({ x: targetX, y: targetY });
          updateCameraOffset();
          isMoving.current = false;
          setIsWalking(false);
          // Clear the tap marker when destination is reached
          setTapMarker(null);
          
          // Mark the target tile as visited
          const tileX = Math.floor(targetX / TILE_SIZE);
          const tileY = Math.floor(targetY / TILE_SIZE);
          const tileKey = `${tileX}-${tileY}`;
          if (!visitedTiles.has(tileKey)) {
            setVisitedTiles(prev => new Set([...prev, tileKey]));
          }
          
          return;
        }
        
        // Update player position incrementally
        const newX = playerRef.current.x + incrementX;
        const newY = playerRef.current.y + incrementY;
        
        // Check world boundaries during movement
        const worldBorderPadding = TILE_SIZE / 2;
        const minX = worldBorderPadding;
        const minY = worldBorderPadding;
        const maxX = WORLD_SIZE * TILE_SIZE - worldBorderPadding;
        const maxY = WORLD_SIZE * TILE_SIZE - worldBorderPadding;
        
        // Clamp position to world boundaries
        playerRef.current = {
          x: Math.max(minX, Math.min(maxX, newX)),
          y: Math.max(minY, Math.min(maxY, newY))
        };
        
        // Update state to trigger re-render
        setPlayerPosition({ ...playerRef.current });
        
        updateCameraOffset();
        
        // Check for tiles to mark as visited during movement
        const currentTileX = Math.floor(playerRef.current.x / TILE_SIZE);
        const currentTileY = Math.floor(playerRef.current.y / TILE_SIZE);
        const currentTileKey = `${currentTileX}-${currentTileY}`;
        
        if (!visitedTiles.has(currentTileKey)) {
          setVisitedTiles(prev => new Set([...prev, currentTileKey]));
        }
        
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

  // Handle touch events - use absolute screen positions
  const handleTouch = (event) => {
    // Don't allow movement if canMove is false
    if (!canMove) return;

    // Get the raw screen coordinates where the user tapped
    const { pageX, pageY } = event.nativeEvent;
    
    // Convert screen coordinates to world coordinates
    const worldX = pageX - cameraOffset.x;
    const worldY = pageY - cameraOffset.y;
    
    // Check if user tapped on the factory
    if (!spawnPoint.current) return;
    
    const { x, y } = spawnPoint.current;
    const factoryX = x * TILE_SIZE - FACTORY_SIZE * 1.5;
    const factoryY = y * TILE_SIZE - FACTORY_SIZE / 2;
    
    // Calculate the center of the factory
    const factoryCenterX = factoryX + FACTORY_SIZE/2;
    const factoryCenterY = factoryY + FACTORY_SIZE/2;
    
    // Create a 40x40 pixel hitbox around the center
    const hitboxSize = 40;
    const isTapOnFactory = (
      worldX >= factoryCenterX - hitboxSize/2 && 
      worldX <= factoryCenterX + hitboxSize/2 && 
      worldY >= factoryCenterY - hitboxSize/2 && 
      worldY <= factoryCenterY + hitboxSize/2
    );
    
    // Check if player is adjacent to factory
    const playerToFactoryX = factoryCenterX - playerRef.current.x;
    const playerToFactoryY = factoryCenterY - playerRef.current.y;
    const distanceToFactory = Math.sqrt(
      playerToFactoryX * playerToFactoryX + 
      playerToFactoryY * playerToFactoryY
    );
    const isAdjacentToFactory = distanceToFactory < TILE_SIZE * 2; // Within 2 tiles
    
    if (isTapOnFactory) {
      if (isAdjacentToFactory) {
        setShowFactoryDialogue(true);
        return; // Don't move when opening dialogue
      } else {
        // Player is too far, try to move closer to the factory
        const angle = Math.atan2(playerToFactoryY, playerToFactoryX);
        const nearFactoryX = factoryCenterX - Math.cos(angle) * TILE_SIZE * 1.5;
        const nearFactoryY = factoryCenterY - Math.sin(angle) * TILE_SIZE * 1.5;
        
        // Move to new target
        currentTargetRef.current = { x: nearFactoryX, y: nearFactoryY };
        moveToWithCollisionCheck(nearFactoryX, nearFactoryY);
        return;
      }
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
    
    // For any other tap, move directly to the tapped location
    currentTargetRef.current = { x: worldX, y: worldY };
    moveToWithCollisionCheck(worldX, worldY);
  };

  // Optimize tile rendering to only render visible tiles
  const renderTile = (tileKey) => {
    const tile = tiles[tileKey];
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
                           tile.type === 'path' ? '#8B4513' : 
                           tile.type === 'lightPath' ? '#A0522D' :
                           tile.type === 'darkGrass' ? '#2D5A27' : '#3D8B37',
            opacity: 1,
            borderWidth: 1,
            borderColor: tile.type === 'market' ? '#A0522D' : 
                        tile.type === 'grey' ? '#666666' : 
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
            {/* Speed Boost */}
            <View style={styles.marketItem}>
              <View style={styles.marketItemIcon}>
                <Image 
                  source={chickenImage} 
                  style={{width: 30, height: 30}}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.marketItemText}>Speed Boost {hasSpeedBoost ? '(Purchased)' : ''}</Text>
              <TouchableWithoutFeedback onPress={() => {
                if (eggCount >= 50 && !hasSpeedBoost) {
                  setEggCount(prev => prev - 50);
                  setHasSpeedBoost(true);
                  // Increase player speed by 20%
                  setMoveSpeed(prev => prev * 1.2);
                }
              }}>
                <View style={[
                  styles.marketItemPrice,
                  { backgroundColor: (eggCount >= 50 && !hasSpeedBoost) ? '#4CAF50' : '#9E9E9E' }
                ]}>
                  <Text style={styles.marketItemPriceText}>50 eggs</Text>
                </View>
              </TouchableWithoutFeedback>
            </View>
            
            {/* Better Eggs */}
            <View style={styles.marketItem}>
              <View style={styles.marketItemIcon}>
                <Image 
                  source={chickenImage} 
                  style={{width: 30, height: 30}}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.marketItemText}>Better Eggs {hasBetterEggs ? '(Purchased)' : ''}</Text>
              <TouchableWithoutFeedback onPress={() => {
                if (eggCount >= 100 && !hasBetterEggs) {
                  setEggCount(prev => prev - 100);
                  setHasBetterEggs(true);
                }
              }}>
                <View style={[
                  styles.marketItemPrice,
                  { backgroundColor: (eggCount >= 100 && !hasBetterEggs) ? '#4CAF50' : '#9E9E9E' }
                ]}>
                  <Text style={styles.marketItemPriceText}>100 eggs</Text>
                </View>
              </TouchableWithoutFeedback>
            </View>
            
            {/* Chicken Feed */}
            <View style={styles.marketItem}>
              <View style={styles.marketItemIcon}>
                <Image 
                  source={chickenImage} 
                  style={{width: 30, height: 30}}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.marketItemText}>Chicken Feed {hasChickenFeed ? '(Purchased)' : ''}</Text>
              <TouchableWithoutFeedback onPress={() => {
                if (eggCount >= 25 && !hasChickenFeed) {
                  setEggCount(prev => prev - 25);
                  setHasChickenFeed(true);
                  setEggProductionRate(prev => prev + 1);
                }
              }}>
                <View style={[
                  styles.marketItemPrice,
                  { backgroundColor: (eggCount >= 25 && !hasChickenFeed) ? '#4CAF50' : '#9E9E9E' }
                ]}>
                  <Text style={styles.marketItemPriceText}>25 eggs</Text>
                </View>
              </TouchableWithoutFeedback>
            </View>
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
            Welcome to the factory! Eggs are being produced automatically.
            Each egg is worth 1 coin.
          </Text>
          <TouchableWithoutFeedback onPress={() => {
            setShowFactoryDialogue(false);
            setIsEggCounterActive(true); // Start egg counter when dialogue is closed
          }}>
            <View style={styles.dialogueButton}>
              <Text style={styles.dialogueButtonText}>Start Production</Text>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </View>
    );
  };

  // Farmer dialogue with a more Pokemon-style dialog box
  const renderFarmerDialogue = () => {
    if (!showFarmerDialogue) return null;
    
    // No more minimized state - dialogue is either fully shown or hidden
    return (
      <View style={styles.dialogueContainer}>
        <View style={styles.dialogueContent}>
          <View style={styles.dialogueHeader}>
            <Text style={styles.dialogueTitle}>Farmer</Text>
          </View>
          <Text style={styles.dialogueText}>
            Welcome to CluckHero! You must be the new hire, look a bit funny though.
            You sure you're in the right place? Anyways... I should get to work. Let me know if you have any questions!
          </Text>
          <TouchableWithoutFeedback onPress={() => {
            setShowFarmerDialogue(false);
            setCanMove(true); // Enable movement after dialogue is closed
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
    if (!isEggCounterActive) return null;
    
    return (
      <View style={styles.eggCounterContainer}>
        <Text style={styles.eggCounterText}>Eggs: {eggCount}</Text>
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
        
        // Don't auto-minimize anymore, player must tap OK to close
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
      setFactoryAnimationState(prev => prev === 1 ? 2 : 1);
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
    const factoryX = x * TILE_SIZE - FACTORY_SIZE * 1.5; // Position to the left of spawn
    const factoryY = y * TILE_SIZE - FACTORY_SIZE / 2; // Center vertically
    
    return (
      <View
        style={{
          position: 'absolute',
          width: FACTORY_SIZE,
          height: FACTORY_SIZE,
          left: factoryX,
          top: factoryY,
          zIndex: 7, // Above tiles but below player
          backgroundColor: 'transparent' // Ensure background is transparent
        }}
      >
        <Image 
          source={factoryAnimationState === 1 ? factory1Image : factory2Image} 
          style={{
            width: '100%',
            height: '100%',
            resizeMode: 'contain',
            position: 'absolute' // Ensure image is positioned absolutely
          }}
        />
        {/* Add invisible interaction box in center */}
        <View
          style={{
            position: 'absolute',
            width: 160, // Increased from 80 to 160 pixels
            height: 160, // Increased from 80 to 160 pixels
            left: FACTORY_SIZE/2 - 80, // Adjusted to center the larger hitbox
            top: FACTORY_SIZE/2 - 80, // Adjusted to center the larger hitbox
            backgroundColor: 'transparent', // Make it invisible
            zIndex: 8 // Above factory image
          }}
        />
      </View>
    );
  };

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
          
          {/* Render world border */}
          {renderWorldBorder()}
          
          {/* Render all tiles - they will be filtered by renderTile */}
          {Object.keys(tiles).map(tileKey => renderTile(tileKey))}
          
          {/* Render factory */}
          {renderFactory()}
          
          {/* Render chicken companion */}
          {renderChicken()}
          
          {/* Render farmer */}
          {renderFarmer()}
          
          {/* Render market building */}
          {renderMarket()}
          
          {/* Render player (only once) */}
          {renderPlayer()}
        </View>
        {/* Still call renderTapMarker() to maintain code structure */}
        {renderTapMarker()}
        {renderDebugInfo()}
        
        {/* Market room UI overlay */}
        {renderMarketRoom()}
        
        {/* Farmer dialogue */}
        {renderFarmerDialogue()}
        
        {/* Factory dialogue */}
        {renderFactoryDialogue()}
        
        {/* Egg counter */}
        {renderEggCounter()}
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
    textAlign: 'center'
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
    fontSize: 12
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: 20
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
  marketItemText: {
    flex: 1,
    color: 'white',
    fontWeight: 'bold'
  },
  marketItemPrice: {
    padding: 5,
    borderRadius: 5,
    minWidth: 80,
    alignItems: 'center'
  },
  marketItemPriceText: {
    color: 'white',
    fontWeight: 'bold'
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
    fontWeight: 'bold'
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
    color: '#6A9EEC', // Pokemon blue
  },
  dialogueText: {
    color: 'white',
    fontSize: 16,
    marginBottom: 10,
    lineHeight: 22
  },
  dialogueButton: {
    alignSelf: 'flex-end',
    backgroundColor: 'transparent',
    padding: 5
  },
  dialogueButtonText: {
    color: '#6A9EEC', // Pokemon blue
    fontSize: 16,
    fontWeight: 'bold'
  },
  pathSegment: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.2)',
  },
  eggCounterContainer: {
    position: 'absolute',
    top: 50, // Moved down from 30 to 50
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 5,
    borderRadius: 5,
  },
  eggCounterText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold'
  },
});

export default GameWorld; 