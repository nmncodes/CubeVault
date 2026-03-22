import { splitCubeState, stickerColor } from "@/lib/cube-visualizer";
import { cn } from "@/lib/utils";

interface MiniCubeProps {
  state: string;
  className?: string;
}

interface FaceGridProps {
  stickers: string[];
  className?: string;
}

const FaceGrid = ({ stickers, className }: FaceGridProps) => (
  <div
    className={cn(
      "grid grid-cols-3 grid-rows-3 gap-px rounded-[2px] border border-black/30 bg-black/30 overflow-hidden",
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

const MiniCube = ({ state, className }: MiniCubeProps) => {
  const faces = splitCubeState(state);

  return (
    <div className={cn("relative h-28 w-36", className)}>
      <FaceGrid
        stickers={faces.U}
        className="absolute left-9 top-1 h-12 w-12 origin-bottom-left -skew-x-[30deg] scale-y-[0.86] shadow"
      />
      <FaceGrid
        stickers={faces.F}
        className="absolute left-7 top-[3.4rem] h-12 w-12 shadow"
      />
      <FaceGrid
        stickers={faces.R}
        className="absolute left-[4.9rem] top-[3.4rem] h-12 w-12 origin-top-left skew-y-[-30deg] shadow"
      />
    </div>
  );
};

export default MiniCube;
