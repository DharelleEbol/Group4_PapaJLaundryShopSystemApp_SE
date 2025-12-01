// services/authService.js
import api from '../api/axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ---------------------------------------------
// LOGIN
// ---------------------------------------------
export async function login(email, password) {
  // Call your backend login route
  const res = await api.post('/clients/login', { 
    email, 
    password, 
    device_name: 'mobile' 
  });

  // Backend returns { token, client }
  const { token, client } = res.data;

  // Save token (axios interceptor uses this)
  await AsyncStorage.setItem('userToken', token);

  // Save the entire client object
  await AsyncStorage.setItem('client', JSON.stringify(client));

  // IMPORTANT: Save clientId for branch screens
  await AsyncStorage.setItem('clientId', String(client.id));

  return client;
}

// ---------------------------------------------
// LOGOUT
// ---------------------------------------------
export async function logout() {
  try {
    await api.post('/logout');
  } catch (e) {
    // ignore API errors — still clear local storage
  }

  await AsyncStorage.removeItem('userToken');
  await AsyncStorage.removeItem('client');
  await AsyncStorage.removeItem('clientId');
}

// ---------------------------------------------
// GET CURRENT CLIENT OBJECT
// ---------------------------------------------
export async function getCurrentClient() {
  const raw = await AsyncStorage.getItem('client');
  return raw ? JSON.parse(raw) : null;
}

// ---------------------------------------------
// OPTIONAL: GET CURRENT CLIENT ID
// ---------------------------------------------
export async function getCurrentClientId() {
  const id = await AsyncStorage.getItem('clientId');
  return id ? Number(id) : null;
}
