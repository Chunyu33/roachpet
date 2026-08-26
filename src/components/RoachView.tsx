import type { Roach } from "../types/roach";
import roachSprite from "../assets/roach.svg";
import "./RoachView.css";

interface RoachViewProps {
  roach: Roach;
  onClick: (id: string) => void;
}

export function RoachView({ roach, onClick }: RoachViewProps) {
  // 视觉层只关心一只蟑螂，未来替换为 PNG/GIF 时无需改行为控制器。
  return (
    <button
      className={`roach ${roach.state.toLowerCase()}`}
      style={{
        left: roach.position.x,
        top: roach.position.y,
        transform: `scaleX(${roach.direction})`,
      }}
      onClick={() => onClick(roach.id)}
      aria-label="Roach"
    >
      <img
        className="roach-sprite"
        src={roachSprite}
        alt=""
        draggable={false}
      />
    </button>
  );
}
