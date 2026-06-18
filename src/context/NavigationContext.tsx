// /src/context/NavigationContext.tsx
// ─────────────────────────────────────────────────────────────��───────────────
// Simple navigation context for switching top-level views in the app.
// Currently supports: 'dashboard' and 'import'.
// ─────────────────────────────────────────────────────────────────────────────

import { createContext, useContext, useState, type ReactNode } from 'react';

export type AppView = 'dashboard' | 'import' | 'projections' | 'collections' | 'set-projections' | 'variances';

interface NavigationContextValue {
  activeView: AppView;
  navigate: (view: AppView) => void;
}

const NavigationContext = createContext<NavigationContextValue | null>(null);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [activeView, setActiveView] = useState<AppView>('dashboard');
  return (
    <NavigationContext.Provider value={{ activeView, navigate: setActiveView }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation(): NavigationContextValue {
  const ctx = useContext(NavigationContext);
  if (!ctx) {
    throw new Error(
      'useNavigation() was called outside of <NavigationProvider>. ' +
      'Wrap your root component (App.tsx) with <NavigationProvider>.'
    );
  }
  return ctx;
}