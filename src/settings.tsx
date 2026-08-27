import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  createBehaviorConfig,
  DEFAULT_BEHAVIOR_CONFIG,
} from "./game/behaviorConfig";
import type { RoachBehaviorConfig } from "./types/roach";
import "./settings.css";

function readSavedConfig(): RoachBehaviorConfig {
  // 设置窗口独立于桌宠窗口，先从本地缓存恢复上次的表单值。
  try {
    const saved = localStorage.getItem("roachpet.behavior-config");
    return createBehaviorConfig(saved ? JSON.parse(saved) : {});
  } catch {
    return DEFAULT_BEHAVIOR_CONFIG;
  }
}

export default function Settings() {
  const [config, setConfig] = useState<RoachBehaviorConfig>(readSavedConfig);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const update = <Key extends keyof RoachBehaviorConfig>(
    key: Key,
    value: number,
  ) => {
    setSaved(false);
    setConfig((current) => ({ ...current, [key]: value }));
  };

  const save = async () => {
    try {
      // 由 Rust 统一广播，确保所有桌宠窗口同时收到新配置。
      localStorage.setItem("roachpet.behavior-config", JSON.stringify(config));
      await invoke("save_behavior_settings", { settings: config });
      // 保存后保留窗口，方便连续调节参数并观察桌宠即时变化。
      setError("");
      setSaved(true);
    } catch (saveError) {
      setSaved(false);
      setError(
        saveError instanceof Error ? saveError.message : String(saveError),
      );
    }
  };

  return (
    <main className="settings">
      {/* <h1>RoachPet 设置</h1> */}
      <section className="form">
        <label>
          蟑螂数量
          <input
            type="number"
            min="1"
            max="3"
            value={config.roachCount}
            onChange={(event) =>
              update("roachCount", Number(event.target.value))
            }
          />
        </label>
        <label>
          蟑螂个头
          <select
            value={config.roachSize}
            onChange={(event) =>
              update("roachSize", Number(event.target.value))
            }
          >
            <option value="96">街坊标配 · 灵活窜位</option>
            <option value="120">大只佬 · 默认体型</option>
            <option value="144">广东巨无霸 · 压迫感拉满</option>
          </select>
        </label>
        <label className="delay-field">
          启动后出现（下次启动生效）
          <div className="delay-inputs">
            <input
              type="number"
              min="0"
              max="60"
              value={Math.floor(config.startupDelaySeconds / 60)}
              onChange={(event) =>
                update(
                  "startupDelaySeconds",
                  Number(event.target.value) * 60 +
                    (config.startupDelaySeconds % 60),
                )
              }
            />
            <span>分</span>
            <input
              type="number"
              min="0"
              max="59"
              value={config.startupDelaySeconds % 60}
              onChange={(event) =>
                update(
                  "startupDelaySeconds",
                  Math.floor(config.startupDelaySeconds / 60) * 60 +
                    Number(event.target.value),
                )
              }
            />
            <span>秒</span>
          </div>
        </label>
        <label>
          移动速度
          <input
            type="range"
            min="20"
            max="180"
            value={config.walkSpeed}
            onChange={(event) =>
              update("walkSpeed", Number(event.target.value))
            }
          />
          <output>{Math.round(config.walkSpeed)} 像素/秒</output>
        </label>
        <label>
          停顿概率
          <input
            type="range"
            min="0"
            max="0.8"
            step="0.01"
            value={config.idleChance}
            onChange={(event) =>
              update("idleChance", Number(event.target.value))
            }
          />
          <output>{Math.round(config.idleChance * 100)}%</output>
        </label>
        <label>
          逃跑时长
          <input
            type="range"
            min="0.2"
            max="3"
            step="0.1"
            value={config.escapeDuration}
            onChange={(event) =>
              update("escapeDuration", Number(event.target.value))
            }
          />
          <output>{config.escapeDuration.toFixed(1)} 秒</output>
        </label>
      </section>
      <div className="action-bar">
        <div className="status" role="status" aria-live="polite">
          {error && <p className="error">{error}</p>}
          {saved && <p className="saved">已保存，桌宠参数立即生效</p>}
        </div>
        <div className="actions">
          <button onClick={() => void getCurrentWindow().close()}>取消</button>
          <button className="primary" onClick={() => void save()}>
            保存设置
          </button>
        </div>
      </div>
    </main>
  );
}

import { createRoot } from "react-dom/client";
createRoot(document.getElementById("settings-root")!).render(<Settings />);
