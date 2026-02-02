import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  colors: typeof lightColors;
}

const lightColors = {
  // Background colors
  background: '#FFFFFF',
  surface: '#F8F9FA',
  card: '#FFFFFF',
  
  // Text colors
  text: '#000000',
  textSecondary: '#666666',
  textTertiary: '#999999',
  
  // Primary colors
  primary: '#4438c3',
  primaryLight: '#6c63ff',
  
  // Accent colors
  accent: '#007AFF',
  success: '#4caf50',
  warning: '#ff9500',
  error: '#ff3b30',
  
  // Border and divider colors
  border: '#E0E0E0',
  divider: '#F0F0F0',
  
  // Special
  shadow: '#000000',
  overlay: 'rgba(0, 0, 0, 0.5)',
};

const darkColors = {
  // Background colors
  background: '#000000',
  surface: '#1a1a1a',
  card: '#1a1a1a',
  
  // Text colors
  text: '#FFFFFF',
  textSecondary: '#999999',
  textTertiary: '#666666',
  
  // Primary colors
  primary: '#667eea',
  primaryLight: '#764ba2',
  
  // Accent colors
  accent: '#0A84FF',
  success: '#32D74B',
  warning: '#FF9F0A',
  error: '#FF453A',
  
  // Border and divider colors
  border: '#2a2a2a',
  divider: '#1a1a1a',
  
  // Special
  shadow: '#000000',
  overlay: 'rgba(0, 0, 0, 0.7)',
};

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
  colors: lightColors,
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('app_theme');
      if (savedTheme === 'dark' || savedTheme === 'light') {
        setTheme(savedTheme);
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    }
  };

  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    try {
      await AsyncStorage.setItem('app_theme', newTheme);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const colors = theme === 'light' ? lightColors : darkColors;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};