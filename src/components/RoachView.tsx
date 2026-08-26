import type { Roach } from "../types/roach";
import { useState } from "react";
import { RoachSprite } from "./RoachSprite";
import "./RoachView.css";

interface RoachViewProps {
  roach: Roach;
  onClick: (id: string, pointer?: { x: number; y: number }) => void;
}

export function RoachView({ roach, onClick }: RoachViewProps) {
  const [pointerAngle, setPointerAngle] = useState<number | null>(null);
  // The SVG's natural forward axis points upward (towards the head). Rotate
  // that axis onto the current velocity vector instead of only mirroring X.
  const travelAngle =
    (Math.atan2(roach.velocity.y, roach.velocity.x) * 180) / Math.PI + 90;
  return (
    <button
      className={`roach ${roach.state.toLowerCase()}`}
      style={{
        left: roach.position.x,
        top: roach.position.y,
        transform: `rotate(${travelAngle}deg)`,
      }}
      onPointerMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const dx = event.clientX - rect.left - 48;
        const dy = event.clientY - rect.top - 54;
        setPointerAngle((Math.atan2(dy, dx) * 180) / Math.PI);
      }}
      onPointerLeave={() => setPointerAngle(null)}
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        onClick(roach.id, {
          x: roach.position.x + event.clientX - rect.left,
          y: roach.position.y + event.clientY - rect.top,
        });
      }}
      aria-label="Roach"
    >
      <RoachSprite roach={roach} pointerAngle={pointerAngle} />
    </button>
  );
}
