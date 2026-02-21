// Service Worker and Push Notification utilities

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Convert base64 to Uint8Array for VAPID key
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Check if push notifications are supported
export function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

// Check if notifications are supported
export function isNotificationSupported() {
  return 'Notification' in window;
}

// Get current notification permission status
export function getNotificationPermission() {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

// Register service worker
export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.log('[PWA] Service workers not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });
    console.log('[PWA] Service Worker registered:', registration.scope);
    return registration;
  } catch (error) {
    console.error('[PWA] Service Worker registration failed:', error);
    return null;
  }
}

// Request notification permission
export async function requestNotificationPermission() {
  if (!isNotificationSupported()) {
    console.log('[Push] Notifications not supported');
    return 'unsupported';
  }

  try {
    const permission = await Notification.requestPermission();
    console.log('[Push] Notification permission:', permission);
    return permission;
  } catch (error) {
    console.error('[Push] Permission request failed:', error);
    return 'denied';
  }
}

// Subscribe to push notifications
export async function subscribeToPush(token) {
  if (!isPushSupported()) {
    console.log('[Push] Push not supported');
    return null;
  }

  try {
    // Get service worker registration
    const registration = await navigator.serviceWorker.ready;
    
    // Get VAPID public key from server
    const response = await fetch(`${API_URL}/push/vapid-public-key`);
    const { publicKey } = await response.json();
    
    if (!publicKey) {
      console.error('[Push] No VAPID public key');
      return null;
    }

    // Subscribe to push
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey)
    });

    console.log('[Push] Push subscription:', subscription);

    // Send subscription to server
    await fetch(`${API_URL}/push/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        endpoint: subscription.endpoint,
        keys: {
          p256dh: btoa(String.fromCharCode.apply(null, new Uint8Array(subscription.getKey('p256dh')))),
          auth: btoa(String.fromCharCode.apply(null, new Uint8Array(subscription.getKey('auth'))))
        }
      })
    });

    return subscription;
  } catch (error) {
    console.error('[Push] Subscribe failed:', error);
    return null;
  }
}

// Unsubscribe from push notifications
export async function unsubscribeFromPush(token) {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      // Notify server
      await fetch(`${API_URL}/push/unsubscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: {}
        })
      });

      // Unsubscribe locally
      await subscription.unsubscribe();
      console.log('[Push] Unsubscribed');
    }
    return true;
  } catch (error) {
    console.error('[Push] Unsubscribe failed:', error);
    return false;
  }
}

// Check if user is subscribed to push
export async function isPushSubscribed() {
  if (!isPushSupported()) return false;
  
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch (error) {
    return false;
  }
}

// Show local notification (for testing)
export function showLocalNotification(title, body) {
  if (Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png'
    });
  }
}
