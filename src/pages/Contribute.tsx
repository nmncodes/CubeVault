import { ArrowLeft, Github, Sparkles, Wrench } from "lucide-react";
import { Link } from "react-router-dom";
import ThemeToggle from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Contribute = () => {
  return (
    <div className="min-h-screen bg-[radial-gradient(120%_100%_at_20%_0%,#e2e8f0_0%,hsl(var(--background))_55%)] px-4 py-8 dark:bg-[radial-gradient(120%_100%_at_20%_0%,#1e293b_0%,hsl(var(--background))_55%)] md:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <Link to="/">
            <Button variant="outline" className="gap-2">
              <ArrowLeft size={16} />
              Back To Timer
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <span className="hidden font-mono-timer text-xs uppercase tracking-[0.18em] text-muted-foreground sm:inline">
              CubeVault Contributor Hub
            </span>
            <ThemeToggle />
          </div>
        </div>

        <Card className="border-border/60 bg-card/70 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-3xl md:text-4xl">Contribute To CubeVault</CardTitle>
            <p className="text-muted-foreground">
              CubeVault is a modern 3x3 rubik's cube timer built to serve the needs of speedcubers. 
              It is open-source and welcomes contributions of all kinds, from code to design to documentation.
            </p>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-border/60 bg-secondary/30 p-4">
              <div className="mb-2 inline-flex rounded-md border border-border/70 bg-background/60 p-2">
                <Github size={16} />
              </div>
              <h3 className="font-semibold">Open Tracks</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Replay UX polish, timer ergonomics, export/import, and richer
                stats like ao25/ao100.
              </p>
            </div>
            <div className="rounded-lg border border-border/60 bg-secondary/30 p-4">
              <div className="mb-2 inline-flex rounded-md border border-border/70 bg-background/60 p-2">
                <Wrench size={16} />
              </div>
              <h3 className="font-semibold">Local Workflow</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Run <code className="font-mono-timer">vite dev</code>, then test with{" "}
                <code className="font-mono-timer">vitest</code> and{" "}
                <code className="font-mono-timer">eslint</code>.
              </p>
            </div>
            <div className="rounded-lg border border-border/60 bg-secondary/30 p-4">
              <div className="mb-2 inline-flex rounded-md border border-border/70 bg-background/60 p-2">
                <Sparkles size={16} />
              </div>
              <h3 className="font-semibold">Good First Feature</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Add personal profile fields and show best session badges directly
                in the sidebar.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Contribute;
