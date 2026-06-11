import { useCallback, useRef } from 'react';
import { useChatStore } from '../store/useChatStore';

function useMessageSound() {
  const { isSoundEnabled } = useChatStore();
  const lastPlayedRef = useRef(0);
  const minInterval = 500; // Evitar múltiples sonidos en menos de 500ms

  const playMessageSound = useCallback(() => {
    if (!isSoundEnabled) return;
    
    const now = Date.now();
    if (now - lastPlayedRef.current < minInterval) return;
    lastPlayedRef.current = now;
    
    try {
      const sound = new Audio("/sounds/notification.mp3");
      sound.volume = 0.5;
      sound.play().catch(error => console.log("Audio play failed:", error));
    } catch (error) {
      console.log("Error playing message sound:", error);
    }
  }, [isSoundEnabled]);

  return { playMessageSound };
}

export default useMessageSound;