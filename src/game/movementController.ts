import type {
  Position,
  Roach,
  RoachBehaviorConfig,
  ScreenBounds,
} from "../types/roach";
import { createBehaviorConfig } from "./behaviorConfig";

const TAU = Math.PI * 2;

/** Lightweight per-roach movement and behaviour state machine. */
export class MovementController {
  readonly bounds: ScreenBounds;
  config: RoachBehaviorConfig;
  private roaches: Roach[];
  private nextTurnAt = new Map<string, number>();
  private idleDuration = new Map<string, number>();
  private runDuration = new Map<string, number>();

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
        const headingAngle = Math.atan2(heading.y, heading.x);
        return {
          id: `roach-${index + 1}`,
          position: initialPositions[index] ?? this.randomPosition(),
          direction: heading.x >= 0 ? 1 : -1,
          velocity: heading,
          speed: this.config.walkSpeed,
          targetSpeed: this.config.walkSpeed,
          heading: headingAngle,
          targetHeading: headingAngle,
          gaitPhase: Math.random() * TAU,
          animationTime: Math.random() * 10,
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

  update(deltaSeconds: number): Roach[] {
    const dt = Math.min(0.05, Math.max(0, deltaSeconds));
    this.roaches.forEach((roach) => this.updateRoach(roach, dt));
    return this.snapshot;
  }

  applyConfig(overrides: Partial<RoachBehaviorConfig>): void {
    this.config = createBehaviorConfig({ ...this.config, ...overrides });
    this.roaches.forEach((roach) => {
      roach.targetSpeed = this.speedForState(roach.state);
    });
  }

  escape(id?: string, pointer?: Position): void {
    this.roaches
      .filter((roach) => !id || roach.id === id)
      .forEach((roach) => {
        const away = pointer
          ? { x: roach.position.x - pointer.x, y: roach.position.y - pointer.y }
          : this.randomHeading();
        const length = Math.hypot(away.x, away.y) || 1;
        roach.targetHeading = Math.atan2(away.y / length, away.x / length);
        roach.state = "FLEE";
        roach.targetSpeed = this.config.escapeSpeed;
        roach.stateTime = 0;
      });
  }

  private updateRoach(roach: Roach, dt: number): void {
    roach.stateTime += dt;
    roach.animationTime += dt;
    if (roach.state === "IDLE") {
      roach.targetSpeed = 0;
      if (roach.stateTime >= (this.idleDuration.get(roach.id) ?? 1))
        this.startWalking(roach);
    } else if (roach.state === "FLEE") {
      roach.targetSpeed = this.config.escapeSpeed;
      if (roach.stateTime >= this.config.escapeDuration)
        this.startWalking(roach);
    } else if (roach.state === "RUN") {
      roach.targetSpeed = this.config.runSpeed;
      if (roach.stateTime >= (this.runDuration.get(roach.id) ?? 0.6))
        this.startWalking(roach);
    } else if (roach.state === "WALK") {
      roach.targetSpeed = this.config.walkSpeed;
      if (roach.stateTime >= (this.nextTurnAt.get(roach.id) ?? 0)) {
        if (Math.random() < this.config.idleChance) this.startIdle(roach);
        else if (Math.random() < this.config.runChance) this.startRun(roach);
        else {
          roach.targetHeading = this.randomAngleNear(roach.heading);
          this.scheduleTurn(roach);
        }
      }
    }
    const rate =
      roach.targetSpeed > roach.speed
        ? this.config.acceleration
        : this.config.deceleration;
    roach.speed += (roach.targetSpeed - roach.speed) * Math.min(1, rate * dt);
    roach.heading = this.approachAngle(
      roach.heading,
      roach.targetHeading,
      this.config.turnSpeed * dt,
    );
    roach.velocity = { x: Math.cos(roach.heading), y: Math.sin(roach.heading) };
    roach.direction = roach.velocity.x >= 0 ? 1 : -1;
    roach.gaitPhase = (roach.gaitPhase + dt * (1.5 + roach.speed / 24)) % TAU;
    const distance = roach.speed * dt;
    roach.position.x += roach.velocity.x * distance;
    roach.position.y += roach.velocity.y * distance;
    this.clampToBounds(roach);
  }

  private startIdle(roach: Roach): void {
    roach.state = "IDLE";
    roach.stateTime = 0;
    roach.targetSpeed = 0;
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
    roach.stateTime = 0;
    roach.targetSpeed = this.config.walkSpeed;
    roach.targetHeading = this.randomAngleNear(roach.heading);
    this.scheduleTurn(roach);
  }
  private startRun(roach: Roach): void {
    roach.state = "RUN";
    roach.stateTime = 0;
    roach.targetSpeed = this.config.runSpeed;
    this.runDuration.set(
      roach.id,
      this.randomBetween(
        this.config.runDurationMin,
        this.config.runDurationMax,
      ),
    );
    roach.targetHeading = this.randomAngleNear(roach.heading);
  }
  private speedForState(state: Roach["state"]): number {
    if (state === "IDLE") return 0;
    if (state === "RUN") return this.config.runSpeed;
    if (state === "FLEE") return this.config.escapeSpeed;
    return this.config.walkSpeed;
  }
  private scheduleTurn(roach: Roach): void {
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
    if (roach.position.x <= 0 || roach.position.x >= maxX) {
      roach.position.x = Math.min(maxX, Math.max(0, roach.position.x));
      roach.heading = Math.PI - roach.heading;
      roach.targetHeading = Math.PI - roach.targetHeading;
      roach.velocity.x = -roach.velocity.x;
      roach.direction = roach.velocity.x >= 0 ? 1 : -1;
      this.scheduleTurn(roach);
    }
    if (roach.position.y <= 0 || roach.position.y >= maxY) {
      roach.position.y = Math.min(maxY, Math.max(0, roach.position.y));
      roach.heading = -roach.heading;
      roach.targetHeading = -roach.targetHeading;
      roach.velocity.y = -roach.velocity.y;
    }
  }
  private randomPosition(): Position {
    return {
      x: Math.random() * Math.max(0, this.bounds.width - this.config.roachSize),
      y:
        Math.random() * Math.max(0, this.bounds.height - this.config.roachSize),
    };
  }
  private randomHeading(): Position {
    const angle = Math.random() * TAU;
    return { x: Math.cos(angle), y: Math.sin(angle) };
  }
  private randomAngleNear(angle: number): number {
    return angle + (Math.random() - 0.5) * Math.PI * 1.1;
  }
  private approachAngle(
    current: number,
    target: number,
    amount: number,
  ): number {
    const delta = ((target - current + Math.PI) % TAU) - Math.PI;
    return current + Math.max(-amount, Math.min(amount, delta));
  }
  private randomBetween(minimum: number, maximum: number): number {
    return minimum + Math.random() * (maximum - minimum);
  }
}
