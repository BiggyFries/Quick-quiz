import { useMemo, useRef, type PointerEventHandler } from 'react';
import type { ClassicDirection } from './classicLabs';

interface PointerOrigin { id: number; x: number; y: number }
export interface TapPoint { x: number; y: number }

export function useSwipeDirection(onDirection: (direction: ClassicDirection) => void, disabled = false, onTap?: (point: TapPoint) => void) {
  const origin = useRef<PointerOrigin | null>(null);
  return useMemo(() => {
    const onPointerDown: PointerEventHandler<HTMLElement> = (event) => {
      if (disabled) return;
      origin.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
      event.currentTarget.setPointerCapture?.(event.pointerId);
    };
    const onPointerUp: PointerEventHandler<HTMLElement> = (event) => {
      const start = origin.current;
      origin.current = null;
      if (disabled || !start || start.id !== event.pointerId) return;
      const dx = event.clientX - start.x; const dy = event.clientY - start.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 14) {
        if (onTap) {
          const bounds = event.currentTarget.getBoundingClientRect();
          onTap({ x: (event.clientX - bounds.left) / bounds.width, y: (event.clientY - bounds.top) / bounds.height });
        }
        return;
      }
      onDirection(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
    };
    const onPointerCancel: PointerEventHandler<HTMLElement> = () => { origin.current = null; };
    return { onPointerDown, onPointerUp, onPointerCancel };
  }, [disabled, onDirection, onTap]);
}
