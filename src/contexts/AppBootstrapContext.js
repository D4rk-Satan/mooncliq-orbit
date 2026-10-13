"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useSyncExternalStore } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';

const AppBootstrapContext = createContext(null);

const CACHE_KEY = 'mooncliq_bootstrap_cache';
const COOKIE_KEY = 'mooncliq_bootstrap_ssr';

const defaultUserInfo = {
  orgName: "...",
  email: "",
  nickname: "User",
  role: "Member",
  avatarUrl: null,
  canAccessSettings: false,
  activeModules: ["Lead", "Deal", "Account", "Task", "Products"],
  profile: null
};

// 1. External store listeners
let listeners = [];
function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

let serverBootstrapData = null;

function getSnapshot() {
  if (typeof window === 'undefined') {
    return JSON.stringify(serverBootstrapData || { userInfo: defaultUserInfo, customModules: [], isLoaded: false });
  }
  return localStorage.getItem(CACHE_KEY) || JSON.stringify(serverBootstrapData || { userInfo: defaultUserInfo, customModules: [], isLoaded: false });
}

function getServerSnapshot() {
  return JSON.stringify(serverBootstrapData || { userInfo: defaultUserInfo, customModules: [], isLoaded: false });
}

function subscribe(listener) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter(l => l !== listener);
  };
}

export function AppBootstrapProvider({ children, initialData = null }) {
  if (initialData && !serverBootstrapData) {
    serverBootstrapData = initialData;
  }

  // useSyncExternalStore guarantees 0ms synchronous hydration
  const rawCache = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  
  const parsed = React.useMemo(() => {
    try {
      const data = JSON.parse(rawCache);
      return {
        userInfo: data.userInfo || defaultUserInfo,
        customModules: data.customModules || [],
        isLoaded: data.isLoaded ?? false
      };
    } catch {
      return {
        userInfo: defaultUserInfo,
        customModules: [],
        isLoaded: false
      };
    }
  }, [rawCache]);

  const [isLoading, setIsLoading] = useState(false);

  // Background silent revalidation from /api/bootstrap
  const refreshBootstrap = useCallback(async () => {
    try {
      setIsLoading(true);
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString() || session.tokens?.accessToken?.toString();

      if (!token) {
        setIsLoading(false);
        return;
      }

      const res = await fetch('/api/bootstrap', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store'
      });

      if (res.ok) {
        const bootstrap = await res.json();
        const user = bootstrap.user;

        const formattedUserInfo = {
          orgName: user.organization?.name || "",
          email: user.email || "",
          nickname: user.profile?.nickname || user.name || "User",
          role: user.profile?.role || "Member",
          avatarUrl: user.profile?.avatarUrl || null,
          canAccessSettings: user.profile?.canAccessSettings || false,
          activeModules: user.organization?.activeModules || [],
          profile: user.profile || null
        };

        const freshData = {
          userInfo: formattedUserInfo,
          customModules: bootstrap.customModules || [],
          isLoaded: true
        };

        try {
          // 1. Update localStorage cache
          localStorage.setItem(CACHE_KEY, JSON.stringify(freshData));
          
          // 2. Update cookie for Next.js Server (so Ctrl+Shift+R renders instantly on server)
          // Keep lightweight for cookie size limit
          const ssrPayload = {
            userInfo: {
              canAccessSettings: formattedUserInfo.canAccessSettings,
              activeModules: formattedUserInfo.activeModules,
              profile: formattedUserInfo.profile ? {
                canAccessSettings: formattedUserInfo.profile.canAccessSettings,
                permissions: formattedUserInfo.profile.permissions
              } : null
            },
            customModules: (bootstrap.customModules || []).map(m => ({ id: m.id, name: m.name, icon: m.icon, isActive: m.isActive })),
            isLoaded: true
          };
          document.cookie = `${COOKIE_KEY}=${encodeURIComponent(JSON.stringify(ssrPayload))}; path=/; max-age=604800; SameSite=Lax`;

          emitChange(); // Instantly notifies useSyncExternalStore
        } catch (storageErr) {
          console.warn("Failed to cache bootstrap data", storageErr);
        }
      }
    } catch (err) {
      console.error("Bootstrap refresh failed:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshBootstrap();
  }, [refreshBootstrap]);

  return (
    <AppBootstrapContext.Provider value={{
      userInfo: parsed.userInfo,
      customModules: parsed.customModules,
      isLoaded: parsed.isLoaded,
      isLoading,
      refreshBootstrap
    }}>
      {children}
    </AppBootstrapContext.Provider>
  );
}

export function useBootstrap() {
  const context = useContext(AppBootstrapContext);
  if (!context) {
    return {
      userInfo: defaultUserInfo,
      customModules: [],
      isLoaded: false,
      isLoading: false,
      refreshBootstrap: () => {}
    };
  }
  return context;
}
