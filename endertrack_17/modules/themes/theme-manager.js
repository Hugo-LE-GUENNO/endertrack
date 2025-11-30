// modules/themes/theme-manager.js - Gestionnaire de thèmes et profils utilisateur

class ThemeManager {
  constructor() {
    this.currentProfile = 'expert';
    this.currentVisualTheme = 'dark';
    this.currentLanguage = 'fr';
    this.isInitialized = false;
    
    // Profils intégrés (pas de fetch)
    this.profiles = {
      expert: {
        name: "Expert",
        terminology: {
          controllerModes: { step: "Discret", continuous: "Continu" }
        }
      },
      scientific: {
        name: "Scientifique", 
        terminology: {
          controllerModes: { step: "Discret", continuous: "Continu" }
        }
      },
      public: {
        name: "Grand Public",
        terminology: {
          controllerModes: { step: "Étape", continuous: "Fluide" }
        }
      }
    };
    
    // Langues disponibles
    this.languages = {
      fr: { name: "Français", code: "fr" },
      en: { name: "English", code: "en" },
      de: { name: "Deutsch", code: "de" },
      es: { name: "Español", code: "es" }
    };
  }

  async init() {
    this.loadUserPreferences();
    this.applyCurrentTheme();
    this.isInitialized = true;
    return true;
  }

  loadUserPreferences() {
    try {
      const saved = localStorage.getItem('endertrack-theme-preferences');
      if (saved) {
        const prefs = JSON.parse(saved);
        this.currentProfile = prefs.profile || 'expert';
        this.currentVisualTheme = prefs.visualTheme || 'dark';
        this.currentLanguage = prefs.language || 'fr';
      }
    } catch (error) {
      console.warn('Impossible de charger les préférences:', error);
    }
  }

  saveUserPreferences() {
    try {
      const prefs = {
        profile: this.currentProfile,
        visualTheme: this.currentVisualTheme,
        language: this.currentLanguage
      };
      localStorage.setItem('endertrack-theme-preferences', JSON.stringify(prefs));
    } catch (error) {
      console.warn('Impossible de sauvegarder les préférences:', error);
    }
  }

  applyCurrentTheme() {
    this.applyProfileTerminology();
    
    if (window.EnderTrack?.Events) {
      window.EnderTrack.Events.emit('theme:changed', {
        profile: this.currentProfile,
        visualTheme: this.currentVisualTheme,
        language: this.currentLanguage
      });
    }
  }

  applyProfileTerminology() {
    const profile = this.profiles[this.currentProfile];
    if (!profile) return;

    const stepBtn = document.getElementById('stepModeBtn');
    const continuousBtn = document.getElementById('continuousModeBtn');
    
    if (stepBtn) {
      stepBtn.textContent = profile.terminology.controllerModes.step;
    }
    if (continuousBtn) {
      continuousBtn.textContent = profile.terminology.controllerModes.continuous;
    }
  }

  async setProfile(profileName) {
    if (this.profiles[profileName]) {
      this.currentProfile = profileName;
      this.applyCurrentTheme();
      this.saveUserPreferences();
      return true;
    }
    return false;
  }

  async setVisualTheme(themeName) {
    this.currentVisualTheme = themeName;
    this.saveUserPreferences();
    return true;
  }

  async setLanguage(languageCode) {
    if (this.languages[languageCode]) {
      this.currentLanguage = languageCode;
      this.applyCurrentTheme();
      this.saveUserPreferences();
      return true;
    }
    return false;
  }

  getCurrentProfile() {
    return this.profiles[this.currentProfile];
  }

  getCurrentTheme() {
    return this.currentVisualTheme;
  }

  getStatus() {
    return {
      initialized: this.isInitialized,
      currentProfile: this.currentProfile,
      currentVisualTheme: this.currentVisualTheme,
      availableProfiles: Object.keys(this.profiles)
    };
  }
}

// Initialisation globale
window.EnderTrack = window.EnderTrack || {};
window.EnderTrack.ThemeManager = new ThemeManager();