import { ref, watchEffect, onMounted } from 'vue';

export type ThemeMode = 'light' | 'dark' | 'auto';

const themeMode = ref<ThemeMode>('auto');

export const useTheme = () => {
  const setTheme = (mode: ThemeMode) => {
    themeMode.value = mode;
    if (import.meta.client) {
      localStorage.setItem('ls_theme_mode', mode);
      applyTheme();
    }
  };

  const applyTheme = () => {
    if (!import.meta.client) return;

    let actualTheme: 'light' | 'dark';
    if (themeMode.value === 'auto') {
      actualTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } else {
      actualTheme = themeMode.value;
    }

    const html = document.documentElement;
    html.classList.remove('light-theme', 'dark-theme');
    html.classList.add(`${actualTheme}-theme`);
    
    // Also update meta theme color for PWA
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', actualTheme === 'dark' ? '#0f1115' : '#f8fafc');
    }
  };

  const toggleTheme = () => {
    const modes: ThemeMode[] = ['light', 'dark', 'auto'];
    const currentIndex = modes.indexOf(themeMode.value);
    const nextIndex = (currentIndex + 1) % modes.length;
    const nextMode = modes[nextIndex];
    if (nextMode) setTheme(nextMode);
  };

  // Initialization
  if (import.meta.client) {
    const savedMode = localStorage.getItem('ls_theme_mode') as ThemeMode;
    if (savedMode) {
      themeMode.value = savedMode;
    }

    // Listen for system changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (themeMode.value === 'auto') applyTheme();
    });

    onMounted(() => {
      applyTheme();
    });
  }

  return {
    themeMode,
    setTheme,
    toggleTheme,
    applyTheme
  };
};
