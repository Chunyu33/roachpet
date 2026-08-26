import { useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow, LogicalPosition } from '@tauri-apps/api/window';
import { RoachView } from './components/RoachView';
import { MovementController } from './game/movementController';
import type { Roach, ScreenBounds } from './types/roach';
import './styles.css';

const ROACH_OFFSET = 12;

export default function App() {
  const fallbackBounds = { width: window.screen.availWidth, height: window.screen.availHeight };
  const [bounds, setBounds] = useState<ScreenBounds>(fallbackBounds);
  const [roach, setRoach] = useState<Roach>(() => new MovementController(fallbackBounds).snapshot);
  const controller = useRef<MovementController | null>(null);
  const appWindow = useRef(getCurrentWindow());
  const lastWindowMove = useRef(0);

  useEffect(() => {
    invoke<ScreenBounds>('get_screen_bounds')
      .then((nextBounds) => {
        setBounds(nextBounds);
        controller.current = new MovementController(nextBounds);
        setRoach(controller.current.snapshot);
      })
      .catch(() => {
        controller.current = new MovementController(fallbackBounds);
      });
  }, []);

  useEffect(() => {
    if (!controller.current) controller.current = new MovementController(bounds);

    let frame = 0;
    let previousTime = performance.now();
    const tick = (now: number) => {
      const deltaSeconds = Math.min(0.05, (now - previousTime) / 1000);
      previousTime = now;

      const nextRoach = controller.current!.update(deltaSeconds);
      setRoach(nextRoach);

      // Move a small native window with the pet instead of overlaying the desktop.
      if (now - lastWindowMove.current > 33) {
        lastWindowMove.current = now;
        const x = Math.max(0, nextRoach.position.x - ROACH_OFFSET);
        const y = Math.max(0, nextRoach.position.y - ROACH_OFFSET);
        void appWindow.current.setPosition(new LogicalPosition(x, y));
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [bounds]);

  return (
    <main className="canvas">
      <RoachView roach={{ ...roach, position: { x: ROACH_OFFSET, y: ROACH_OFFSET } }} onClick={() => controller.current?.escape()} />
      {import.meta.env.DEV && <div className="debug">{roach.state} · {Math.round(roach.position.x)},{Math.round(roach.position.y)}</div>}
    </main>
  );
}
