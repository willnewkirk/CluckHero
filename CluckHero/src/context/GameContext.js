import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const GameContext = createContext();

export const GameProvider = ({ children }) => {
  const [coins, setCoins] = useState(0);
  const [clickPower, setClickPower] = useState(1);
  const [autoClickers, setAutoClickers] = useState(0);
  const [autoClickerPower, setAutoClickerPower] = useState(1);

  // Load saved game state
  useEffect(() => {
    const loadGameState = async () => {
      try {
        const savedState = await AsyncStorage.getItem('gameState');
        if (savedState) {
          const { coins, clickPower, autoClickers, autoClickerPower } = JSON.parse(savedState);
          setCoins(coins);
          setClickPower(clickPower);
          setAutoClickers(autoClickers);
          setAutoClickerPower(autoClickerPower);
        }
      } catch (error) {
        console.error('Error loading game state:', error);
      }
    };
    loadGameState();
  }, []);

  // Save game state
  useEffect(() => {
    const saveGameState = async () => {
      try {
        const gameState = {
          coins,
          clickPower,
          autoClickers,
          autoClickerPower,
        };
        await AsyncStorage.setItem('gameState', JSON.stringify(gameState));
      } catch (error) {
        console.error('Error saving game state:', error);
      }
    };
    saveGameState();
  }, [coins, clickPower, autoClickers, autoClickerPower]);

  // Auto-clicker logic
  useEffect(() => {
    if (autoClickers > 0) {
      const interval = setInterval(() => {
        setCoins(prevCoins => prevCoins + (autoClickers * autoClickerPower));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [autoClickers, autoClickerPower]);

  const handleClick = () => {
    setCoins(prevCoins => prevCoins + clickPower);
  };

  const upgradeClickPower = () => {
    const cost = Math.floor(10 * Math.pow(1.5, clickPower));
    if (coins >= cost) {
      setCoins(prevCoins => prevCoins - cost);
      setClickPower(prevPower => prevPower + 1);
    }
  };

  const buyAutoClicker = () => {
    const cost = Math.floor(50 * Math.pow(1.5, autoClickers));
    if (coins >= cost) {
      setCoins(prevCoins => prevCoins - cost);
      setAutoClickers(prevAutoClickers => prevAutoClickers + 1);
    }
  };

  return (
    <GameContext.Provider
      value={{
        coins,
        clickPower,
        autoClickers,
        autoClickerPower,
        handleClick,
        upgradeClickPower,
        buyAutoClicker,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}; 