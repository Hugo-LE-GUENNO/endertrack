// modules/ui/theme-settings.js - Interface pour les paramètres de thèmes

// Fonctions pour l'interface des paramètres
function changeUserProfile() {
  const selector = document.getElementById('profileSelector');
  const profileName = selector.value;
  
  if (window.EnderTrack?.ThemeManager) {
    window.EnderTrack.ThemeManager.setProfile(profileName);
    updateProfileDescription(profileName);
  }
}

function changeVisualTheme() {
  const selector = document.getElementById('themeSelector');
  const themeName = selector.value;
  
  if (window.EnderTrack?.ThemeManager) {
    window.EnderTrack.ThemeManager.setVisualTheme(themeName);
  }
}

function changeLanguage() {
  const selector = document.getElementById('languageSelector');
  const languageCode = selector.value;
  
  if (window.EnderTrack?.ThemeManager) {
    window.EnderTrack.ThemeManager.setLanguage(languageCode);
  }
}

function updateProfileDescription(profileName) {
  const descriptions = {
    expert: "Mode expert avec terminologie scientifique et paramètres avancés",
    scientific: "Mode scientifique avec terminologie technique et précision",
    public: "Interface simplifiée avec terminologie accessible"
  };
  
  const descElement = document.getElementById('profileDescription');
  if (descElement && descriptions[profileName]) {
    descElement.innerHTML = `<small>${descriptions[profileName]}</small>`;
  }
}

// Initialiser les sélecteurs avec les valeurs actuelles
function initThemeSettings() {
  if (!window.EnderTrack?.ThemeManager?.isInitialized) {
    setTimeout(initThemeSettings, 100);
    return;
  }
  
  const themeManager = window.EnderTrack.ThemeManager;
  const status = themeManager.getStatus();
  
  // Mettre à jour les sélecteurs
  const profileSelector = document.getElementById('profileSelector');
  const themeSelector = document.getElementById('themeSelector');
  const languageSelector = document.getElementById('languageSelector');
  
  if (profileSelector) {
    profileSelector.value = status.currentProfile;
    updateProfileDescription(status.currentProfile);
  }
  
  if (themeSelector) {
    themeSelector.value = status.currentVisualTheme;
  }
  
  if (languageSelector) {
    languageSelector.value = themeManager.currentLanguage;
  }
}

// Écouter les changements de thème
if (window.EnderTrack?.Events) {
  window.EnderTrack.Events.on('theme:changed', (data) => {
    console.log('🎨 Thème changé:', data);
    
    // Mettre à jour l'interface si nécessaire
    const profileSelector = document.getElementById('profileSelector');
    const themeSelector = document.getElementById('themeSelector');
    
    if (profileSelector && profileSelector.value !== data.profile) {
      profileSelector.value = data.profile;
      updateProfileDescription(data.profile);
    }
    
    if (themeSelector && themeSelector.value !== data.visualTheme) {
      themeSelector.value = data.visualTheme;
    }
  });
}

// Initialiser quand le DOM est prêt
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(initThemeSettings, 200);
});

// Fonctions globales pour l'HTML
window.changeUserProfile = changeUserProfile;
window.changeVisualTheme = changeVisualTheme;
window.changeLanguage = changeLanguage;