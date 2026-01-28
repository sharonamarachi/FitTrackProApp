import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SettingsStackParamList } from './types';
import Settings from '../screens/Settings/Settings';
/* import AccountSettings from '../screens/Settings/AccountSettings';
import Notifications from '../screens/Settings/Notifications';
import Privacy from '../screens/Settings/Privacy'; */

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export default function SettingsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Settings" component={Settings} options={{ headerShown: false }} />
{/*       <Stack.Screen name="AccountSettings" component={AccountSettings} />
      <Stack.Screen name="Notifications" component={Notifications} />
      <Stack.Screen name="Privacy" component={Privacy} /> */}
    </Stack.Navigator>
  );
}
