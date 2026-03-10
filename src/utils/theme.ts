const THEME_STORAGE_KEY = 'isDarkMode';

export const getThemePreference = (): boolean => {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  if (savedTheme !== null) {
    return savedTheme === 'true';
  }

  // If no preference is saved, check system preference
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  return false;
};

export const setThemePreference = (isDarkMode: boolean): void => {
  localStorage.setItem(THEME_STORAGE_KEY, String(isDarkMode));
};
