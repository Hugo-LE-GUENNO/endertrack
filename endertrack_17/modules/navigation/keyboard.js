// modules/navigation/keyboard.js - Keyboard navigation support

class KeyboardNavigation {
  constructor() {
    this.isInitialized = false;
    this.isEnabled = true;
    this.keyStates = new Map();
    this.shortcuts = new Map();
    this.repeatInterval = null;
    this.repeatDelay = 500; // Initial delay before repeat
    this.repeatRate = 100; // Repeat interval
  }

  init() {
    console.log('⌨️ Initializing Keyboard Navigation...');
    
    // Setup default shortcuts
    this.setupDefaultShortcuts();
    
    // Setup event listeners
    this.setupEventListeners();
    
    this.isInitialized = true;
    console.log('✅ Keyboard Navigation initialized');
    
    return true;
  }

  setupDefaultShortcuts() {
    // Movement shortcuts
    this.registerShortcut('ArrowUp', () => this.handleMovement('up'));
    this.registerShortcut('ArrowDown', () => this.handleMovement('down'));
    this.registerShortcut('ArrowLeft', () => this.handleMovement('left'));
    this.registerShortcut('ArrowRight', () => this.handleMovement('right'));
    
    // WASD movement
    this.registerShortcut('KeyW', () => this.handleMovement('up'));
    this.registerShortcut('KeyS', () => this.handleMovement('down'));
    this.registerShortcut('KeyA', () => this.handleMovement('left'));
    this.registerShortcut('KeyD', () => this.handleMovement('right'));
    
    // Z movement
    this.registerShortcut('PageUp', () => this.handleMovement('zUp'));
    this.registerShortcut('PageDown', () => this.handleMovement('zDown'));
    this.registerShortcut('KeyQ', () => this.handleMovement('zUp'));
    this.registerShortcut('KeyE', () => this.handleMovement('zDown'));
    
    // Home shortcuts
    this.registerShortcut('Home', () => this.handleHome('xy'));
    this.registerShortcut('ctrl+Home', () => this.handleHome('xyz'));
    
    // Mode switching
    this.registerShortcut('Tab', () => this.toggleInputMode());
    
    // Speed shortcuts
    this.registerShortcut('Digit1', () => this.setSpeedPreset(1));
    this.registerShortcut('Digit2', () => this.setSpeedPreset(2));
    this.registerShortcut('Digit3', () => this.setSpeedPreset(3));
    this.registerShortcut('Digit4', () => this.setSpeedPreset(4));
    this.registerShortcut('Digit5', () => this.setSpeedPreset(5));
    
    // Sensitivity shortcuts
    this.registerShortcut('shift+Digit1', () => this.setSensitivityPreset('fine'));
    this.registerShortcut('shift+Digit2', () => this.setSensitivityPreset('coarse'));
    
    // Axis-specific preset shortcuts
    this.registerShortcut('shift+KeyZ', () => this.setAxisPreset('z', 'coarse'));
    this.registerShortcut('ctrl+KeyZ', () => this.setAxisPreset('z', 'fine'));
    
    // Lock shortcuts
    this.registerShortcut('KeyX', () => this.toggleAxisLock('X'));
    this.registerShortcut('KeyY', () => this.toggleAxisLock('Y'));
    this.registerShortcut('KeyZ', () => this.toggleAxisLock('Z'));
    this.registerShortcut('KeyC', () => this.toggleXYCoupling());
    
    // Emergency stop
    this.registerShortcut('Escape', () => this.emergencyStop());
    this.registerShortcut('Space', () => this.emergencyStop());
    
    // Pan shortcuts
    this.registerShortcut('ctrl+ArrowUp', () => this.handlePan(0, 20));
    this.registerShortcut('ctrl+ArrowDown', () => this.handlePan(0, -20));
    this.registerShortcut('ctrl+ArrowLeft', () => this.handlePan(20, 0));
    this.registerShortcut('ctrl+ArrowRight', () => this.handlePan(-20, 0));
    
    // Zoom shortcuts
    this.registerShortcut('ctrl+NumpadAdd', () => this.handleZoom('in'));
    this.registerShortcut('ctrl+NumpadSubtract', () => this.handleZoom('out'));
    this.registerShortcut('ctrl+Numpad0', () => this.handleZoom('reset'));
    
    // UI shortcuts
    this.registerShortcut('F1', () => this.showHelp());
    this.registerShortcut('F11', () => this.toggleFullscreen());
    this.registerShortcut('ctrl+KeyS', () => this.saveState());
    this.registerShortcut('ctrl+KeyO', () => this.loadState());
  }

  setupEventListeners() {
    // Global keyboard events
    document.addEventListener('keydown', (e) => {
      this.handleKeyDown(e);
    });
    
    document.addEventListener('keyup', (e) => {
      this.handleKeyUp(e);
    });
    
    // Prevent default behavior for navigation keys
    document.addEventListener('keydown', (e) => {
      if (this.shouldPreventDefault(e)) {
        e.preventDefault();
      }
    });
    
    // Handle focus changes
    window.addEventListener('focus', () => {
      this.clearKeyStates();
    });
    
    window.addEventListener('blur', () => {
      this.clearKeyStates();
      this.stopRepeat();
    });
  }

  registerShortcut(keyCombo, handler, options = {}) {
    const {
      description = '',
      category = 'general',
      repeatable = false,
      preventDefault = true
    } = options;

    this.shortcuts.set(keyCombo, {
      handler,
      description,
      category,
      repeatable,
      preventDefault
    });
  }

  unregisterShortcut(keyCombo) {
    return this.shortcuts.delete(keyCombo);
  }

  handleKeyDown(event) {
    console.log('Key pressed:', event.code, event.key, 'Ctrl:', event.ctrlKey);
    
    if (!this.isEnabled) return;
    
    // Skip if typing in input fields
    if (this.isTypingInInput(event.target)) return;
    
    const keyCombo = this.getKeyCombo(event);
    console.log('Key combo:', keyCombo);
    const keyState = this.keyStates.get(event.code);
    
    // Track key state
    this.keyStates.set(event.code, {
      pressed: true,
      timestamp: Date.now(),
      event
    });
    
    // Handle shortcut
    const shortcut = this.shortcuts.get(keyCombo);
    if (shortcut) {
      if (shortcut.preventDefault) {
        event.preventDefault();
      }
      
      // Execute handler
      try {
        shortcut.handler(event);
        
        // Setup repeat if enabled and not already repeating
        if (shortcut.repeatable && !keyState?.pressed) {
          this.setupRepeat(keyCombo, shortcut);
        }
        
      } catch (error) {
        console.error(`Keyboard shortcut error (${keyCombo}):`, error);
      }
      
      // Emit event
      EnderTrack.Events?.emit?.('keyboard:shortcut', {
        keyCombo,
        description: shortcut.description,
        category: shortcut.category
      });
    }
    
    // Emit general key event
    EnderTrack.Events?.emit?.('keyboard:keydown', {
      key: event.key,
      code: event.code,
      keyCombo,
      target: event.target
    });
  }

  handleKeyUp(event) {
    if (!this.isEnabled) return;
    
    const keyCombo = this.getKeyCombo(event);
    
    // Update key state
    this.keyStates.set(event.code, {
      pressed: false,
      timestamp: Date.now(),
      event
    });
    
    // Stop repeat for this key
    if (this.repeatInterval && this.currentRepeatKey === keyCombo) {
      this.stopRepeat();
    }
    
    // Emit event
    EnderTrack.Events?.emit?.('keyboard:keyup', {
      key: event.key,
      code: event.code,
      keyCombo,
      target: event.target
    });
  }

  getKeyCombo(event) {
    const modifiers = [];
    
    if (event.ctrlKey) modifiers.push('ctrl');
    if (event.altKey) modifiers.push('alt');
    if (event.shiftKey) modifiers.push('shift');
    if (event.metaKey) modifiers.push('meta');
    
    const key = event.code;
    
    return modifiers.length > 0 ? `${modifiers.join('+')}+${key}` : key;
  }

  setupRepeat(keyCombo, shortcut) {
    this.stopRepeat(); // Clear any existing repeat
    
    this.currentRepeatKey = keyCombo;
    
    // Initial delay
    setTimeout(() => {
      if (this.currentRepeatKey === keyCombo) {
        // Start repeating
        this.repeatInterval = setInterval(() => {
          if (this.currentRepeatKey === keyCombo) {
            try {
              shortcut.handler();
            } catch (error) {
              console.error(`Keyboard repeat error (${keyCombo}):`, error);
              this.stopRepeat();
            }
          } else {
            this.stopRepeat();
          }
        }, this.repeatRate);
      }
    }, this.repeatDelay);
  }

  stopRepeat() {
    if (this.repeatInterval) {
      clearInterval(this.repeatInterval);
      this.repeatInterval = null;
    }
    this.currentRepeatKey = null;
  }

  clearKeyStates() {
    this.keyStates.clear();
    this.stopRepeat();
  }

  // Movement handlers
  handleMovement(direction) {
    if (!EnderTrack.Navigation) {
      console.warn('Navigation system not available');
      return;
    }
    
    EnderTrack.Navigation.moveDirection(direction);
  }

  handleHome(mode) {
    if (!EnderTrack.Navigation) {
      console.warn('Navigation system not available');
      return;
    }
    
    EnderTrack.Navigation.goHome(mode);
  }

  toggleInputMode() {
    const state = EnderTrack.State?.get?.();
    if (!state) return;
    
    const newMode = state.inputMode === 'relative' ? 'absolute' : 'relative';
    
    if (EnderTrack.Navigation) {
      EnderTrack.Navigation.setInputMode(newMode);
    }
    
    // Show notification
    EnderTrack.UI?.showNotification?.(`Mode: ${newMode}`, 'info');
  }

  setSpeedPreset(level) {
    const speeds = [10, 25, 50, 75, 100];
    const speed = speeds[level - 1] || 50;
    
    if (EnderTrack.Movement) {
      EnderTrack.Movement.setSpeed(speed);
    }
    
    EnderTrack.UI?.showNotification?.(`Vitesse: ${speed}mm/s`, 'info');
  }

  setSensitivityPreset(preset) {
    if (!EnderTrack.Navigation) return;
    
    EnderTrack.Navigation.setPreset(preset);
    EnderTrack.UI?.showNotification?.(`Sensibilité: ${preset}`, 'info');
  }

  setAxisPreset(axis, preset) {
    if (!EnderTrack.Navigation) return;
    
    EnderTrack.Navigation.setAxisPreset(axis, preset);
    EnderTrack.UI?.showNotification?.(`${axis.toUpperCase()}: ${preset}`, 'info');
  }

  toggleAxisLock(axis) {
    if (!EnderTrack.Navigation) return;
    
    EnderTrack.Navigation.toggleLock(axis);
    
    const state = EnderTrack.State?.get?.();
    const isLocked = state?.[`lock${axis}`];
    
    EnderTrack.UI?.showNotification?.(`Axe ${axis}: ${isLocked ? 'verrouillé' : 'déverrouillé'}`, 'info');
  }

  handlePan(deltaX, deltaY) {
    const state = EnderTrack.State?.get?.();
    if (!state) return;
    
    const newPanX = (state.panX || 0) + deltaX;
    const newPanY = (state.panY || 0) + deltaY;
    
    EnderTrack.State?.update?.({
      panX: newPanX,
      panY: newPanY
    });
    
    console.log('Keyboard pan:', deltaX, deltaY);
  }

  handleZoom(action) {
    const state = EnderTrack.State?.get?.();
    if (!state) return;
    
    const currentZoom = state.zoom || 1;
    let newZoom;
    
    switch (action) {
      case 'in':
        newZoom = currentZoom * 1.2;
        break;
      case 'out':
        newZoom = currentZoom / 1.2;
        break;
      case 'reset':
        newZoom = 1;
        break;
      default:
        return;
    }
    
    newZoom = Math.max(0.1, Math.min(50, newZoom));
    
    EnderTrack.State?.update?.({
      zoom: newZoom
    });
    
    console.log('Keyboard zoom:', action, currentZoom, '->', newZoom);
  }

  emergencyStop() {
    EnderTrack.State?.update?.({ isMoving: false });
    console.log('🛑 Emergency stop activated');
  }

  showHelp() {
    alert('Raccourcis: Ctrl+Flèches=Pan, Ctrl+/-=Zoom, Ctrl+0=Reset');
  }

  toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  }

  saveState() {
    EnderTrack.State?.saveState?.();
  }

  loadState() {
    EnderTrack.State?.loadState?.();
  }

  isTypingInInput(target) {
    return target && (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.contentEditable === 'true'
    );
  }

  shouldPreventDefault(event) {
    if (this.isTypingInInput(event.target)) return false;
    
    const preventKeys = [
      'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
      'PageUp', 'PageDown', 'Home', 'Space'
    ];
    
    return preventKeys.includes(event.code) || 
           (event.ctrlKey && ['NumpadAdd', 'NumpadSubtract', 'Numpad0'].includes(event.code));
  }

  toggleXYCoupling() {
    const state = EnderTrack.State?.get?.();
    if (!state) return;
    
    const newCoupling = !state.lockXY;
    
    if (EnderTrack.Navigation) {
      EnderTrack.Navigation.setXYCoupling(newCoupling);
    }
    
    EnderTrack.UI?.showNotification?.(`Couplage XY: ${newCoupling ? 'activé' : 'désactivé'}`, 'info');
  }

  emergencyStop() {
    if (EnderTrack.App) {
      EnderTrack.App.emergencyStop();
    }
  }

  showHelp() {
    const shortcuts = this.getShortcutsByCategory();
    let helpContent = '<div class="keyboard-help">';
    
    Object.entries(shortcuts).forEach(([category, categoryShortcuts]) => {
      helpContent += `<h4>${category.charAt(0).toUpperCase() + category.slice(1)}</h4>`;
      helpContent += '<ul>';
      
      Object.entries(categoryShortcuts).forEach(([keyCombo, shortcut]) => {
        const displayKey = this.formatKeyCombo(keyCombo);
        helpContent += `<li><kbd>${displayKey}</kbd> - ${shortcut.description}</li>`;
      });
      
      helpContent += '</ul>';
    });
    
    helpContent += '</div>';
    
    EnderTrack.UI?.showModal?.({
      title: 'Raccourcis Clavier',
      content: helpContent,
      size: 'large'
    });
  }

  toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  }

  saveState() {
    if (EnderTrack.State) {
      EnderTrack.State.saveState();
      EnderTrack.UI?.showNotification?.('État sauvegardé', 'success');
    }
  }

  loadState() {
    if (EnderTrack.State) {
      EnderTrack.State.loadState();
      EnderTrack.UI?.showNotification?.('État chargé', 'success');
    }
  }

  // Utility methods
  isTypingInInput(element) {
    const inputTypes = ['INPUT', 'TEXTAREA', 'SELECT'];
    return inputTypes.includes(element.tagName) || 
           element.contentEditable === 'true' ||
           element.closest('[contenteditable="true"]');
  }

  shouldPreventDefault(event) {
    if (this.isTypingInInput(event.target)) return false;
    
    const keyCombo = this.getKeyCombo(event);
    const shortcut = this.shortcuts.get(keyCombo);
    
    return shortcut && shortcut.preventDefault;
  }

  formatKeyCombo(keyCombo) {
    return keyCombo
      .replace(/ctrl\+/g, 'Ctrl+')
      .replace(/alt\+/g, 'Alt+')
      .replace(/shift\+/g, 'Shift+')
      .replace(/meta\+/g, 'Cmd+')
      .replace(/Key([A-Z])/g, '$1')
      .replace(/Digit(\d)/g, '$1')
      .replace(/Arrow(\w+)/g, '$1')
      .replace(/Page(\w+)/g, 'Page$1');
  }

  getShortcutsByCategory() {
    const categories = {};
    
    this.shortcuts.forEach((shortcut, keyCombo) => {
      const category = shortcut.category || 'general';
      
      if (!categories[category]) {
        categories[category] = {};
      }
      
      categories[category][keyCombo] = shortcut;
    });
    
    return categories;
  }

  // Configuration
  setEnabled(enabled) {
    this.isEnabled = enabled;
    
    if (!enabled) {
      this.clearKeyStates();
    }
  }

  setRepeatSettings(delay, rate) {
    this.repeatDelay = Math.max(100, delay);
    this.repeatRate = Math.max(50, rate);
  }

  // Custom shortcuts
  addCustomShortcut(keyCombo, handler, description = '') {
    this.registerShortcut(keyCombo, handler, {
      description,
      category: 'custom',
      repeatable: false
    });
  }

  removeCustomShortcut(keyCombo) {
    return this.unregisterShortcut(keyCombo);
  }

  // State management
  getKeyboardState() {
    return {
      isEnabled: this.isEnabled,
      pressedKeys: Array.from(this.keyStates.entries())
        .filter(([code, state]) => state.pressed)
        .map(([code]) => code),
      currentRepeatKey: this.currentRepeatKey,
      shortcutCount: this.shortcuts.size
    };
  }

  // Debug information
  getDebugInfo() {
    return {
      isInitialized: this.isInitialized,
      isEnabled: this.isEnabled,
      keyboardState: this.getKeyboardState(),
      shortcuts: this.getShortcutsByCategory(),
      repeatSettings: {
        delay: this.repeatDelay,
        rate: this.repeatRate
      }
    };
  }

  printShortcuts() {
    console.log('⌨️ Keyboard Shortcuts:');
    
    const shortcuts = this.getShortcutsByCategory();
    
    Object.entries(shortcuts).forEach(([category, categoryShortcuts]) => {
      console.log(`\n📂 ${category.toUpperCase()}:`);
      
      Object.entries(categoryShortcuts).forEach(([keyCombo, shortcut]) => {
        const displayKey = this.formatKeyCombo(keyCombo);
        console.log(`  ${displayKey.padEnd(15)} - ${shortcut.description}`);
      });
    });
  }
}

// Global instance
window.EnderTrack = window.EnderTrack || {};
window.EnderTrack.KeyboardNavigation = new KeyboardNavigation();