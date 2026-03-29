/**
 * Browser Push Notifications Service
 * Handles requesting permissions and sending notifications
 */

export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) {
    console.log("Este navegador no soporta notificaciones");
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission !== "denied") {
    try {
      const permission = await Notification.requestPermission();
      return permission === "granted";
    } catch (error) {
      console.error("Error al solicitar permiso de notificaciones:", error);
      return false;
    }
  }

  return false;
}

export function sendNotification(title: string, options?: NotificationOptions) {
  if (Notification.permission === "granted") {
    try {
      const notification = new Notification(title, {
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        ...options,
      });

      // Auto-close notification after 5 seconds
      setTimeout(() => notification.close(), 5000);

      return notification;
    } catch (error) {
      console.error("Error al enviar notificación:", error);
    }
  }
}

export function sendChatNotification(
  senderName: string,
  message: string,
  onClick?: () => void
) {
  const notification = sendNotification(`Nuevo mensaje de ${senderName}`, {
    body: message.substring(0, 100),
    tag: "chat-notification",
    requireInteraction: false,
  });

  if (notification && onClick) {
    notification.onclick = () => {
      onClick();
      notification.close();
      window.focus();
    };
  }

  return notification;
}

export function playNotificationSound() {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = "sine";

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch (error) {
    console.error("Error al reproducir sonido de notificación:", error);
  }
}

export function isNotificationEnabled(): boolean {
  return Notification.permission === "granted";
}
