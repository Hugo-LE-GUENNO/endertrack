// EnderTrack - Theme Manager
// Gestionnaire de thèmes centralisé

class ThemeManager {
  constructor() {
    this.currentTheme = 'dark'; // Thème par défaut
    this.availableThemes = ['dark', 'light'];
    this.storageKey = 'endertrack-theme';
  }

  init() {
    console.log('🎨 Initializing Theme Manager...');
    
    // Charger le thème sauvegardé
    this.loadSavedTheme();
    
    // Appliquer le thème initial
    this.applyTheme(this.currentTheme);
    
    console.log(`✅ Theme Manager initialized - Current theme: ${this.currentTheme}`);
    return true;
  }

  loadSavedTheme() {
    try {
      const savedTheme = localStorage.getItem(this.storageKey);
      if (savedTheme && this.availableThemes.includes(savedTheme)) {
        this.currentTheme = savedTheme;
      }
    } catch (error) {
      console.warn('Could not load saved theme:', error);
    }
  }

  saveTheme(theme) {
    try {
      localStorage.setItem(this.storageKey, theme);
    } catch (error) {
      console.warn('Could not save theme:', error);
    }
  }

  applyTheme(theme) {
    if (!this.availableThemes.includes(theme)) {
      console.warn(`Theme "${theme}" not available`);
      return false;
    }

    // Appliquer l'attribut data-theme au document
    document.documentElement.setAttribute('data-theme', theme);
    
    // Mettre à jour le thème actuel
    this.currentTheme = theme;
    
    // Sauvegarder le thème
    this.saveTheme(theme);
    
    // Émettre un événement de changement de thème
    this.emitThemeChange(theme);
    
    console.log(`🎨 Theme applied: ${theme}`);
    return true;
  }

  switchTheme(theme) {
    return this.applyTheme(theme);
  }

  toggleTheme() {
    const nextTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    return this.switchTheme(nextTheme);
  }

  getCurrentTheme() {
    return this.currentTheme;
  }

  getAvailableThemes() {
    return [...this.availableThemes];
  }

  emitThemeChange(theme) {
    // Émettre un événement personnalisé
    const event = new CustomEvent('theme-changed', {
      detail: { theme, previousTheme: this.currentTheme }
    });
    document.dispatchEvent(event);

    // Émettre via le système d'événements EnderTrack si disponible
    if (window.EnderTrack?.Events?.emit) {
      window.EnderTrack.Events.emit('theme:changed', {
        theme,
        previousTheme: this.currentTheme
      });
    }
  }

  // Méthodes utilitaires
  isDarkTheme() {
    return this.currentTheme === 'dark';
  }

  isLightTheme() {
    return this.currentTheme === 'light';
  }

  // Méthode pour obtenir les variables CSS du thème actuel
  getThemeVariables() {
    const computedStyle = getComputedStyle(document.documentElement);
    const variables = {};
    
    // Liste des variables CSS à extraire
    const cssVars = [
      '--primary', '--success', '--warning', '--danger', '--info',
      '--background', '--panel', '--panel-dark', '--panel-light',
      '--text', '--text-muted', '--text-light',
      '--border', '--border-light', '--button-bg', '--button-hover'
    ];
    
    cssVars.forEach(varName => {
      variables[varName] = computedStyle.getPropertyValue(varName).trim();
    });
    
    return variables;
  }
}

// Instance globale
window.EnderTrackThemeManager = new ThemeManager();

// Export pour utilisation en module
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ThemeManager;
}