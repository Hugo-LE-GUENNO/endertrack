// modules/ui/theme.js - Theme management
// Wrapper pour le nouveau système de thèmes

class ThemeManagerWrapper {
  constructor() {
    this.manager = null;
    this.initialized = false;
  }

  init() {
    console.log('🎨 Initializing Theme Manager Wrapper...');
    
    // Utiliser le ThemeManager global
    this.manager = window.EnderTrack?.ThemeManager;
    
    if (this.manager) {
      const result = this.manager.init();
      this.setupThemeSelector();
      this.initialized = true;
      return result;
    } else {
      console.error('ThemeManager not found! Make sure theme-manager.js is loaded.');
      return false;
    }
  }

  setupThemeSelector() {
    const themeSelector = document.getElementById('themeSelector');
    
    if (themeSelector) {
      // Set initial value
      themeSelector.value = this.getCurrentTheme();
      
      // Handle theme changes
      themeSelector.addEventListener('change', (e) => {
        const newTheme = e.target.value;
        this.changeTheme(newTheme);
      });
    }
  }

  changeTheme(theme) {
    if (this.manager?.setVisualTheme) {
      this.manager.setVisualTheme(theme);
      
      // Show notification
      const themeName = theme === 'dark' ? 'Sombre' : 'Clair';
      EnderTrack.UI?.showNotification?.(`Thème ${themeName} activé`, 'info');
      
      return true;
    }
    return false;
  }

  // Proxy methods to the global theme manager
  switchTheme(theme) {
    return this.changeTheme(theme);
  }

  toggleTheme() {
    const current = this.getCurrentTheme();
    const newTheme = current === 'dark' ? 'light' : 'dark';
    return this.changeTheme(newTheme);
  }

  getCurrentTheme() {
    return this.manager?.getCurrentTheme() || 'dark';
  }

  getAvailableThemes() {
    return ['dark', 'light'];
  }

  isDarkTheme() {
    return this.getCurrentTheme() === 'dark';
  }

  isLightTheme() {
    return this.getCurrentTheme() === 'light';
  }
}

// Global instance
window.EnderTrack = window.EnderTrack || {};
window.EnderTrack.Theme = new ThemeManagerWrapper();