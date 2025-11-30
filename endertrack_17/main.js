// main.js - Ultra-minimal bootstrap entry point
// EnderTrack 3D Position Simulator

class EnderTrackBootstrap {
  static async init() {
    try {
      // Initialize theme system first
      if (EnderTrack.ThemeManager && typeof EnderTrack.ThemeManager.init === 'function') {
        await EnderTrack.ThemeManager.init();
      }
      
      // Initialize core systems in order
      await EnderTrack.State.init();
      
      // Check if Canvas is available before initializing
      if (!EnderTrack.Canvas) {
        throw new Error('Canvas module not loaded');
      }
      await EnderTrack.Canvas.init('mapCanvas');
      
      // Initialize canvas interactions
      const canvas = document.getElementById('mapCanvas');
      if (canvas && EnderTrack.CanvasInteractions) {
        await EnderTrack.CanvasInteractions.init(canvas);
      }
      
      await EnderTrack.UI.init();
      
      // Initialize other core systems
      if (EnderTrack.Navigation && typeof EnderTrack.Navigation.init === 'function') {
        await EnderTrack.Navigation.init();
      }
      
      if (EnderTrack.KeyboardMode && typeof EnderTrack.KeyboardMode.init === 'function') {
        await EnderTrack.KeyboardMode.init();
      }
      
      if (EnderTrack.Theme && typeof EnderTrack.Theme.init === 'function') {
        await EnderTrack.Theme.init();
      }
      
      // Initialize Lists module
      if (EnderTrack.Lists && typeof EnderTrack.Lists.init === 'function') {
        await EnderTrack.Lists.init();
        await EnderTrack.Lists.activate();
      }
      
      // Start application
      EnderTrack.App.start();
      
      // Show welcome message
      EnderTrack.UI.showNotification('EnderTrack prêt ! Mode relatif activé.', 'success');
      
    } catch (error) {
      console.error('❌ EnderTrack initialization failed:', error);
      EnderTrack.UI.showError('Application failed to start: ' + error.message);
    }
  }
}

// Auto-start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', EnderTrackBootstrap.init);
} else {
  EnderTrackBootstrap.init();
}

// Global error handler
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error || event.message || 'Unknown error');
  if (window.EnderTrack && window.EnderTrack.UI) {
    const errorMsg = event.error?.message || event.message || 'Erreur système inconnue';
    EnderTrack.UI.showNotification('Erreur système: ' + errorMsg, 'error');
  }
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  if (window.EnderTrack && window.EnderTrack.UI) {
    EnderTrack.UI.showNotification('Erreur asynchrone: ' + (event.reason?.message || 'Erreur inconnue'), 'error');
  }
  event.preventDefault();
});

// Global functions for HTML onclick handlers
// switchTab is defined in index.html to avoid conflicts
window.setInputMode = (mode) => EnderTrack.Navigation.setInputMode(mode);
window.toggleLock = (axis) => EnderTrack.Navigation.toggleLock(axis);
window.moveDirection = (direction) => EnderTrack.Navigation.moveDirection(direction);
window.goHome = (mode) => EnderTrack.Navigation.goHome(mode);
window.setPreset = (preset) => EnderTrack.Navigation.setPreset(preset);
window.goToAbsolute = () => EnderTrack.Navigation.goToAbsolute();
window.emergencyStop = () => EnderTrack.App.emergencyStop();
window.showPluginSelector = () => EnderTrack.PluginManager.showPluginSelector();
window.toggleVoiceRecording = () => EnderTrack.Voice?.toggle();
window.sendAICommand = () => EnderTrack.AI?.sendCommand();
window.clearHistory = () => EnderTrack.State.clearHistory();
window.saveTrack = () => EnderTrack.State.saveTrack();
window.loadTrack = () => EnderTrack.State.loadTrack();

// External Controller activation
window.activateExternalController = async () => {
  try {
    if (window.ExternalController) {
      await window.ExternalController.init();
      window.ExternalController.activate();
      // Show controller tab
      document.getElementById('controllerTab').style.display = 'block';
      switchTab('controller');
      console.log('External Controller activated');
    }
  } catch (error) {
    console.error('Failed to activate External Controller:', error);
  }
};

// Controller tab functions
window.selectDevice = () => window.ExternalController.selectDevice();
window.refreshDevices = () => window.ExternalController.refreshDevices();
window.openMappingModal = () => window.ExternalController.openMappingModal();
window.closeMappingModal = () => window.ExternalController.closeMappingModal();
window.startMapping = (action) => window.ExternalController.startMapping(action);
window.loadPresetMapping = () => window.ExternalController.loadPresetMapping();
window.saveMappingConfig = () => window.ExternalController.saveMappingConfig();
window.clearMappingConfig = () => window.ExternalController.clearMappingConfig();

// Lists module functions
window.openLists = () => {
  if (window.EnderTrack?.Lists) {
    window.EnderTrack.Lists.activate();
    switchTab('lists');
  }
};



// Other placeholder functions for Autres tab
window.openSequences = () => console.log('Sequences not implemented yet');
window.openDrivers = () => console.log('Drivers not implemented yet');
window.openEnderman = () => console.log('Enderman not implemented yet');

