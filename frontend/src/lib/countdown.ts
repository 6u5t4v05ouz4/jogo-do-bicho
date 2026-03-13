import { useEffect, useState } from "react";

export interface CountdownConfig {
  durationMinutes: number;
  onTick?: (secondsRemaining: number) => void;
  onComplete?: () => void;
}

export function useCountdown(config: CountdownConfig) {
  const [timeLeft, setTimeLeft] = useState<number>(config.durationMinutes * 60);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const initialTime = config.durationMinutes * 60;
    setTimeLeft(initialTime);

    let intervalId: NodeJS.Timeout | null = null;

    if (config.onTick) {
      intervalId = setInterval(() => {
        if (timeLeft > 0 && !isPaused) {
          const secondsRemaining = Math.ceil(timeLeft / 60);
          config.onTick(secondsRemaining);
        }
      }, 1000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [timeLeft, isPaused, config.durationMinutes, config.onTick]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          config.onComplete?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [config.durationMinutes, config.onComplete]);

  const start = (durationMinutes: number) => {
    setTimeLeft(durationMinutes * 60);
    setIsPaused(false);
  };

  const pause = () => {
    setIsPaused(true);
  };

  const resume = () => {
    setIsPaused(false);
  };

  const reset = (durationMinutes: number) => {
    setTimeLeft(durationMinutes * 60);
    setIsPaused(false);
  };

  return {
    timeLeft,
    isPaused,
    start,
    pause,
    resume,
    reset,
    formatTime: () => {
      const minutes = Math.floor(timeLeft / 60);
      const seconds = timeLeft % 60;
      return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    },
  };
}

export function useAutoDrawCooldown(onDrawComplete: () => void) {
  const config: CountdownConfig = {
    durationMinutes: 3,
    onComplete: onDrawComplete,
  };

  const countdown = useCountdown(config);

  return countdown;
}
