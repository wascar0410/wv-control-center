import { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";

interface LocationTrackingOptions {
  enabled: boolean;
  interval?: number; // milliseconds, default 30000 (30 seconds)
  highAccuracy?: boolean;
}

export function useLocationTracking(options: LocationTrackingOptions) {
  const { enabled, interval = 30000, highAccuracy = false } = options;
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const updateLocationMutation = trpc.driver.updateLocation.useMutation();

  // Get current position and update
  const updatePosition = () => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy, speed, heading, altitude } =
          position.coords;

        // Send to backend
        updateLocationMutation.mutate({
          latitude,
          longitude,
          accuracy: accuracy || undefined,
          speed: speed || undefined,
          heading: heading || undefined,
          altitude: altitude || undefined,
        });

        setError(null);
      },
      (err) => {
        console.error("Geolocation error:", err);
        setError(err.message);
      },
      {
        enableHighAccuracy: highAccuracy,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // Start tracking
  useEffect(() => {
    if (!enabled) {
      // Stop tracking
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setIsTracking(false);
      return;
    }

    // Check permission first
    if (!navigator.geolocation) {
      setError("Geolocation not available");
      return;
    }

    // Start periodic updates
    setIsTracking(true);

    // Initial update
    updatePosition();

    // Set up interval for periodic updates
    intervalRef.current = setInterval(() => {
      updatePosition();
    }, interval);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, interval, highAccuracy]);

  return {
    isTracking,
    error,
    isUpdating: updateLocationMutation.isPending,
  };
}
