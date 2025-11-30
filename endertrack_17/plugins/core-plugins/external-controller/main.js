// Plugin Contrôleur Externe - EnderTrack
class ExternalControllerPlugin {
  constructor() {
    this.isActive = false;
    this.controllers = new Map();
    this.mapping = {};
    this.isListening = false;
    this.currentMappingAction = null;
    this.presets = this.getPresets();
  }

  async init() {
    console.log('🎮 Initializing External Controller Plugin...');
    this.setupEventListeners();
    this.detectControllers();
    return true;
  }

  async activate() {
    this.isActive = true;
    this.startControllerPolling();
    this.updateUI();
    return true;
  }

  deactivate() {
    this.isActive = false;
    this.stopControllerPolling();
  }

  // Détection des contrôleurs
  detectControllers() {
    // Gamepad API
    if (navigator.getGamepads) {
      this.detectGamepads();
    }

    // Web MIDI API
    if (navigator.requestMIDIAccess) {
      this.detectMIDI();
    }

    // Keyboard (toujours disponible)
    this.controllers.set('keyboard', {
      type: 'keyboard',
      name: 'Clavier',
      connected: true,
      buttons: {},
      axes: {}
    });
  }

  detectGamepads() {
    const gamepads = navigator.getGamepads();
    for (let i = 0; i < gamepads.length; i++) {
      if (gamepads[i]) {
        this.controllers.set(`gamepad_${i}`, {
          type: 'gamepad',
          name: gamepads[i].id,
          connected: true,
          gamepad: gamepads[i],
          buttons: {},
          axes: {}
        });
      }
    }
  }

  async detectMIDI() {
    try {
      const midiAccess = await navigator.requestMIDIAccess();
      midiAccess.inputs.forEach((input, id) => {
        this.controllers.set(`midi_${id}`, {
          type: 'midi',
          name: input.name,
          connected: true,
          input: input,
          buttons: {},
          axes: {}
        });
        
        input.onmidimessage = (event) => {
          this.handleMIDIMessage(id, event);
        };
      });
    } catch (error) {
      console.warn('MIDI non disponible:', error);
    }
  }

  // Presets de contrôleurs connus
  getPresets() {
    return {
      'akai_mpk': {
        name: 'Akai MPK Mini',
        type: 'midi',
        mapping: {
          'up': { type: 'cc', channel: 0, controller: 1, value: 127 },
          'down': { type: 'cc', channel: 0, controller: 1, value: 0 },
          'left': { type: 'cc', channel: 0, controller: 2, value: 0 },
          'right': { type: 'cc', channel: 0, controller: 2, value: 127 },
          'zUp': { type: 'note', channel: 0, note: 36 },
          'zDown': { type: 'note', channel: 0, note: 37 }
        }
      },
      'ps4_controller': {
        name: 'Manette PS4',
        type: 'gamepad',
        mapping: {
          'up': { type: 'button', index: 12 },
          'down': { type: 'button', index: 13 },
          'left': { type: 'button', index: 14 },
          'right': { type: 'button', index: 15 },
          'zUp': { type: 'button', index: 4 },
          'zDown': { type: 'button', index: 6 }
        }
      },
      'xbox_controller': {
        name: 'Manette Xbox',
        type: 'gamepad',
        mapping: {
          'up': { type: 'axis', index: 1, threshold: -0.5 },
          'down': { type: 'axis', index: 1, threshold: 0.5 },
          'left': { type: 'axis', index: 0, threshold: -0.5 },
          'right': { type: 'axis', index: 0, threshold: 0.5 },
          'zUp': { type: 'button', index: 4 },
          'zDown': { type: 'button', index: 5 }
        }
      }
    };
  }

  // Gestion des événements
  setupEventListeners() {
    // Gamepad connect/disconnect
    window.addEventListener('gamepadconnected', (e) => {
      console.log('🎮 Gamepad connecté:', e.gamepad.id);
      this.detectGamepads();
      this.updateUI();
    });

    window.addEventListener('gamepaddisconnected', (e) => {
      console.log('🎮 Gamepad déconnecté:', e.gamepad.id);
      this.controllers.delete(`gamepad_${e.gamepad.index}`);
      this.updateUI();
    });

    // Keyboard pour mapping
    document.addEventListener('keydown', (e) => {
      if (this.isListening && this.currentMappingAction) {
        e.preventDefault();
        this.mapKeyboardInput(e.code);
      }
    });
  }

  // Polling des contrôleurs
  startControllerPolling() {
    if (this.pollingInterval) return;
    
    this.pollingInterval = setInterval(() => {
      if (this.isActive) {
        this.pollControllers();
      }
    }, 16); // ~60fps
  }

  stopControllerPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  pollControllers() {
    // Poll gamepads
    const gamepads = navigator.getGamepads();
    for (let i = 0; i < gamepads.length; i++) {
      if (gamepads[i]) {
        this.processGamepadInput(gamepads[i]);
      }
    }
  }

  processGamepadInput(gamepad) {
    const controllerId = `gamepad_${gamepad.index}`;
    const controller = this.controllers.get(controllerId);
    if (!controller) return;

    // Process mapped actions
    Object.entries(this.mapping).forEach(([action, config]) => {
      if (config.controllerId === controllerId) {
        const isPressed = this.checkGamepadInput(gamepad, config);
        if (isPressed && !controller.buttons[action]) {
          this.executeAction(action);
          controller.buttons[action] = true;
        } else if (!isPressed) {
          controller.buttons[action] = false;
        }
      }
    });
  }

  checkGamepadInput(gamepad, config) {
    if (config.type === 'button') {
      return gamepad.buttons[config.index]?.pressed;
    } else if (config.type === 'axis') {
      const value = gamepad.axes[config.index];
      if (config.threshold > 0) {
        return value > config.threshold;
      } else {
        return value < config.threshold;
      }
    }
    return false;
  }

  handleMIDIMessage(controllerId, event) {
    const [status, data1, data2] = event.data;
    const channel = status & 0x0F;
    const messageType = status & 0xF0;

    // Check mapped actions
    Object.entries(this.mapping).forEach(([action, config]) => {
      if (config.controllerId === `midi_${controllerId}`) {
        let matches = false;
        
        if (config.type === 'cc' && messageType === 0xB0) {
          matches = config.controller === data1 && 
                   (config.value === undefined || config.value === data2);
        } else if (config.type === 'note' && messageType === 0x90) {
          matches = config.note === data1 && data2 > 0;
        }
        
        if (matches) {
          this.executeAction(action);
        }
      }
    });
  }

  mapKeyboardInput(keyCode) {
    if (!this.currentMappingAction) return;
    
    this.mapping[this.currentMappingAction] = {
      controllerId: 'keyboard',
      type: 'key',
      keyCode: keyCode
    };
    
    this.stopMapping();
    this.updateMappingDisplay();
    window.EnderTrackPluginAPI.showNotification(`${this.currentMappingAction} mappé sur ${keyCode}`, 'success');
  }

  // Exécution des actions
  executeAction(action) {
    const state = window.EnderTrackPluginAPI.getState();
    if (!state || state.historyMode) return; // Pas d'action en mode historique

    const actionMap = {
      'up': () => window.moveDirection('up'),
      'down': () => window.moveDirection('down'),
      'left': () => window.moveDirection('left'),
      'right': () => window.moveDirection('right'),
      'zUp': () => window.moveDirection('zUp'),
      'zDown': () => window.moveDirection('zDown'),
      'home': () => window.goHome('xy'),
      'homeXYZ': () => window.goHome('xyz'),
      'emergency': () => window.emergencyStop()
    };

    if (actionMap[action]) {
      actionMap[action]();
    }
  }

  // Interface utilisateur
  updateUI() {
    const controllerList = document.getElementById('controllerList');
    if (!controllerList) return;

    controllerList.innerHTML = '';
    
    this.controllers.forEach((controller, id) => {
      const div = document.createElement('div');
      div.className = 'controller-item';
      div.innerHTML = `
        <div class="controller-info">
          <span class="controller-icon">${this.getControllerIcon(controller.type)}</span>
          <span class="controller-name">${controller.name}</span>
          <span class="controller-status ${controller.connected ? 'connected' : 'disconnected'}">
            ${controller.connected ? '🟢' : '🔴'}
          </span>
        </div>
        <button onclick="window.ExternalController.selectController('${id}')" class="btn-small">
          Sélectionner
        </button>
      `;
      controllerList.appendChild(div);
    });
  }

  getControllerIcon(type) {
    const icons = {
      'gamepad': '🎮',
      'midi': '🎹',
      'keyboard': '⌨️'
    };
    return icons[type] || '🎮';
  }

  selectController(controllerId) {
    this.selectedController = controllerId;
    document.getElementById('selectedController').textContent = 
      this.controllers.get(controllerId)?.name || 'Aucun';
    
    // Show mapping section
    document.getElementById('mappingSection').style.display = 'block';
    this.updateMappingDisplay();
  }

  // Mapping des contrôles
  startMapping(action) {
    this.currentMappingAction = action;
    this.isListening = true;
    
    const button = document.querySelector(`[onclick="window.ExternalController.startMapping('${action}')"]`);
    if (button) {
      button.textContent = 'Appuyez sur un bouton...';
      button.style.background = '#ffc107';
    }
    
    window.EnderTrackPluginAPI.showNotification(`Appuyez sur le bouton pour ${action}`, 'info');
  }

  stopMapping() {
    this.currentMappingAction = null;
    this.isListening = false;
    
    // Reset button text
    document.querySelectorAll('.mapping-btn').forEach(btn => {
      const action = btn.getAttribute('onclick').match(/'([^']+)'/)[1];
      btn.textContent = this.getActionName(action);
      btn.style.background = '';
    });
  }

  getActionName(action) {
    const names = {
      'up': 'Haut',
      'down': 'Bas', 
      'left': 'Gauche',
      'right': 'Droite',
      'zUp': 'Z+',
      'zDown': 'Z-',
      'home': 'Home XY',
      'homeXYZ': 'Home XYZ',
      'emergency': 'Arrêt'
    };
    return names[action] || action;
  }

  updateMappingDisplay() {
    const mappingDisplay = document.getElementById('mappingDisplay');
    if (!mappingDisplay) return;

    let html = '<div class="mapping-list">';
    Object.entries(this.mapping).forEach(([action, config]) => {
      html += `
        <div class="mapping-item">
          <span class="action-name">${this.getActionName(action)}</span>
          <span class="mapping-info">${this.formatMappingInfo(config)}</span>
          <button onclick="window.ExternalController.removeMapping('${action}')" class="btn-remove">×</button>
        </div>
      `;
    });
    html += '</div>';
    
    mappingDisplay.innerHTML = html;
  }

  formatMappingInfo(config) {
    if (config.type === 'key') {
      return `Clavier: ${config.keyCode}`;
    } else if (config.type === 'button') {
      return `Bouton ${config.index}`;
    } else if (config.type === 'axis') {
      return `Axe ${config.index} (${config.threshold > 0 ? '+' : '-'})`;
    } else if (config.type === 'cc') {
      return `CC ${config.controller}`;
    } else if (config.type === 'note') {
      return `Note ${config.note}`;
    }
    return 'Inconnu';
  }

  removeMapping(action) {
    delete this.mapping[action];
    this.updateMappingDisplay();
  }

  // Presets
  loadPreset(presetName) {
    const preset = this.presets[presetName];
    if (!preset) return;

    this.mapping = { ...preset.mapping };
    
    // Update controller IDs based on connected controllers
    Object.keys(this.mapping).forEach(action => {
      const config = this.mapping[action];
      
      // Find matching controller
      for (const [id, controller] of this.controllers) {
        if (controller.type === preset.type) {
          config.controllerId = id;
          break;
        }
      }
    });

    this.updateMappingDisplay();
    window.EnderTrackPluginAPI.showNotification(`Preset ${preset.name} chargé`, 'success');
  }

  // Sauvegarde/Chargement
  saveMapping() {
    const data = {
      mapping: this.mapping,
      selectedController: this.selectedController,
      timestamp: Date.now()
    };
    
    localStorage.setItem('endertrack_controller_mapping', JSON.stringify(data));
    window.EnderTrackPluginAPI.showNotification('Mapping sauvegardé', 'success');
  }

  loadMapping() {
    try {
      const data = JSON.parse(localStorage.getItem('endertrack_controller_mapping'));
      if (data) {
        this.mapping = data.mapping || {};
        this.selectedController = data.selectedController;
        this.updateMappingDisplay();
        window.EnderTrackPluginAPI.showNotification('Mapping chargé', 'success');
      }
    } catch (error) {
      console.error('Erreur chargement mapping:', error);
    }
  }
}

// Enregistrement global
window.ExternalController = new ExternalControllerPlugin();
window.EnderTrack = window.EnderTrack || {};
window.EnderTrack.Plugins = window.EnderTrack.Plugins || {};
window.EnderTrack.Plugins.ExternalController = window.ExternalController;