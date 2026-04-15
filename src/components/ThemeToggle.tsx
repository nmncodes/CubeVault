import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
}

const ThemeToggle = ({ className }: ThemeToggleProps) => {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";
  const nextTheme = isDark ? "light" : "dark";

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => setTheme(nextTheme)}
      aria-label={`Switch to ${nextTheme} mode`}
      title={`Switch to ${nextTheme} mode`}
      className={cn(
        "gap-2 border-foreground/55 bg-card text-foreground hover:bg-foreground hover:text-background",
        className
      )}
    >
      {isDark ? <Sun size={14} /> : <Moon size={14} />}
      <span className="hidden sm:inline">{isDark ? "Light" : "Dark"} mode</span>
    </Button>
  );
};

export default ThemeToggle;
