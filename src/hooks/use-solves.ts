import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/components/ui/use-toast";
import { Solve } from "@/lib/scramble";
import {
  areSolveSetsEqual,
  clearGuestSolves,
  listRemoteSolves,
  loadAccountCachedSolves,
  loadGuestSolves,
  mergeSolveSets,
  saveAccountCachedSolves,
  saveGuestSolves,
  syncRemoteSolves,
} from "@/lib/solve-store";

export type SolveStorageMode = "guest" | "syncing" | "cloud" | "sync-error";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown sync error.";
}

function stampSolve(solve: Solve) {
  return {
    ...solve,
    updatedAt: new Date().toISOString(),
  };
}

export function useSolveStore() {
  const {
    user,
    isAuthConfigured,
    isStorageConfigured,
    isLoading: authLoading,
  } = useAuth();
  const { toast } = useToast();
  const [solves, setSolves] = useState<Solve[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [storageMode, setStorageMode] = useState<SolveStorageMode>("guest");
  const [lastSyncError, setLastSyncError] = useState<string>();
  const solvesRef = useRef<Solve[]>([]);

  const accountId =
    typeof user?.id === "string" && user.id.length > 0
      ? user.id
      : typeof user?.email === "string" && user.email.length > 0
        ? user.email.toLowerCase()
        : null;

  useEffect(() => {
    solvesRef.current = solves;
  }, [solves]);

  const persistSnapshot = useCallback(
    async (nextSolves: Solve[]) => {
      if (!accountId || !isStorageConfigured) {
        saveGuestSolves(nextSolves);
        setStorageMode("guest");
        setLastSyncError(undefined);
        return;
      }

      saveAccountCachedSolves(accountId, nextSolves);
      setStorageMode("syncing");

      try {
        await syncRemoteSolves(nextSolves);
        clearGuestSolves();
        setStorageMode("cloud");
        setLastSyncError(undefined);
      } catch (error) {
        const description = getErrorMessage(error);
        setStorageMode("sync-error");
        setLastSyncError(description);
        toast({
          title: "Cloud sync paused",
          description,
        });
      }
    },
    [accountId, isStorageConfigured, toast]
  );

  const replaceSolves = useCallback(
    async (nextSolves: Solve[]) => {
      solvesRef.current = nextSolves;
      setSolves(nextSolves);
      await persistSnapshot(nextSolves);
    },
    [persistSnapshot]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadSolves() {
      if (isAuthConfigured && authLoading) {
        setIsLoading(true);
        return;
      }

      const guestSolves = loadGuestSolves();

      if (!isAuthConfigured || !isStorageConfigured || !accountId) {
        if (cancelled) return;
        solvesRef.current = guestSolves;
        setSolves(guestSolves);
        setStorageMode("guest");
        setLastSyncError(undefined);
        setIsLoading(false);
        return;
      }

      const cachedAccountSolves = loadAccountCachedSolves(accountId);
      const optimisticSolves = mergeSolveSets(cachedAccountSolves, guestSolves);

      if (!cancelled) {
        solvesRef.current = optimisticSolves;
        setSolves(optimisticSolves);
        setStorageMode("syncing");
      }

      try {
        const remoteSolves = await listRemoteSolves();
        const mergedSolves = mergeSolveSets(remoteSolves, cachedAccountSolves, guestSolves);
        const needsSync = !areSolveSetsEqual(remoteSolves, mergedSolves);

        if (cancelled) return;

        solvesRef.current = mergedSolves;
        setSolves(mergedSolves);
        saveAccountCachedSolves(accountId, mergedSolves);

        if (needsSync) {
          await syncRemoteSolves(mergedSolves);
        }

        clearGuestSolves();

        if (cancelled) return;

        setStorageMode("cloud");
        setLastSyncError(undefined);
      } catch (error) {
        if (cancelled) return;

        solvesRef.current = optimisticSolves;
        setSolves(optimisticSolves);
        setStorageMode("sync-error");
        setLastSyncError(getErrorMessage(error));
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadSolves();

    return () => {
      cancelled = true;
    };
  }, [accountId, authLoading, isAuthConfigured, isStorageConfigured]);

  const addSolve = useCallback(
    async (solve: Solve) => {
      const nextSolves = [stampSolve(solve), ...solvesRef.current];
      await replaceSolves(nextSolves);
    },
    [replaceSolves]
  );

  const deleteSolve = useCallback(
    async (solveId: string) => {
      const nextSolves = solvesRef.current.filter((solve) => solve.id !== solveId);
      await replaceSolves(nextSolves);
    },
    [replaceSolves]
  );

  const setPenalty = useCallback(
    async (solveId: string, penalty: "+2" | "DNF" | undefined) => {
      const nextSolves = solvesRef.current.map((solve) =>
        solve.id === solveId ? stampSolve({ ...solve, penalty }) : solve
      );
      await replaceSolves(nextSolves);
    },
    [replaceSolves]
  );

  const clearSolves = useCallback(async () => {
    await replaceSolves([]);
  }, [replaceSolves]);

  const retrySync = useCallback(async () => {
    if (!accountId || !isStorageConfigured) return;
    setStorageMode("syncing");
    try {
      await syncRemoteSolves(solvesRef.current);
      saveAccountCachedSolves(accountId, solvesRef.current);
      clearGuestSolves();
      setStorageMode("cloud");
      setLastSyncError(undefined);
    } catch (error) {
      const description = getErrorMessage(error);
      setStorageMode("sync-error");
      setLastSyncError(description);
      throw new Error(description);
    }
  }, [accountId, isStorageConfigured]);

  return useMemo(
    () => ({
      solves,
      isLoading,
      storageMode,
      lastSyncError,
      addSolve,
      deleteSolve,
      setPenalty,
      clearSolves,
      retrySync,
      isCloudEnabled: isAuthConfigured && isStorageConfigured,
      isSignedIn: Boolean(accountId),
    }),
    [
      accountId,
      addSolve,
      clearSolves,
      deleteSolve,
      isAuthConfigured,
      isLoading,
      isStorageConfigured,
      lastSyncError,
      retrySync,
      setPenalty,
      solves,
      storageMode,
    ]
  );
}
