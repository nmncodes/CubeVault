import { splitCubeState, stickerColor } from "@/lib/cube-visualizer";
import { cn } from "@/lib/utils";

interface CubeNet2DProps {
  state: string;
  className?: string;
  compact?: boolean;
}

interface FaceGridProps {
  stickers: string[];
  className?: string;
  compact?: boolean;
}

const FaceGrid = ({ stickers, className, compact = false }: FaceGridProps) => (
  <div
    className={cn(
      "grid grid-cols-3 grid-rows-3 gap-px overflow-hidden rounded-[4px] border border-black/35 bg-black/30",
      compact ? "h-8 w-8" : "h-10 w-10",
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

const CubeNet2D = ({ state, className, compact = false }: CubeNet2DProps) => {
  const faces = splitCubeState(state);

  return (
    <div className={cn("inline-grid grid-cols-4 grid-rows-3 gap-1", className)}>
      <FaceGrid stickers={faces.U} compact={compact} className="col-start-2 row-start-1" />
      <FaceGrid stickers={faces.L} compact={compact} className="col-start-1 row-start-2" />
      <FaceGrid stickers={faces.F} compact={compact} className="col-start-2 row-start-2" />
      <FaceGrid stickers={faces.R} compact={compact} className="col-start-3 row-start-2" />
      <FaceGrid stickers={faces.B} compact={compact} className="col-start-4 row-start-2" />
      <FaceGrid stickers={faces.D} compact={compact} className="col-start-2 row-start-3" />
    </div>
  );
};

export default CubeNet2D;
