import AsyncStorage from '@react-native-async-storage/async-storage';

let memoryActiveTourId = null;

export async function setActiveTourId(tourId) {
  memoryActiveTourId = tourId;
  try {
    if (tourId) {
      await AsyncStorage.setItem('@spatialore_active_tour_id', tourId);
    } else {
      await AsyncStorage.removeItem('@spatialore_active_tour_id');
    }
  } catch (err) {
    console.warn('Could not store active tour ID:', err);
  }
}

export async function getActiveTourId() {
  if (memoryActiveTourId) {
    return memoryActiveTourId;
  }
  try {
    const stored = await AsyncStorage.getItem('@spatialore_active_tour_id');
    if (stored) {
      memoryActiveTourId = stored;
      return stored;
    }
  } catch (err) {
    console.warn('Could not read active tour ID:', err);
  }
  return null;
}

export async function clearActiveTourId() {
  memoryActiveTourId = null;
  try {
    await AsyncStorage.removeItem('@spatialore_active_tour_id');
  } catch (err) {
    console.warn('Could not clear active tour ID:', err);
  }
}
