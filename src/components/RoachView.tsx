import type { Roach } from "../types/roach";
import { useState } from "react";
import { getRoachDialogue } from "../game/dialogue";
import { RoachSprite } from "./RoachSprite";
import "./RoachView.css";

interface RoachViewProps {
  roach: Roach;
  size?: number;
  onClick: (id: string, pointer?: { x: number; y: number }) => void;
}

export function RoachView({ roach, size = 96, onClick }: RoachViewProps) {
  const [pointerAngle, setPointerAngle] = useState<number | null>(null);
  const [hovered, setHovered] = useState(false);
  const [bubbleText, setBubbleText] = useState("");
  // The SVG's natural forward axis points upward (towards the head). Rotate
  // that axis onto the current velocity vector instead of only mirroring X.
  const travelAngle =
    (Math.atan2(roach.velocity.y, roach.velocity.x) * 180) / Math.PI + 90;
  const visualHeight = (size * 108) / 96;
  return (
    <button
      className={`roach ${roach.state.toLowerCase()}`}
      style={{
        left: roach.position.x,
        top: roach.position.y,
        width: size,
        height: visualHeight,
        transformOrigin: `${size / 2}px ${visualHeight / 2}px`,
        transform: `rotate(${travelAngle}deg)`,
      }}
      onPointerEnter={() => {
        setBubbleText(getRoachDialogue());
        setHovered(true);
      }}
      onPointerMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const dx = event.clientX - rect.left - size / 2;
        const dy = event.clientY - rect.top - visualHeight / 2;
        setPointerAngle((Math.atan2(dy, dx) * 180) / Math.PI);
      }}
      onPointerLeave={() => {
        setPointerAngle(null);
        setHovered(false);
      }}
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        onClick(roach.id, {
          x: roach.position.x + event.clientX - rect.left,
          y: roach.position.y + event.clientY - rect.top,
        });
      }}
      aria-label="Roach"
    >
      <RoachSprite
        roach={roach}
        pointerAngle={pointerAngle}
        showBubble={hovered}
        bubbleText={bubbleText}
        travelAngle={travelAngle}
      />
    </button>
  );
}
