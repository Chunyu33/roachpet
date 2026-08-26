import type {
  Position,
  Roach,
  RoachBehaviorConfig,
  ScreenBounds,
} from "../types/roach";
import { createBehaviorConfig } from "./behaviorConfig";

export class MovementController {
  readonly bounds: ScreenBounds;
  config: RoachBehaviorConfig;
  private roaches: Roach[];
  private nextTurnAt = new Map<string, number>();
  private idleDuration = new Map<string, number>();

  constructor(
    bounds: ScreenBounds,
    overrides: Partial<RoachBehaviorConfig> = {},
    initialPositions: Position[] = [],
  ) {
    this.bounds = bounds;
    this.config = createBehaviorConfig(overrides);
    this.roaches = Array.from(
      { length: this.config.roachCount },
      (_, index) => {
        const heading = this.randomHeading();
        return {
          id: `roach-${index + 1}`,
          position: initialPositions[index] ?? this.randomPosition(),
          direction: heading.x >= 0 ? 1 : -1,
          velocity: heading,
          speed: this.config.walkSpeed,
          state: "WALK" as const,
          stateTime: 0,
        };
      },
    );
    this.roaches.forEach((roach) => this.scheduleTurn(roach));
  }

  get snapshot(): Roach[] {
    return this.roaches.map((roach) => ({
      ...roach,
      position: { ...roach.position },
      velocity: { ...roach.velocity },
    }));
  }

  // 每只蟑螂独立推进，二维速度向量让它们能在屏幕内自然乱爬。
  update(deltaSeconds: number): Roach[] {
    this.roaches.forEach((roach) => this.updateRoach(roach, deltaSeconds));
    return this.snapshot;
  }

  applyConfig(overrides: Partial<RoachBehaviorConfig>): void {
    this.config = createBehaviorConfig({ ...this.config, ...overrides });
    this.roaches.forEach((roach) => {
      if (roach.state !== "IDLE")
        roach.speed =
          roach.state === "ESCAPE"
            ? this.config.escapeSpeed
            : this.config.walkSpeed;
    });
  }

  escape(id?: string): void {
    this.roaches
      .filter((roach) => !id || roach.id === id)
      .forEach((roach) => {
        roach.state = "ESCAPE";
        roach.speed = this.config.escapeSpeed;
        roach.stateTime = 0;
        roach.velocity = this.randomHeading();
        roach.direction = roach.velocity.x >= 0 ? 1 : -1;
      });
  }

  private updateRoach(roach: Roach, deltaSeconds: number): void {
    roach.stateTime += deltaSeconds;
    if (roach.state === "IDLE") {
      if (
        roach.stateTime >=
        (this.idleDuration.get(roach.id) ?? this.config.idleDurationMin)
      )
        this.startWalking(roach);
      return;
    }
    if (
      roach.state === "ESCAPE" &&
      roach.stateTime >= this.config.escapeDuration
    )
      this.startWalking(roach);
    if (
      roach.state === "WALK" &&
      roach.stateTime >= (this.nextTurnAt.get(roach.id) ?? 0)
    ) {
      if (Math.random() < this.config.idleChance) {
        this.startIdle(roach);
        return;
      }
      roach.velocity = this.randomHeading();
      roach.direction = roach.velocity.x >= 0 ? 1 : -1;
      this.scheduleTurn(roach);
    }
    const distance = roach.speed * deltaSeconds;
    roach.position.x += roach.velocity.x * distance;
    roach.position.y += roach.velocity.y * distance;
    this.clampToBounds(roach);
  }

  private startIdle(roach: Roach): void {
    roach.state = "IDLE";
    roach.speed = 0;
    roach.stateTime = 0;
    this.idleDuration.set(
      roach.id,
      this.randomBetween(
        this.config.idleDurationMin,
        this.config.idleDurationMax,
      ),
    );
  }
  private startWalking(roach: Roach): void {
    roach.state = "WALK";
    roach.speed = this.config.walkSpeed;
    roach.stateTime = 0;
    roach.velocity = this.randomHeading();
    roach.direction = roach.velocity.x >= 0 ? 1 : -1;
    this.scheduleTurn(roach);
  }
  private scheduleTurn(roach: Roach): void {
    // Store an absolute state-time deadline. Using only a duration here would
    // make the controller turn every frame after the first deadline elapsed.
    this.nextTurnAt.set(
      roach.id,
      roach.stateTime +
        this.randomBetween(
          this.config.turnIntervalMin,
          this.config.turnIntervalMax,
        ),
    );
  }

  private clampToBounds(roach: Roach): void {
    const maxX = Math.max(0, this.bounds.width - this.config.roachSize);
    const maxY = Math.max(0, this.bounds.height - this.config.roachSize);
    if (roach.position.x <= 0) {
      roach.position.x = 0;
      roach.velocity.x = Math.abs(roach.velocity.x);
      roach.direction = 1;
      this.scheduleTurn(roach);
    }
    if (roach.position.x >= maxX) {
      roach.position.x = maxX;
      roach.velocity.x = -Math.abs(roach.velocity.x);
      roach.direction = -1;
      this.scheduleTurn(roach);
    }
    if (roach.position.y <= 0) roach.velocity.y = Math.abs(roach.velocity.y);
    if (roach.position.y >= maxY)
      roach.velocity.y = -Math.abs(roach.velocity.y);
    roach.position.y = Math.min(maxY, Math.max(0, roach.position.y));
  }

  private randomPosition(): Position {
    return {
      x: Math.random() * Math.max(0, this.bounds.width - this.config.roachSize),
      y:
        Math.random() * Math.max(0, this.bounds.height - this.config.roachSize),
    };
  }
  private randomHeading(): Position {
    const angle = Math.random() * Math.PI * 2;
    return { x: Math.cos(angle), y: Math.sin(angle) };
  }
  private randomBetween(minimum: number, maximum: number): number {
    return minimum + Math.random() * (maximum - minimum);
  }
}
