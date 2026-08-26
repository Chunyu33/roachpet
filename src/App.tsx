import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { listen } from "@tauri-apps/api/event";
import { RoachView } from "./components/RoachView";
import {
  createBehaviorConfig,
  DEFAULT_BEHAVIOR_CONFIG,
} from "./game/behaviorConfig";
import { MovementController } from "./game/movementController";
import type { Roach, ScreenBounds } from "./types/roach";
import "./styles.css";

const ROACH_OFFSET = 12;
const fallbackBounds: ScreenBounds = {
  width: window.screen.availWidth,
  height: window.screen.availHeight,
};

function readSavedConfig() {
  try {
    const saved = localStorage.getItem("roachpet.behavior-config");
    return createBehaviorConfig(saved ? JSON.parse(saved) : {});
  } catch {
    return DEFAULT_BEHAVIOR_CONFIG;
  }
}

function windowIndex(label: string): number {
  return label === "main" ? 0 : Number(label.replace("roach-", ""));
}

export default function App() {
  const savedConfig = readSavedConfig();
  const [bounds, setBounds] = useState<ScreenBounds>(fallbackBounds);
  const [roaches, setRoaches] = useState<Roach[]>(
    () =>
      new MovementController(fallbackBounds, {
        ...savedConfig,
        roachCount: 1,
      }).snapshot,
  );
  const controller = useRef<MovementController | null>(null);
  const appWindow = useRef(getCurrentWindow());
  const lastWindowMove = useRef(0);

  useEffect(() => {
    const unlistenPromise = listen<Partial<typeof DEFAULT_BEHAVIOR_CONFIG>>(
      "settings-updated",
      (event) => {
        controller.current?.applyConfig(event.payload);
        const configuredCount = Math.max(
          1,
          Math.floor(
            event.payload.roachCount ?? DEFAULT_BEHAVIOR_CONFIG.roachCount,
          ),
        );
        const index = windowIndex(appWindow.current.label);
        void (index < configuredCount
          ? appWindow.current.show()
          : appWindow.current.hide());
      },
    );
    invoke<ScreenBounds>("get_screen_bounds")
      .then((nextBounds) => {
        setBounds(nextBounds);
        controller.current = new MovementController(nextBounds, {
          ...savedConfig,
          roachCount: 1,
        });
        setRoaches(controller.current.snapshot);
        const index = windowIndex(appWindow.current.label);
        const configuredCount = savedConfig.roachCount;
        void (index < configuredCount
          ? appWindow.current.show()
          : appWindow.current.hide());
      })
      .catch((error) => {
        console.error("Failed to read screen bounds:", error);
        controller.current = new MovementController(fallbackBounds, {
          ...savedConfig,
          roachCount: 1,
        });
        const index = windowIndex(appWindow.current.label);
        void (index < savedConfig.roachCount
          ? appWindow.current.show()
          : appWindow.current.hide());
      });
    return () => {
      void unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  useEffect(() => {
    if (!controller.current)
      controller.current = new MovementController(bounds, { roachCount: 1 });
    let frame = 0;
    let previousTime = performance.now();
    const tick = (now: number) => {
      const deltaSeconds = Math.min(0.05, (now - previousTime) / 1000);
      previousTime = now;
      const nextRoaches = controller.current!.update(deltaSeconds);
      setRoaches(nextRoaches);
      const roach = nextRoaches[0];
      if (roach && now - lastWindowMove.current > 33) {
        lastWindowMove.current = now;
        void invoke("move_roach_window", {
          x: Math.max(0, roach.position.x - ROACH_OFFSET),
          y: Math.max(0, roach.position.y - ROACH_OFFSET),
        }).catch((error) => console.error("移动蟑螂窗口失败:", error));
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [bounds]);

  return (
    <main className="canvas">
      {roaches.map((roach) => (
        <RoachView
          key={roach.id}
          roach={{ ...roach, position: { x: ROACH_OFFSET, y: ROACH_OFFSET } }}
          onClick={(id, pointer) => controller.current?.escape(id, pointer)}
        />
      ))}
    </main>
  );
}
