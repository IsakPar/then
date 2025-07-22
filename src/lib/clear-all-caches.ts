/**
 * ⚡ AGGRESSIVE CACHE CLEARING UTILITY
 * 
 * This utility forcefully clears all caches to ensure fresh data
 * especially important after bug fixes to seat map rendering
 */

import { getSeatMapCache } from './seat-map-cache';

export function clearAllCaches() {
  console.log('🧹 CLEARING ALL CACHES AGGRESSIVELY');
  
  // Clear in-memory seat map cache
  try {
    const cache = getSeatMapCache();
    cache.clear();
    console.log('✅ Cleared in-memory seat map cache');
  } catch (error) {
    console.warn('⚠️ Failed to clear in-memory cache:', error);
  }
  
  // Clear browser storage
  if (typeof window !== 'undefined') {
    // Clear localStorage
    try {
      const localStorageKeys = Object.keys(localStorage);
      localStorageKeys.forEach(key => {
        if (key.includes('seatmap') || key.includes('seat') || key.includes('show') || key.includes('hamilton') || key.includes('cache')) {
          localStorage.removeItem(key);
          console.log('🧹 Cleared localStorage key:', key);
        }
      });
      console.log('✅ Cleared localStorage');
    } catch (error) {
      console.warn('⚠️ Failed to clear localStorage:', error);
    }
    
    // Clear sessionStorage
    try {
      const sessionStorageKeys = Object.keys(sessionStorage);
      sessionStorageKeys.forEach(key => {
        if (key.includes('seatmap') || key.includes('seat') || key.includes('show') || key.includes('hamilton') || key.includes('cache')) {
          sessionStorage.removeItem(key);
          console.log('🧹 Cleared sessionStorage key:', key);
        }
      });
      console.log('✅ Cleared sessionStorage');
    } catch (error) {
      console.warn('⚠️ Failed to clear sessionStorage:', error);
    }
    
    // Clear any cached service worker data
    try {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
          registrations.forEach(registration => {
            if (registration.active) {
              registration.active.postMessage({ type: 'CLEAR_CACHE' });
            }
          });
        });
      }
    } catch (error) {
      console.warn('⚠️ Failed to clear service worker cache:', error);
    }
  }
  
  console.log('🎉 ALL CACHES CLEARED SUCCESSFULLY');
}

// Auto-clear caches on import in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // Add a delay to ensure everything is loaded
  setTimeout(() => {
    clearAllCaches();
  }, 1000);
} 