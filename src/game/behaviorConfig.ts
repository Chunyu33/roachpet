import type { RoachBehaviorConfig } from "../types/roach";

// 集中管理行为参数，后续设置窗口可以直接读写这组配置。
export const DEFAULT_BEHAVIOR_CONFIG: RoachBehaviorConfig = {
  roachCount: 3,
  roachSize: 96,
  walkSpeed: 72,
  escapeSpeed: 260,
  idleChance: 0.22,
  idleDurationMin: 1.2,
  idleDurationMax: 3.8,
  turnIntervalMin: 1.6,
  turnIntervalMax: 4.8,
  escapeDuration: 0.9,
  wanderStrength: 0.35,
};

export function createBehaviorConfig(
  overrides: Partial<RoachBehaviorConfig> = {},
): RoachBehaviorConfig {
  const config = { ...DEFAULT_BEHAVIOR_CONFIG, ...overrides };
  return {
    ...config,
    roachCount: Math.max(1, Math.floor(config.roachCount)),
    roachSize: Math.max(32, config.roachSize),
    walkSpeed: Math.max(1, config.walkSpeed),
    escapeSpeed: Math.max(config.walkSpeed, config.escapeSpeed),
    idleChance: Math.min(1, Math.max(0, config.idleChance)),
    idleDurationMin: Math.max(0.1, config.idleDurationMin),
    idleDurationMax: Math.max(config.idleDurationMin, config.idleDurationMax),
    turnIntervalMin: Math.max(0.2, config.turnIntervalMin),
    turnIntervalMax: Math.max(config.turnIntervalMin, config.turnIntervalMax),
    escapeDuration: Math.max(0.1, config.escapeDuration),
    wanderStrength: Math.max(0, config.wanderStrength),
  };
}
