/** A running segment uses elapsed time, so throttled background tabs catch up. */
export const startStudyClock = ({
  initialSeconds, countUp, onTick, onComplete,
  now = () => Date.now(),
  schedule = (tick: () => void) => window.setInterval(tick, 250),
  cancel = (id: number) => window.clearInterval(id),
}: {
  initialSeconds: number;
  countUp: boolean;
  onTick: (seconds: number) => void;
  onComplete: (completedAt: number) => void;
  now?: () => number;
  schedule?: (tick: () => void) => number;
  cancel?: (id: number) => void;
}) => {
  const startedAt = now();
  let stopped = false;
  const update = () => {
    if (stopped) return;
    const elapsed = Math.max(0, Math.floor((now() - startedAt) / 1000));
    const remaining = countUp ? initialSeconds + elapsed : Math.max(0, initialSeconds - elapsed);
    onTick(remaining);
    if (!countUp && remaining === 0) {
      stopped = true;
      cancel(interval);
      onComplete(startedAt + initialSeconds * 1000);
    }
  };
  const interval = schedule(update);
  return {
    update,
    stop() { stopped = true; cancel(interval); },
  };
};
