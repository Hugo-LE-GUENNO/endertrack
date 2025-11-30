// modules/ui/ui.js - Main UI module coordinator
// Coordinates all UI components and provides unified interface

class UIManager {
  constructor() {
    this.initialized = false;
    this.components = new Map();
  }

  async init() {
    if (this.initialized) return;

    console.log('🎨 Initializing UI Manager...');

    try {
      // Initialize all UI components
      await this.initializeComponents();
      
      // Setup global UI event handlers
      this.setupGlobalHandlers();
      
      this.initialized = true;
      console.log('✅ UI Manager initialized');
      
      return true;
    } catch (error) {
      console.error('❌ UI Manager initialization failed:', error);
      throw error;
    }
  }

  async initializeComponents() {
    // Initialize notifications first (needed by other components)
    if (window.EnderTrack.Notifications) {
      await window.EnderTrack.Notifications.init();
      this.components.set('notifications', window.EnderTrack.Notifications);
    }

    // Initialize other UI components
    const componentInits = [
      { name: 'tabs', component: window.EnderTrack.Tabs },
      { name: 'panels', component: window.EnderTrack.Panels },
      { name: 'modals', component: window.EnderTrack.Modals },
      { name: 'controls', component: window.EnderTrack.Controls }
    ];

    for (const { name, component } of componentInits) {
      if (component && typeof component.init === 'function') {
        try {
          await component.init();
          this.components.set(name, component);
        } catch (error) {
          console.warn(`Failed to initialize ${name}:`, error);
        }
      }
    }
  }

  setupGlobalHandlers() {
    // Global keyboard shortcuts
    document.addEventListener('keydown', this.handleGlobalKeydown.bind(this));
    
    // Global click handlers for dynamic content
    document.addEventListener('click', this.handleGlobalClick.bind(this));
    
    // Window resize handler
    window.addEventListener('resize', this.handleResize.bind(this));
  }

  handleGlobalKeydown(event) {
    // F1 - Help
    if (event.key === 'F1') {
      event.preventDefault();
      this.showHelp();
      return;
    }

    // Escape - Close modals/cancel operations
    if (event.key === 'Escape') {
      if (this.components.has('modals')) {
        this.components.get('modals').closeAll();
      }
      return;
    }

    // Ctrl+S - Save
    if (event.ctrlKey && event.key === 's') {
      event.preventDefault();
      if (window.EnderTrack.State) {
        window.EnderTrack.State.save();
        this.showNotification('État sauvegardé', 'success');
      }
      return;
    }
  }

  handleGlobalClick(event) {
    // Handle clicks on elements with data-action attributes
    const actionElement = event.target.closest('[data-action]');
    if (actionElement) {
      const action = actionElement.dataset.action;
      this.handleAction(action, actionElement, event);
    }
  }

  handleAction(action, element, event) {
    switch (action) {
      case 'close-modal':
        if (this.components.has('modals')) {
          this.components.get('modals').close(element.dataset.modalId);
        }
        break;
      case 'close-notification':
        if (this.components.has('notifications')) {
          this.components.get('notifications').close(element.dataset.notificationId);
        }
        break;
      default:
        console.log('Unknown action:', action);
    }
  }

  handleResize() {
    // Notify components of resize
    this.components.forEach(component => {
      if (typeof component.onResize === 'function') {
        component.onResize();
      }
    });

    // Emit resize event
    if (window.EnderTrack.Events) {
      window.EnderTrack.Events.emit('ui:resize', {
        width: window.innerWidth,
        height: window.innerHeight
      });
    }
  }

  // Unified notification interface
  showNotification(message, type = 'info', duration = 3000) {
    if (this.components.has('notifications')) {
      return this.components.get('notifications').show(message, type, duration);
    } else {
      // Fallback to console
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
  }

  showError(message, duration = 5000) {
    return this.showNotification(message, 'error', duration);
  }

  showSuccess(message, duration = 3000) {
    return this.showNotification(message, 'success', duration);
  }

  showWarning(message, duration = 4000) {
    return this.showNotification(message, 'warning', duration);
  }

  // Modal interface
  showModal(options) {
    if (this.components.has('modals')) {
      return this.components.get('modals').show(options);
    }
    return null;
  }

  closeModal(id) {
    if (this.components.has('modals')) {
      this.components.get('modals').close(id);
    }
  }

  // Tab interface
  switchTab(tabName) {
    if (this.components.has('tabs')) {
      this.components.get('tabs').switchTo(tabName);
    }
  }

  addTab(tabConfig) {
    if (this.components.has('tabs')) {
      return this.components.get('tabs').add(tabConfig);
    }
    return null;
  }

  // Help system
  showHelp() {
    const helpContent = `
      <div class="help-content">
        <h3>🎮 Raccourcis Clavier</h3>
        <div class="help-section">
          <h4>Navigation</h4>
          <ul>
            <li><kbd>↑↓←→</kbd> - Mouvement directionnel</li>
            <li><kbd>WASD</kbd> - Mouvement alternatif</li>
            <li><kbd>Page Up/Down</kbd> - Mouvement Z</li>
            <li><kbd>Q/E</kbd> - Mouvement Z alternatif</li>
          </ul>
        </div>
        <div class="help-section">
          <h4>Modes</h4>
          <ul>
            <li><kbd>Tab</kbd> - Basculer relatif/absolu</li>
            <li><kbd>Home</kbd> - Retour origine XY</li>
            <li><kbd>Ctrl+Home</kbd> - Retour origine XYZ</li>
          </ul>
        </div>
        <div class="help-section">
          <h4>Système</h4>
          <ul>
            <li><kbd>Escape</kbd> - Arrêt d'urgence</li>
            <li><kbd>F1</kbd> - Cette aide</li>
            <li><kbd>Ctrl+S</kbd> - Sauvegarder</li>
          </ul>
        </div>
      </div>
    `;

    this.showModal({
      title: '📖 Aide EnderTrack',
      content: helpContent,
      size: 'medium'
    });
  }

  // Component access
  getComponent(name) {
    return this.components.get(name);
  }

  hasComponent(name) {
    return this.components.has(name);
  }

  // Status
  getStatus() {
    return {
      initialized: this.initialized,
      components: Array.from(this.components.keys()),
      componentCount: this.components.size
    };
  }
}

// Create and register global instance
const uiManager = new UIManager();

window.EnderTrack = window.EnderTrack || {};
window.EnderTrack.UI = uiManager;