import { useMemo, useState } from "react";
import {
  Cloud,
  CloudOff,
  Github,
  Globe,
  Loader2,
  LogOut,
  RefreshCcw,
  ShieldCheck,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { SolveStorageMode } from "@/hooks/use-solves";

interface AuthCardProps {
  storageMode: SolveStorageMode;
  lastSyncError?: string;
  onRetrySync: () => Promise<void>;
  solveCount: number;
}

function getStatusCopy(storageMode: SolveStorageMode) {
  switch (storageMode) {
    case "cloud":
      return {
        label: "Cloud Sync Live",
        variant: "secondary" as const,
        icon: Cloud,
      };
    case "syncing":
      return {
        label: "Syncing",
        variant: "outline" as const,
        icon: RefreshCcw,
      };
    case "sync-error":
      return {
        label: "Sync Paused",
        variant: "destructive" as const,
        icon: CloudOff,
      };
    default:
      return {
        label: "Session Only",
        variant: "outline" as const,
        icon: ShieldCheck,
      };
  }
}

export default function AuthCard({
  storageMode,
  lastSyncError,
  onRetrySync,
  solveCount,
}: AuthCardProps) {
  const {
    user,
    providers,
    isAuthConfigured,
    isStorageConfigured,
    signInWithOAuth,
    signOut,
  } = useAuth();
  const { toast } = useToast();
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const statusCopy = useMemo(() => getStatusCopy(storageMode), [storageMode]);
  const StatusIcon = statusCopy.icon;
  const userLabel = user?.name || user?.email?.split("@")[0] || "CubeVault account";

  async function handleProviderSignIn(providerId: string) {
    try {
      setPendingAction(providerId);
      await signInWithOAuth(providerId);
    } catch (error) {
      toast({
        title: "Sign-in failed",
        description: error instanceof Error ? error.message : "Unknown auth error.",
      });
      setPendingAction(null);
    }
  }

  async function handleRetrySync() {
    try {
      setPendingAction("retry");
      await onRetrySync();
      toast({
        title: "Sync restored",
        description: "Your latest CubeVault solves are back in Neon.",
      });
    } catch (error) {
      toast({
        title: "Retry failed",
        description: error instanceof Error ? error.message : "Unknown sync error.",
      });
    } finally {
      setPendingAction(null);
    }
  }

  async function handleSignOut() {
    try {
      setPendingAction("signout");
      await signOut();
    } catch (error) {
      toast({
        title: "Sign-out failed",
        description: error instanceof Error ? error.message : "Unknown auth error.",
      });
    } finally {
      setPendingAction(null);
    }
  }

  if (!isAuthConfigured || !isStorageConfigured) {
    return (
      <Card className="border-2 border-dashed border-black/60 bg-card/90 shadow-[0_8px_0_rgba(0,0,0,0.08)]">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CloudOff size={16} />
            <CardTitle className="text-lg">Enable Auth.js + Neon</CardTitle>
          </div>
          <CardDescription>
            OAuth and cloud saves are available, but server config is incomplete.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Set <code className="font-mono-timer">AUTH_SECRET</code>, provider keys
            (for example <code className="font-mono-timer">AUTH_GOOGLE_ID</code> /
            <code className="font-mono-timer">AUTH_GOOGLE_SECRET</code>), and{" "}
            <code className="font-mono-timer">DATABASE_URL</code>.
          </p>
          <p>
            Then run the SQL in <code className="font-mono-timer">neon/cubevault.sql</code>.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (user) {
    return (
      <Card className="border-2 border-black bg-card/95 shadow-[0_8px_0_rgba(0,0,0,0.08)]">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <Avatar className="border border-black/20">
                <AvatarFallback className="bg-muted font-semibold uppercase text-foreground">
                  {userLabel.slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-lg">Signed In</CardTitle>
                <CardDescription className="mt-1">{user.email ?? "No email"}</CardDescription>
              </div>
            </div>
            <Badge
              variant={statusCopy.variant}
              className="gap-1 border border-black/15 bg-card px-2.5 py-1 uppercase tracking-[0.12em]"
            >
              <StatusIcon size={12} />
              {statusCopy.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl border border-black/10 bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
            <p>
              {solveCount} solve{solveCount === 1 ? "" : "s"} linked to this account.
            </p>
            <p className="mt-1">New solves and edits sync to Neon through the API.</p>
            {lastSyncError && <p className="mt-2 text-destructive">{lastSyncError}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="gap-2 border-black bg-card text-foreground hover:bg-black hover:text-white"
              onClick={() => void handleRetrySync()}
              disabled={pendingAction !== null && pendingAction !== "retry"}
            >
              {pendingAction === "retry" ? (
                <Loader2 className="animate-spin" />
              ) : (
                <RefreshCcw size={14} />
              )}
              Retry Sync
            </Button>
            <Button
              variant="outline"
              className="gap-2 border-black bg-card text-foreground hover:bg-black hover:text-white"
              onClick={() => void handleSignOut()}
              disabled={pendingAction !== null}
            >
              {pendingAction === "signout" ? (
                <Loader2 className="animate-spin" />
              ) : (
                <LogOut size={14} />
              )}
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-black bg-card/95 shadow-[0_8px_0_rgba(0,0,0,0.08)]">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} />
          <CardTitle className="text-lg">Sign In To Save Your Times</CardTitle>
        </div>
        <CardDescription>
          OAuth is handled by Auth.js and solve history is stored in Neon.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-2">
          {providers.map((provider) => (
            <Button
              key={provider.id}
              variant="outline"
              className="gap-2 border-black bg-card text-foreground hover:bg-black hover:text-white"
              onClick={() => void handleProviderSignIn(provider.id)}
              disabled={pendingAction !== null}
            >
              {pendingAction === provider.id ? (
                <Loader2 className="animate-spin" />
              ) : provider.id === "github" ? (
                <Github size={14} />
              ) : (
                <Globe size={14} />
              )}
              Continue with {provider.name}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
