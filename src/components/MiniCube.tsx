import { splitCubeState, stickerColor } from "@/lib/cube-visualizer";
import { cn } from "@/lib/utils";

interface MiniCubeProps {
  state: string;
  className?: string;
  size?: "sm" | "md";
}

interface FaceGridProps {
  stickers: string[];
  className?: string;
}

const FaceGrid = ({ stickers, className }: FaceGridProps) => (
  <div
    className={cn(
      "grid grid-cols-3 grid-rows-3 gap-px overflow-hidden rounded-[4px] border border-black/35 bg-black/30",
      className
    )}
  >
    {stickers.map((sticker, index) => (
      <div
        key={index}
        className="h-full w-full"
        style={{ backgroundColor: stickerColor(sticker) }}
      />
    ))}
  </div>
);

const MiniCube = ({ state, className, size = "md" }: MiniCubeProps) => {
  const faces = splitCubeState(state);
  const compact = size === "sm";

  return (
    <div
      className={cn(
        compact ? "relative h-20 w-24 [perspective:300px]" : "relative h-28 w-32 [perspective:360px]",
        className
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute left-1/2 -translate-x-1/2 rounded-full bg-black/45 blur-md",
          compact ? "top-[70%] h-5 w-12" : "top-[68%] h-7 w-16"
        )}
      />
      <div
        className={cn(
          "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 [transform-style:preserve-3d] [transform:rotateX(-27deg)_rotateY(42deg)]",
          compact ? "h-10 w-10" : "h-14 w-14"
        )}
      >
        <FaceGrid
          stickers={faces.F}
          className={cn(
            "absolute inset-0 shadow-[0_4px_10px_rgba(0,0,0,0.45)]",
            compact ? "[transform:translateZ(20px)]" : "[transform:translateZ(28px)]"
          )}
        />
        <FaceGrid
          stickers={faces.R}
          className={cn(
            "absolute inset-0 shadow-[0_4px_10px_rgba(0,0,0,0.45)]",
            compact
              ? "[transform:rotateY(90deg)_translateZ(20px)]"
              : "[transform:rotateY(90deg)_translateZ(28px)]"
          )}
        />
        <FaceGrid
          stickers={faces.U}
          className={cn(
            "absolute inset-0 shadow-[0_4px_10px_rgba(0,0,0,0.45)]",
            compact
              ? "[transform:rotateX(90deg)_translateZ(20px)]"
              : "[transform:rotateX(90deg)_translateZ(28px)]"
          )}
        />
      </div>
    </div>
  );
};

export default MiniCube;
