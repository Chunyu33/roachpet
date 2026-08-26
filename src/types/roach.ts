export type RoachState = "IDLE" | "WALK" | "RUN" | "FLEE";
// 这些类型只描述桌宠领域数据，避免组件直接依赖窗口或 Tauri 实现细节。
export interface ScreenBounds {
  width: number;
  height: number;
}
export interface Position {
  x: number;
  y: number;
}
export interface Roach {
  id: string;
  position: Position;
  direction: number;
  velocity: Position;
  speed: number;
  targetSpeed: number;
  heading: number;
  targetHeading: number;
  gaitPhase: number;
  animationTime: number;
  state: RoachState;
  stateTime: number;
}
export interface RoachBehaviorConfig {
  roachCount: number;
  roachSize: number;
  walkSpeed: number;
  escapeSpeed: number;
  idleChance: number;
  idleDurationMin: number;
  idleDurationMax: number;
  turnIntervalMin: number;
  turnIntervalMax: number;
  escapeDuration: number;
  wanderStrength: number;
  runSpeed: number;
  acceleration: number;
  deceleration: number;
  turnSpeed: number;
  runChance: number;
  runDurationMin: number;
  runDurationMax: number;
}
