import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance } from 'react-native';
import { getSyncMeta, setSyncMeta } from '../database/sync_queue';

type ThemeValue = { dark: boolean; setDark: (dark: boolean) => Promise<void> };
const ThemeContext = createContext<ThemeValue>({ dark: false, setDark: async () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [dark, setDarkState] = useState(false);
  useEffect(() => {
    let active = true;
    void getSyncMeta('theme_mode').then(mode => {
      if (!active) return;
      const enabled = mode === 'dark';
      setDarkState(enabled);
      Appearance.setColorScheme(enabled ? 'dark' : 'light');
    });
    return () => { active = false; };
  }, []);
  const setDark = useCallback(async (enabled: boolean) => {
    setDarkState(enabled);
    Appearance.setColorScheme(enabled ? 'dark' : 'light');
    await setSyncMeta('theme_mode', enabled ? 'dark' : 'light');
  }, []);
  const value = useMemo(() => ({ dark, setDark }), [dark, setDark]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() { return useContext(ThemeContext); }
