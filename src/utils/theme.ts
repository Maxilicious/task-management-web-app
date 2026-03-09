const THEME_STORAGE_KEY = 'isDarkMode';

export const getThemePreference = (): boolean => {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  return savedTheme === 'true';
};

export const setThemePreference = (isDarkMode: boolean): void => {
  localStorage.setItem(THEME_STORAGE_KEY, String(isDarkMode));
};
