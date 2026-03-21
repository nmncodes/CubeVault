interface ScrambleDisplayProps {
  scramble: string;
}

const ScrambleDisplay = ({ scramble }: ScrambleDisplayProps) => {
  return (
    <div className="px-4 py-3 text-center">
      <p className="font-mono-timer text-base md:text-lg tracking-wide text-foreground/90 select-none leading-relaxed">
        {scramble}
      </p>
    </div>
  );
};

export default ScrambleDisplay;
