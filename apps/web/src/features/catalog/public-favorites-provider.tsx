"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { accountRequest, AccountRequestError, type PublicUser } from "./public-account";

const FAVORITES_KEY = "bkk-favorites";
const OWNER_KEY = "bkk-favorites-owner";

function cachedFavorites(): number[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
    return Array.isArray(stored)
      ? [...new Set(stored.filter((id): id is number => Number.isInteger(id) && id > 0))].slice(0, 200)
      : [];
  } catch { return []; }
}

type FavoritesContextValue = {
  favorites: number[];
  favoritesReady: boolean;
  publicUser: PublicUser | null;
  accountChecked: boolean;
  refreshAccount: () => Promise<void>;
  toggleFavorite: (id: number) => Promise<void>;
};

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function PublicFavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<number[]>([]);
  const [favoritesReady, setFavoritesReady] = useState(false);
  const [publicUser, setPublicUser] = useState<PublicUser | null>(null);
  const [accountChecked, setAccountChecked] = useState(false);
  const currentFavorites = useRef<number[]>([]);
  const started = useRef(false);

  const updateFavorites = useCallback((ids: number[], owner?: number) => {
    currentFavorites.current = ids;
    setFavorites(ids);
    setFavoritesReady(true);
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
      if (owner) localStorage.setItem(OWNER_KEY, String(owner));
      else localStorage.removeItem(OWNER_KEY);
    } catch { /* Private browsing can block storage. */ }
  }, []);

  const refreshAccount = useCallback(async () => {
    let user: PublicUser;
    try {
      user = await accountRequest<PublicUser>("me");
    } catch (error) {
      if (!(error instanceof AccountRequestError) || error.status !== 401) return;
      setPublicUser(null);
      setAccountChecked(true);
      try {
        if (localStorage.getItem(OWNER_KEY)) {
          currentFavorites.current = [];
          setFavorites([]);
          setFavoritesReady(true);
        } else {
          setFavoritesReady(true);
        }
      } catch { setFavoritesReady(true); }
      return;
    }
    setPublicUser(user);
    setAccountChecked(true);
    try {
      const owner = localStorage.getItem(OWNER_KEY);
      const local = !owner || owner === String(user.id) ? cachedFavorites() : [];
      const synced = local.length
        ? await accountRequest<number[]>("favorites/sync", { ids: local })
        : await accountRequest<number[]>("favorites");
      updateFavorites(synced, user.id);
    } catch {
      // Keep the verified account and its cached count if syncing is temporarily unavailable.
      try {
        if (localStorage.getItem(OWNER_KEY) === String(user.id)) updateFavorites(cachedFavorites(), user.id);
      } catch { setFavoritesReady(true); }
    }
  }, [updateFavorites]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    try {
      if (!localStorage.getItem(OWNER_KEY)) {
        currentFavorites.current = cachedFavorites();
        setFavorites(currentFavorites.current);
        setFavoritesReady(true);
      }
    } catch { setFavoritesReady(true); }
    void refreshAccount();
  }, [refreshAccount]);

  const toggleFavorite = useCallback(async (id: number) => {
    const next = currentFavorites.current.includes(id)
      ? currentFavorites.current.filter(value => value !== id)
      : [...currentFavorites.current, id];
    updateFavorites(next, publicUser?.id);
    if (publicUser) {
      try {
        const synced = await accountRequest<number[]>(`favorites/${id}`, { favorite: next.includes(id) });
        updateFavorites(synced, publicUser.id);
      } catch (error) {
        await refreshAccount();
        throw error;
      }
    }
  }, [publicUser, refreshAccount, updateFavorites]);

  return <FavoritesContext.Provider value={{ favorites, favoritesReady, publicUser, accountChecked, refreshAccount, toggleFavorite }}>{children}</FavoritesContext.Provider>;
}

export function usePublicFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) throw new Error("PublicFavoritesProvider belum terpasang.");
  return context;
}
