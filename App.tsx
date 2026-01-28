import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

import Login from './src/screens/Auth/Login';
import SignUp from './src/screens/Auth/SignUp';
import TabNavigator from './src/navigation/TabNavigator';
import { RootStackParamList } from './src/navigation/types';
import EditProfile from './src/screens/Profile/EditProfile';
import SettingsStack from './src/navigation/SettingsStack';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [initialRoute, setInitialRoute] =
    useState<keyof RootStackParamList | undefined>(undefined);

  useEffect(() => {
    const checkSession = async () => {
      const token = await AsyncStorage.getItem('userToken');
      setInitialRoute(token ? 'Home' : 'Login');
    };
    checkSession();
  }, []);

  if (!initialRoute) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={initialRoute}>
        <Stack.Screen
          name="Login"
          component={Login}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="SignUp"
          component={SignUp}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Home"
          component={TabNavigator}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="SettingsStack"
          component={SettingsStack}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="EditProfile"
          component={EditProfile}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}