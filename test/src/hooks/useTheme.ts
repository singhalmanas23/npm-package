// Unused export
export const themeColors = {
  primary: '#3B82F6',
  secondary: '#6B7280'
};

// Unused export
export const getThemeSpacing = (size: 'sm' | 'md' | 'lg') => {
  switch (size) {
    case 'sm': return '0.5rem';
    case 'md': return '1rem';
    case 'lg': return '1.5rem';
  }
};

export const useTheme = () => {
  return {
    colors: themeColors,
    spacing: getThemeSpacing
  };
}; 