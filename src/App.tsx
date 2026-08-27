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

// 透明画布为旋转后的桌宠预留安全边距；窗口坐标允许为负数，才能在屏幕边缘保持视觉位置正确。
const ROACH_OFFSET = 108;
const fallbackBounds: ScreenBounds = {
  width: window.screen.availWidth,
  height: window.screen.availHeight,
};

function readSavedConfig() {
  // 启动时读取上次保存的参数，避免窗口创建后又恢复到默认数量。
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
  const [roachSize, setRoachSize] = useState(savedConfig.roachSize);
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
  // 启动延迟只在本次进程启动时计时，避免保存其他参数时桌宠突然重新隐藏。
  const startupDeadline = useRef(
    performance.now() + savedConfig.startupDelaySeconds * 1000,
  );
  const configuredCount = useRef(savedConfig.roachCount);
  const revealTimer = useRef<number | null>(null);
  const windowReady = useRef(false);

  const showWindow = () => {
    // 先同步清除 Windows 非客户区，再显示窗口，避免首次激活闪出原生边框。
    void invoke("prepare_roach_window")
      .then(() => appWindow.current.show())
      .catch((error) => console.error("准备显示桌宠窗口失败:", error));
  };

  const updateWindowVisibility = (count: number) => {
    configuredCount.current = count;
    void invoke("set_roach_count", { count }).catch((error) =>
      console.error("同步桌宠数量失败:", error),
    );
    if (revealTimer.current !== null) {
      window.clearTimeout(revealTimer.current);
      revealTimer.current = null;
    }
    const index = windowIndex(appWindow.current.label);
    if (index >= count) {
      void appWindow.current.hide();
      return;
    }
    // 新窗口必须等 React 首帧和透明样式完成后再显示，避免 WebView2 白底闪现。
    if (!windowReady.current) {
      void appWindow.current.hide();
      return;
    }
    const remaining = startupDeadline.current - performance.now();
    if (remaining <= 0) {
      showWindow();
      return;
    }
    void appWindow.current.hide();
    revealTimer.current = window.setTimeout(() => {
      revealTimer.current = null;
      if (index < configuredCount.current) showWindow();
    }, remaining);
  };

  useEffect(() => {
    const unlistenPromise = listen<Partial<typeof DEFAULT_BEHAVIOR_CONFIG>>(
      "settings-updated",
      (event) => {
        controller.current?.applyConfig(event.payload);
        if (event.payload.roachSize) setRoachSize(event.payload.roachSize);
        const configuredCount = Math.max(
          1,
          Math.floor(
            event.payload.roachCount ?? DEFAULT_BEHAVIOR_CONFIG.roachCount,
          ),
        );
        updateWindowVisibility(configuredCount);
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
        setRoachSize(savedConfig.roachSize);
        updateWindowVisibility(savedConfig.roachCount);
      })
      .catch((error) => {
        console.error("Failed to read screen bounds:", error);
        controller.current = new MovementController(fallbackBounds, {
          ...savedConfig,
          roachCount: 1,
        });
        updateWindowVisibility(savedConfig.roachCount);
      });
    return () => {
      if (revealTimer.current !== null) {
        window.clearTimeout(revealTimer.current);
        revealTimer.current = null;
      }
      void unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  useEffect(() => {
    // 双 requestAnimationFrame 确保透明 DOM 至少完成一次浏览器绘制后再显示原生窗口。
    let firstFrame = 0;
    let secondFrame = 0;
    firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        windowReady.current = true;
        updateWindowVisibility(configuredCount.current);
      });
    });
    return () => {
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
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
          x: roach.position.x - ROACH_OFFSET,
          y: roach.position.y - ROACH_OFFSET,
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
          size={roachSize}
          onClick={(id, pointer) => controller.current?.escape(id, pointer)}
        />
      ))}
    </main>
  );
}
