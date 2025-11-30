// Plugin Contrôleur Externe - Version Simple
class ExternalController {
  constructor() {
    this.isActive = false;
    this.controllers = new Map();
    this.mapping = {};
    this.customMappings = {};
    this.isListening = false;
    this.currentMappingAction = null;
    this.pollingInterval = null;
    
    // Liste des fonctions EnderTrack disponibles
    this.availableFunctions = [
      // Navigation
      { id: 'goHome_xy', name: 'Home XY', description: 'Retour origine XY', category: 'navigation' },
      { id: 'goHome_xyz', name: 'Home XYZ', description: 'Retour origine XYZ', category: 'navigation' },
      { id: 'emergencyStop', name: 'Arrêt d\'urgence', description: 'Stop immédiat', category: 'navigation' },
      { id: 'toggleInputMode', name: 'Basculer mode', description: 'Relatif/Absolu', category: 'navigation' },
      { id: 'getCurrentPosition', name: 'Position actuelle', description: 'Afficher coordonnées', category: 'navigation' },
      { id: 'goToAbsolute', name: 'Aller à position', description: 'Mode absolu', category: 'navigation' },
      
      // Historique
      { id: 'clearHistory', name: 'Effacer historique', description: 'Vider l\'historique', category: 'history' },
      { id: 'saveTrack', name: 'Sauver track', description: 'Sauvegarder le parcours', category: 'history' },
      { id: 'loadTrack', name: 'Charger track', description: 'Charger un parcours', category: 'history' },
      { id: 'exportHistory', name: 'Exporter historique', description: 'Sauver en fichier', category: 'history' },
      
      // Paramètres
      { id: 'toggleCoupling', name: 'Couplage XY', description: 'Activer/désactiver couplage', category: 'settings' },
      { id: 'setPresetFine', name: 'Preset fin', description: 'Sensibilité fine', category: 'settings' },
      { id: 'setPresetCoarse', name: 'Preset grossier', description: 'Sensibilité grossière', category: 'settings' },
      { id: 'toggleKeyboardMode', name: 'Mode contrôleur', description: 'Basculer interface', category: 'settings' },
      { id: 'resetToDefault', name: 'Reset config', description: 'Paramètres par défaut', category: 'settings' },
      
      // Visualisation
      { id: 'toggleZPanel', name: 'Panneau Z', description: 'Afficher/masquer Z', category: 'display' },
      { id: 'openDisplayModal', name: 'Paramètres affichage', description: 'Couleurs et interface', category: 'display' },
      { id: 'toggleGraphs', name: 'Graphiques', description: 'Historique XYZ', category: 'display' },
      { id: 'toggleTrackPositions', name: 'Track positions', description: 'Afficher parcours', category: 'display' },
      
      // Plateau
      { id: 'openTemplateModal', name: 'Profils plateau', description: 'Sélectionner template', category: 'plateau' },
      { id: 'validatePlateauSize', name: 'Valider plateau', description: 'Appliquer dimensions', category: 'plateau' },
      
      // Enderscope
      { id: 'toggleConnection', name: 'Connexion Enderscope', description: 'Connecter/déconnecter', category: 'enderscope' },
      { id: 'sendBeep', name: 'Bip sonore', description: 'Signal audio', category: 'enderscope' },
      { id: 'homeEnderscope', name: 'Home Enderscope', description: 'Retour origine matériel', category: 'enderscope' },
      { id: 'syncEnderscopePosition', name: 'Sync position', description: 'Synchroniser coordonnées', category: 'enderscope' }
    ];
  }

  async init() {
    this.detectControllers();
    this.setupEventListeners();
    this.createUI();
    return true;
  }

  detectControllers() {
    console.log('🔍 Détection des contrôleurs...');
    console.log('🌐 Navigateur:', navigator.userAgent.includes('Chrome') ? 'Chrome' : navigator.userAgent.includes('Firefox') ? 'Firefox' : 'Autre');
    
    // Gamepad API
    if (navigator.getGamepads) {
      const gamepads = navigator.getGamepads();
      for (let i = 0; i < gamepads.length; i++) {
        if (gamepads[i]) {
          console.log(`🎮 Gamepad détecté: ${gamepads[i].id}`);
          this.controllers.set(`gamepad_${i}`, {
            type: 'gamepad',
            name: gamepads[i].id,
            connected: true,
            gamepad: gamepads[i],
            buttons: {}
          });
        }
      }
    }

    // Essai Universal Input Bridge d'abord
    this.tryUniversalBridge();
    
    // Web MIDI API avec timeout
    if (navigator.requestMIDIAccess) {
      console.log('🎹 Tentative d\'accès MIDI...');
      
      const midiPromise = navigator.requestMIDIAccess({ sysex: false });
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('MIDI timeout')), 5000)
      );
      
      Promise.race([midiPromise, timeoutPromise])
        .then(midiAccess => {
          console.log('✅ MIDI Access granted');
          console.log('🎹 MIDI Inputs found:', midiAccess.inputs.size);
          
          if (midiAccess.inputs.size === 0) {
            console.log('⚠️ Aucun périphérique MIDI détecté');
            console.log('💡 Vérifiez que votre MPK est connecté et reconnu par le système');
          }
          
          midiAccess.inputs.forEach((input, id) => {
            console.log(`🎹 MIDI Input: ${input.name} (ID: ${id})`);
            this.controllers.set(`midi_${id}`, {
              type: 'midi',
              name: input.name,
              connected: true,
              input: input,
              buttons: {}
            });
            
            input.onmidimessage = (event) => {
              console.log('🎹 MIDI Message:', event.data);
              this.handleMIDIMessage(id, event);
            };
          });
          
          this.updateUI();
        })
        .catch(err => {
          console.error('❌ MIDI Error:', err.message);
          
          if (navigator.userAgent.includes('Firefox')) {
            console.log('🦊 FIREFOX - MIDI limité, utilisez CHROME:');
            console.log('1. Téléchargez Google Chrome');
            console.log('2. Ou utilisez le mapping clavier ci-dessous');
          } else {
            console.log('💡 SOLUTION - Votre MPK fonctionne parfaitement !');
            console.log('1. Utilisez le MAPPING CLAVIER ci-dessous');
            console.log('2. Sélectionnez "Clavier (Mapping manuel)"');
            console.log('3. Mappez vos touches préférées pour contrôler EnderTrack');
            console.log('4. Alternative: Fermez TOUS les navigateurs et relancez Chrome');
          }
        });
    } else {
      console.warn('❌ Web MIDI API non supportée');
      console.log('💡 Utilisez Google Chrome pour le support MIDI complet');
    }

    // Keyboard (toujours disponible)
    this.controllers.set('keyboard_system', {
      type: 'keyboard',
      name: 'Clavier (Mapping manuel)',
      connected: true,
      buttons: {}
    });
    
    console.log('✅ Clavier ajouté comme contrôleur de secours');
  }
  
  tryUniversalBridge() {
    console.log('🔗 Tentative Universal Input Bridge...');
    try {
      const ws = new WebSocket('ws://localhost:8765');
      
      ws.onopen = () => {
        console.log('✅ Universal Bridge connecté');
        ws.send(JSON.stringify({type: 'scan_devices'}));
      };
      
      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        
        if (message.type === 'devices') {
          console.log('🔍 Périphériques reçus:', message.devices);
          this.updateDevicesFromBridge(message.devices);
        } else if (message.type === 'input') {
          console.log('🎮 Input reçu:', message.data);
          this.handleUniversalInput(message.data);
        }
      };
      
      ws.onerror = (error) => {
        console.log('❌ Universal Bridge erreur:', error);
      };
      
      ws.onclose = () => {
        console.log('🔌 Universal Bridge déconnecté');
      };
      
      this.universalBridge = ws;
    } catch (error) {
      console.log('❌ WebSocket non supporté');
    }
  }

  setupEventListeners() {
    window.addEventListener('gamepadconnected', (e) => {
      this.detectControllers();
      this.updateUI();
    });

    document.addEventListener('keydown', (e) => {
      if (this.isListening && this.currentMappingAction) {
        e.preventDefault();
        this.mapKeyboardInput(e.code);
      }
    });
  }

  createUI() {
    const othersContent = document.getElementById('othersTabContent');
    if (!othersContent) return;

    const controllerSection = document.createElement('div');
    controllerSection.innerHTML = `
      <div class="feature-group" id="externalControllerSection" style="display: none;">
        <h5>🎮 Contrôleur Externe</h5>
        <div id="controllerList"></div>
        <button onclick="window.ExternalController.detectControllers(); window.ExternalController.updateUI()">🔄 Actualiser</button>
        
        <div id="mappingSection" style="display: none; margin-top: 16px;">
          <h6>Configuration</h6>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 8px 0;">
            <button onclick="window.ExternalController.startMapping('up')" class="feature-btn">Haut</button>
            <button onclick="window.ExternalController.startMapping('down')" class="feature-btn">Bas</button>
            <button onclick="window.ExternalController.startMapping('left')" class="feature-btn">Gauche</button>
            <button onclick="window.ExternalController.startMapping('right')" class="feature-btn">Droite</button>
            <button onclick="window.ExternalController.startMapping('zUp')" class="feature-btn">Z+</button>
            <button onclick="window.ExternalController.startMapping('zDown')" class="feature-btn">Z-</button>
          </div>
          <button onclick="window.ExternalController.loadAkaiPreset()" class="feature-btn">🎹 Preset Akai MPK</button>
          <div id="mappingDisplay" style="margin-top: 8px; font-size: 12px;"></div>
        </div>
      </div>
    `;
    
    othersContent.appendChild(controllerSection);
  }

  activate() {
    this.isActive = true;
    this.tryUniversalBridge();
    this.populateDeviceSelector();
    this.startPolling();
  }
  
  populateDeviceSelector() {
    const selector = document.getElementById('deviceSelector');
    if (!selector) return;
    
    selector.innerHTML = '<option value="">-- Sélectionnez un périphérique --</option>';
    
    this.controllers.forEach((controller, id) => {
      const option = document.createElement('option');
      option.value = id;
      option.textContent = `${this.getIcon(controller.type)} ${controller.name}`;
      if (id === 'keyboard_system') option.selected = true;
      selector.appendChild(option);
    });
    
    this.selectDevice('keyboard_system');
  }
  
  selectDevice(deviceId) {
    const selector = document.getElementById('deviceSelector');
    const selectedId = deviceId || selector?.value;
    
    if (!selectedId) {
      return;
    }
    
    // Arrêter l'écoute du périphérique précédent
    if (this.selectedController) {
      this.stopListening(this.selectedController);
    }
    
    this.selectedController = selectedId;
    const controller = this.controllers.get(selectedId);
    
    if (controller) {
      const status = document.getElementById('deviceStatus');
      const statusText = document.getElementById('deviceStatusText');
      if (status && statusText) {
        status.style.display = 'block';
        status.style.background = controller.connected ? '#10b981' : '#ef4444';
        statusText.textContent = `${controller.name} - ${controller.connected ? 'Connecté' : 'Déconnecté'}`;
      }
      
      // Démarrer l'écoute du nouveau périphérique
      if (controller.bridgeDevice) {
        this.startListening(selectedId);
      }
    }
    
    this.updateMappingDisplay();
  }
  
  refreshDevices() {
    // Demander au bridge Python de rescanner
    if (this.universalBridge && this.universalBridge.readyState === WebSocket.OPEN) {
      this.universalBridge.send(JSON.stringify({type: 'scan_devices'}));
    }
    
    this.detectControllers();
    this.updateUI();
    console.log('🔄 Périphériques actualisés');
  }
  
  updateDevicesFromBridge(devices) {
    // Nettoyer les anciens périphériques bridge
    this.controllers.forEach((controller, id) => {
      if (controller.bridgeDevice) {
        this.controllers.delete(id);
      }
    });
    
    // Ajouter les nouveaux périphériques
    devices.forEach(device => {
      this.controllers.set(device.id, {
        type: device.type,
        name: device.name,
        connected: device.connected,
        bridgeDevice: true
      });
    });
    
    this.updateUI();
  }
  
  openMappingModal() {
    const modal = document.getElementById('mappingModal');
    if (modal) {
      modal.style.display = 'block';
      this.switchMappingTab('navigation');
      this.populateFunctionCategories();
      this.updateMappingModal();
      this.updateActiveMappings();
    }
  }
  
  switchMappingTab(tabName) {
    // Remove active class from all tabs and contents
    document.querySelectorAll('#mappingModal .display-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('#mappingModal .display-tab-content').forEach(content => content.classList.remove('active'));
    
    // Add active class to selected tab and content
    const tabs = ['navigation', 'functions', 'presets'];
    const tabIndex = tabs.indexOf(tabName);
    if (tabIndex >= 0) {
      document.querySelectorAll('#mappingModal .display-tab')[tabIndex].classList.add('active');
      document.getElementById(tabName + 'MappingTab').classList.add('active');
    }
  }
  
  populateFunctionCategories() {
    const container = document.getElementById('functionCategories');
    if (!container) return;
    
    const categories = {
      'navigation': { name: '📍 Navigation', icon: '📍' },
      'history': { name: '📈 Historique', icon: '📈' },
      'settings': { name: '⚙️ Paramètres', icon: '⚙️' },
      'display': { name: '🎨 Affichage', icon: '🎨' },
      'plateau': { name: '🗺️ Plateau', icon: '🗺️' },
      'enderscope': { name: '🔬 Enderscope', icon: '🔬' }
    };
    
    container.innerHTML = '';
    
    Object.entries(categories).forEach(([catId, category]) => {
      const functions = this.availableFunctions.filter(f => f.category === catId);
      if (functions.length === 0) return;
      
      const categoryDiv = document.createElement('details');
      categoryDiv.style.cssText = 'margin-bottom: 8px; border: 1px solid var(--border); border-radius: 4px; background: var(--panel-bg);';
      
      const summary = document.createElement('summary');
      summary.textContent = category.name;
      summary.style.cssText = 'padding: 8px; cursor: pointer; font-weight: 500;';
      categoryDiv.appendChild(summary);
      
      const functionsDiv = document.createElement('div');
      functionsDiv.style.cssText = 'padding: 0 8px 8px 8px;';
      
      functions.forEach(func => {
        const funcDiv = document.createElement('div');
        funcDiv.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 4px 0; border-bottom: 1px solid var(--border-light);';
        
        funcDiv.innerHTML = `
          <div>
            <div style="font-size: 12px; font-weight: 500;">${func.name}</div>
            <div style="font-size: 10px; color: var(--text-secondary);">${func.description}</div>
          </div>
          <button onclick="window.ExternalController.startCustomMapping('${func.id}')" class="validate-btn" style="padding: 4px 8px; font-size: 10px;">+</button>
        `;
        
        functionsDiv.appendChild(funcDiv);
      });
      
      categoryDiv.appendChild(functionsDiv);
      container.appendChild(categoryDiv);
    });
  }
  
  showAllFunctions() {
    const searchResults = document.getElementById('functionSearchResults');
    if (!searchResults) return;
    
    searchResults.innerHTML = '';
    searchResults.style.display = 'block';
    
    this.availableFunctions.forEach(func => {
      const funcDiv = document.createElement('div');
      funcDiv.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 6px 8px; border-bottom: 1px solid var(--border-light); cursor: pointer;';
      funcDiv.onmouseover = () => funcDiv.style.background = 'var(--hover-bg)';
      funcDiv.onmouseout = () => funcDiv.style.background = '';
      funcDiv.onclick = () => this.selectFunction(func.id);
      
      funcDiv.innerHTML = `
        <div>
          <div style="font-size: 11px; font-weight: 500;">${func.name}</div>
          <div style="font-size: 9px; color: var(--text-secondary);">${func.description}</div>
        </div>
        <button onclick="event.stopPropagation(); window.ExternalController.startCustomMapping('${func.id}')" class="validate-btn" style="padding: 2px 6px; font-size: 9px;">+</button>
      `;
      
      searchResults.appendChild(funcDiv);
    });
  }
  
  selectFunction(funcId) {
    const search = document.getElementById('functionSearch');
    const func = this.availableFunctions.find(f => f.id === funcId);
    if (search && func) {
      search.value = func.name;
      document.getElementById('functionSearchResults').style.display = 'none';
    }
  }
  
  filterFunctions() {
    const search = document.getElementById('functionSearch');
    const searchResults = document.getElementById('functionSearchResults');
    if (!search || !searchResults) return;
    
    const query = search.value.toLowerCase();
    
    if (query.length === 0) {
      this.showAllFunctions();
      return;
    }
    
    const filtered = this.availableFunctions.filter(func => 
      func.name.toLowerCase().includes(query) || 
      func.description.toLowerCase().includes(query)
    );
    
    searchResults.innerHTML = '';
    searchResults.style.display = filtered.length > 0 ? 'block' : 'none';
    
    filtered.forEach(func => {
      const funcDiv = document.createElement('div');
      funcDiv.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 6px 8px; border-bottom: 1px solid var(--border-light); cursor: pointer;';
      funcDiv.onmouseover = () => funcDiv.style.background = 'var(--hover-bg)';
      funcDiv.onmouseout = () => funcDiv.style.background = '';
      funcDiv.onclick = () => this.selectFunction(func.id);
      
      funcDiv.innerHTML = `
        <div>
          <div style="font-size: 11px; font-weight: 500;">${func.name}</div>
          <div style="font-size: 9px; color: var(--text-secondary);">${func.description}</div>
        </div>
        <button onclick="event.stopPropagation(); window.ExternalController.startCustomMapping('${func.id}')" class="validate-btn" style="padding: 2px 6px; font-size: 9px;">+</button>
      `;
      
      searchResults.appendChild(funcDiv);
    });
  }
  
  startCustomMapping(funcId) {
    const func = this.availableFunctions.find(f => f.id === funcId);
    if (!func) return;
    
    // Fermer la recherche
    const searchResults = document.getElementById('functionSearchResults');
    if (searchResults) searchResults.style.display = 'none';
    
    // Démarrer le mapping pour cette fonction personnalisée
    this.currentMappingAction = `custom_${funcId}`;
    this.isListening = true;
    
    // Bloquer l'interface
    this.showMappingOverlay(func.name);
  }
  
  updateActiveMappings() {
    const container = document.getElementById('activeMappings');
    if (!container) return;
    
    const allMappings = Object.entries(this.mapping);
    
    if (allMappings.length === 0) {
      container.innerHTML = '<div style="font-size: 11px; color: var(--text-secondary); text-align: center;">Aucun mapping configuré</div>';
      return;
    }
    
    container.innerHTML = '';
    
    // Grouper par type
    const basicActions = allMappings.filter(([action]) => !action.startsWith('custom_'));
    const customActions = allMappings.filter(([action]) => action.startsWith('custom_'));
    
    if (basicActions.length > 0) {
      const basicDiv = document.createElement('div');
      basicDiv.innerHTML = '<div style="font-size: 10px; font-weight: 500; color: var(--text-secondary); margin-bottom: 4px;">NAVIGATION</div>';
      
      basicActions.forEach(([action, config]) => {
        const actionDiv = document.createElement('div');
        actionDiv.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 2px 4px; margin: 1px 0; background: var(--success-bg); border-radius: 2px; font-size: 10px;';
        actionDiv.innerHTML = `
          <span>${action.toUpperCase()}: ${this.formatMapping(config)}</span>
          <button onclick="window.ExternalController.removeMapping('${action}')" style="background: var(--danger); border: none; color: white; padding: 1px 4px; border-radius: 2px; cursor: pointer; font-size: 8px;">×</button>
        `;
        basicDiv.appendChild(actionDiv);
      });
      
      container.appendChild(basicDiv);
    }
    
    if (customActions.length > 0) {
      const customDiv = document.createElement('div');
      customDiv.innerHTML = '<div style="font-size: 10px; font-weight: 500; color: var(--text-secondary); margin: 8px 0 4px 0;">FONCTIONS</div>';
      
      customActions.forEach(([action, config]) => {
        const func = this.availableFunctions.find(f => f.id === action.replace('custom_', ''));
        if (!func) return;
        
        const actionDiv = document.createElement('div');
        actionDiv.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 2px 4px; margin: 1px 0; background: var(--primary-bg); border-radius: 2px; font-size: 10px;';
        actionDiv.innerHTML = `
          <span>${func.name}: ${this.formatMapping(config)}</span>
          <button onclick="window.ExternalController.removeMapping('${action}')" style="background: var(--danger); border: none; color: white; padding: 1px 4px; border-radius: 2px; cursor: pointer; font-size: 8px;">×</button>
        `;
        customDiv.appendChild(actionDiv);
      });
      
      container.appendChild(customDiv);
    }
  }
  
  removeMapping(actionId) {
    delete this.mapping[actionId];
    if (actionId.startsWith('custom_')) {
      delete this.customMappings[actionId];
    }
    this.updateActiveMappings();
    this.updateMappingDisplay();
  }
  
  removeCustomMapping(actionId) {
    delete this.customMappings[actionId];
    delete this.mapping[actionId];
    this.updateActiveMappings();
    this.updateMappingDisplay();
  }
  
  closeMappingModal() {
    const modal = document.getElementById('mappingModal');
    if (modal) {
      modal.style.display = 'none';
      this.stopMapping();
    }
  }
  
  updateMappingModal() {
    const actions = ['up', 'down', 'left', 'right', 'zUp', 'zDown'];
    actions.forEach(action => {
      const valueSpan = document.getElementById(`map${action.charAt(0).toUpperCase() + action.slice(1)}Value`);
      if (valueSpan) {
        const mapping = this.mapping[action];
        if (mapping) {
          valueSpan.textContent = this.formatMapping(mapping);
          valueSpan.style.color = '#10b981';
        } else {
          valueSpan.textContent = 'Non mappé';
          valueSpan.style.color = '#ef4444';
        }
      }
    });
  }
  
  startMapping(action) {
    this.currentMappingAction = action;
    this.isListening = true;
    
    const btn = document.getElementById(`map${action.charAt(0).toUpperCase() + action.slice(1)}`);
    if (btn) {
      btn.textContent = 'Appuyez sur votre contrôleur...';
      btn.style.background = '#ffc107';
    }
  }
  
  stopMapping() {
    this.currentMappingAction = null;
    this.isListening = false;
    
    const actions = ['up', 'down', 'left', 'right', 'zUp', 'zDown'];
    actions.forEach(action => {
      const btn = document.getElementById(`map${action.charAt(0).toUpperCase() + action.slice(1)}`);
      if (btn) {
        btn.textContent = 'Cliquez pour mapper';
        btn.style.background = '';
      }
    });
  }
  
  loadPresetMapping() {
    this.loadAkaiPreset();
    this.updateMappingDisplay();
  }
  
  saveMappingConfig() {
    const config = {
      selectedController: this.selectedController,
      mapping: this.mapping,
      timestamp: Date.now()
    };
    
    localStorage.setItem('endertrack_controller_mapping', JSON.stringify(config));
    
    // Notification visuelle
    const status = document.getElementById('mappingStatus');
    const statusText = document.getElementById('mappingStatusText');
    if (status && statusText) {
      status.style.display = 'block';
      status.style.background = '#10b981';
      statusText.textContent = '💾 Configuration sauvegardée';
      
      setTimeout(() => {
        if (status) status.style.display = 'none';
      }, 2000);
    }
    
    console.log('💾 Configuration sauvegardée');
  }
  
  loadMappingConfig() {
    try {
      const saved = localStorage.getItem('endertrack_controller_mapping');
      if (saved) {
        const config = JSON.parse(saved);
        this.mapping = config.mapping || {};
        this.selectedController = config.selectedController;
        
        this.updateMappingDisplay();
        this.updateMappingModal();
        
        // Notification
        const status = document.getElementById('mappingStatus');
        const statusText = document.getElementById('mappingStatusText');
        if (status && statusText) {
          status.style.display = 'block';
          status.style.background = '#0b84ff';
          statusText.textContent = '📂 Configuration chargée';
          
          setTimeout(() => {
            if (status) status.style.display = 'none';
          }, 2000);
        }
        
        console.log('📂 Configuration chargée');
      }
    } catch (error) {
      console.error('❌ Erreur chargement config:', error);
    }
  }
  
  clearMappingConfig() {
    if (confirm('Effacer toute la configuration de mapping ?')) {
      this.mapping = {};
      this.updateMappingDisplay();
      this.updateMappingModal();
      
      // Notification
      const status = document.getElementById('mappingStatus');
      const statusText = document.getElementById('mappingStatusText');
      if (status && statusText) {
        status.style.display = 'block';
        status.style.background = '#ef4444';
        statusText.textContent = '🗑️ Configuration effacée';
        
        setTimeout(() => {
          if (status) status.style.display = 'none';
        }, 2000);
      }
      
      console.log('🗑️ Configuration effacée');
    }
  }

  updateUI() {
    const list = document.getElementById('controllerList');
    if (list) {
      list.innerHTML = '';
      
      if (this.controllers.size === 0) {
        list.innerHTML = '<div style="color: #ffc107; padding: 8px;">Aucun contrôleur détecté</div>';
        return;
      }
      
      this.controllers.forEach((controller, id) => {
        const div = document.createElement('div');
        const statusColor = controller.connected ? '#10b981' : '#ef4444';
        const statusText = controller.connected ? 'Connecté' : 'Déconnecté';
        
        div.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; margin: 4px 0; background: rgba(255,255,255,0.1); border-radius: 4px; border-left: 3px solid ${statusColor};">
            <div>
              <div>${this.getIcon(controller.type)} ${controller.name}</div>
              <small style="color: ${statusColor};">${statusText}</small>
            </div>
            <button onclick="window.ExternalController.selectController('${id}')" style="padding: 4px 12px; font-size: 11px; background: #4a5568; border: none; color: white; border-radius: 4px; cursor: pointer;">Sélectionner</button>
          </div>
        `;
        list.appendChild(div);
      });
    }
    
    // Mettre à jour aussi le dropdown
    this.populateDeviceSelector();
  }

  getIcon(type) {
    return { gamepad: '🎮', midi: '🎹', keyboard: '⌨️', hid: '🔌' }[type] || '🎮';
  }

  selectController(id) {
    this.selectedController = id;
    document.getElementById('mappingSection').style.display = 'block';
  }

  startMapping(action) {
    this.currentMappingAction = action;
    this.isListening = true;
    
    // Bloquer l'interface
    this.showMappingOverlay(action.toUpperCase());
    
    // Mettre à jour le bouton dans la modal
    const btn = document.getElementById(`map${action.charAt(0).toUpperCase() + action.slice(1)}`);
    if (btn) {
      btn.textContent = 'En attente...';
      btn.style.background = 'var(--warning)';
      btn.style.color = '#000';
      btn.disabled = true;
    }
  }

  mapKeyboardInput(keyCode) {
    if (!this.currentMappingAction) return;
    
    this.mapping[this.currentMappingAction] = {
      device_id: 'keyboard_system',
      type: 'key',
      control: keyCode
    };
    
    this.stopMapping();
    this.updateMappingDisplay();
  }

  stopMapping() {
    this.currentMappingAction = null;
    this.isListening = false;
    
    // Débloquer l'interface
    this.hideMappingOverlay();
    
    // Remettre les boutons à leur état normal
    const actions = ['up', 'down', 'left', 'right', 'zUp', 'zDown'];
    
    actions.forEach(action => {
      const btn = document.getElementById(`map${action.charAt(0).toUpperCase() + action.slice(1)}`);
      if (btn) {
        btn.innerHTML = `<span style="font-size: 16px;">${action === 'up' ? '▲' : action === 'down' ? '▼' : action === 'left' ? '◄' : action === 'right' ? '►' : action === 'zUp' ? '▲' : '▼'}</span>`;
        btn.style.background = '';
        btn.style.color = '';
        btn.disabled = false;
      }
    });
    
    // Cacher le statut
    const status = document.getElementById('mappingStatus');
    if (status) {
      status.style.display = 'none';
    }
  }

  loadMidiPreset() {
    this.mapping = {
      'up': { device_id: 'midi_28', type: 'cc', control: 1 },
      'down': { device_id: 'midi_28', type: 'cc', control: 1 },
      'left': { device_id: 'midi_28', type: 'cc', control: 2 },
      'right': { device_id: 'midi_28', type: 'cc', control: 2 },
      'zUp': { device_id: 'midi_28', type: 'note', control: 36 },
      'zDown': { device_id: 'midi_28', type: 'note', control: 37 }
    };
    this.updateMappingDisplay();
    this.updateMappingModal();
    this.updateActiveMappings();
    
    this.showMappingNotification('🎹 Preset MIDI appliqué', 'success');
  }
  
  loadGamepadPreset() {
    this.mapping = {
      'up': { device_id: 'gamepad_0', type: 'button', control: 12 },
      'down': { device_id: 'gamepad_0', type: 'button', control: 13 },
      'left': { device_id: 'gamepad_0', type: 'button', control: 14 },
      'right': { device_id: 'gamepad_0', type: 'button', control: 15 },
      'zUp': { device_id: 'gamepad_0', type: 'button', control: 4 },
      'zDown': { device_id: 'gamepad_0', type: 'button', control: 5 }
    };
    this.updateMappingDisplay();
    this.updateMappingModal();
    this.updateActiveMappings();
    
    this.showMappingNotification('🎮 Preset Gamepad appliqué', 'success');
  }
  
  showMappingOverlay(actionName) {
    // Créer l'overlay s'il n'existe pas
    let overlay = document.getElementById('mappingOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'mappingOverlay';
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        backdrop-filter: blur(2px);
      `;
      
      const message = document.createElement('div');
      message.style.cssText = `
        background: var(--panel-bg);
        border: 2px solid var(--warning);
        border-radius: 8px;
        padding: 24px;
        text-align: center;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        animation: fadeInOut 2s ease-in-out infinite;
      `;
      
      message.innerHTML = `
        <div style="font-size: 18px; margin-bottom: 8px; color: var(--warning);">⌨️</div>
        <div style="font-size: 14px; font-weight: 500; margin-bottom: 4px;">Appuyez sur une touche</div>
        <div style="font-size: 12px; color: var(--text-secondary);">pour mapper: ${actionName}</div>
        <div style="font-size: 10px; color: var(--text-secondary); margin-top: 8px;">Échap pour annuler</div>
      `;
      
      overlay.appendChild(message);
      document.body.appendChild(overlay);
      
      // Ajouter l'animation CSS
      if (!document.getElementById('fadeAnimation')) {
        const style = document.createElement('style');
        style.id = 'fadeAnimation';
        style.textContent = `
          @keyframes fadeInOut {
            0%, 100% { opacity: 0.7; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.02); }
          }
        `;
        document.head.appendChild(style);
      }
      
      // Écouter Échap pour annuler
      const escapeHandler = (e) => {
        if (e.key === 'Escape' && this.isListening) {
          this.stopMapping();
          document.removeEventListener('keydown', escapeHandler);
        }
      };
      document.addEventListener('keydown', escapeHandler);
    }
  }
  
  hideMappingOverlay() {
    const overlay = document.getElementById('mappingOverlay');
    if (overlay) {
      overlay.remove();
    }
  }
  
  showMappingNotification(message, type) {
    const status = document.getElementById('mappingStatus');
    const statusText = document.getElementById('mappingStatusText');
    const statusIcon = document.getElementById('mappingStatusIcon');
    
    if (status && statusText && statusIcon) {
      status.style.display = 'block';
      
      if (type === 'success') {
        status.style.background = 'var(--success)';
        status.style.borderColor = 'var(--success)';
        status.style.color = '#fff';
        statusIcon.innerHTML = '✅';
        statusIcon.style.animation = 'none';
      } else if (type === 'error') {
        status.style.background = 'var(--danger)';
        status.style.borderColor = 'var(--danger)';
        status.style.color = '#fff';
        statusIcon.innerHTML = '❌';
        statusIcon.style.animation = 'none';
      }
      
      statusText.textContent = message;
      
      setTimeout(() => {
        if (status) status.style.display = 'none';
      }, 2000);
    }
  }

  updateMappingDisplay() {
    const display = document.getElementById('mappingList');
    if (!display) return;

    if (Object.keys(this.mapping).length === 0) {
      display.innerHTML = 'Aucun mapping configuré';
      return;
    }

    let html = '';
    Object.entries(this.mapping).forEach(([action, config]) => {
      html += `<div style="margin: 4px 0; padding: 4px; background: rgba(255,255,255,0.1); border-radius: 4px;">${action}: ${this.formatMapping(config)}</div>`;
    });
    display.innerHTML = html;
  }

  formatMapping(config) {
    if (config.type === 'key') return `Clavier: ${config.keyCode}`;
    if (config.type === 'cc') return `CC ${config.control || config.controller}`;
    if (config.type === 'note') return `Note ${config.control || config.note}`;
    if (config.type === 'button') return `Bouton ${config.control}`;
    if (config.type === 'axis') return `Axe ${config.control}`;
    return 'Inconnu';
  }

  startPolling() {
    if (this.pollingInterval) return;
    
    this.pollingInterval = setInterval(() => {
      if (this.isActive) {
        const gamepads = navigator.getGamepads();
        for (let i = 0; i < gamepads.length; i++) {
          if (gamepads[i]) {
            this.processGamepadInput(gamepads[i]);
          }
        }
      }
    }, 16);
  }

  processGamepadInput(gamepad) {
    // Process mapped actions for gamepad
    Object.entries(this.mapping).forEach(([action, config]) => {
      if (config.type === 'button' && gamepad.buttons[config.index]?.pressed) {
        this.executeAction(action);
      }
    });
  }

  handleUniversalInput(inputData) {
    const { device_id, type, control, value } = inputData;
    
    console.log(`🎮 Input: Device=${device_id}, Type=${type}, Control=${control}, Value=${value}`);
    
    // Si on est en mode mapping, capturer l'input
    if (this.isListening && this.currentMappingAction) {
      const config = {
        device_id: device_id,
        type: type,
        control: control
      };
      
      this.mapping[this.currentMappingAction] = config;
      
      // Si c'est un mapping personnalisé, l'ajouter aussi aux custom mappings
      if (this.currentMappingAction.startsWith('custom_')) {
        this.customMappings[this.currentMappingAction] = config;
      }
      
      // Afficher le succès
      const status = document.getElementById('mappingStatus');
      const statusText = document.getElementById('mappingStatusText');
      if (status && statusText) {
        const actionName = this.currentMappingAction.startsWith('custom_') ? 
          this.availableFunctions.find(f => f.id === this.currentMappingAction.replace('custom_', ''))?.name || this.currentMappingAction :
          this.currentMappingAction.toUpperCase();
        
        statusText.textContent = `✅ ${actionName} mappé à ${this.formatMapping(config)}`;
        status.style.background = '#10b981';
        
        setTimeout(() => {
          if (status) status.style.display = 'none';
        }, 2000);
      }
      
      this.stopMapping();
      this.updateMappingDisplay();
      this.updateMappingModal();
      this.updateActiveMappings();
      console.log(`✅ Mapped ${this.currentMappingAction} to ${device_id}`);
      return;
    }

    // Exécution normale des actions mappées SEULEMENT si le contrôleur est actif
    if (!this.isActive) {
      console.log('🚫 Contrôleur externe inactif - action ignorée');
      return;
    }
    
    // Vérifier que le mode contrôleur est activé
    const isControllerModeActive = window.EnderTrack?.KeyboardMode?.isActive === true;
    
    if (!isControllerModeActive) {
      console.log('🚫 Mode contrôleur non activé dans la navigation - action ignorée');
      return;
    }

    // Exécution normale des actions mappées
    Object.entries(this.mapping).forEach(([action, config]) => {
      if (config.device_id === device_id && 
          config.type === type && 
          config.control === control) {
        
        // Pour les boutons/notes, déclencher sur press (value > 0)
        // Pour les axes/CC, déclencher selon la valeur
        let shouldTrigger = false;
        
        if (type === 'button' || type === 'note') {
          shouldTrigger = value > 0;
        } else if (type === 'cc' || type === 'axis') {
          // Logique spécifique selon l'action
          if (action.includes('Up') || action === 'up' || action === 'right') {
            shouldTrigger = value > 64; // Seuil pour direction positive
          } else if (action.includes('Down') || action === 'down' || action === 'left') {
            shouldTrigger = value < 64; // Seuil pour direction négative
          }
        }
        
        if (shouldTrigger) {
          console.log(`🎮 Executing action: ${action}`);
          this.executeAction(action);
        }
      }
    });
  }
  
  // Garde la compatibilité MIDI pour les périphériques Web MIDI API
  handleMIDIMessage(controllerId, event) {
    const [status, data1, data2] = event.data;
    const messageType = status & 0xF0;
    const channel = status & 0x0F;
    
    // Convertir en format universel
    let inputData = {};
    
    if (messageType === 0xB0) { // Control Change
      inputData = {
        device_id: `midi_${controllerId}`,
        type: 'cc',
        control: data1,
        value: data2
      };
    } else if (messageType === 0x90 && data2 > 0) { // Note On
      inputData = {
        device_id: `midi_${controllerId}`,
        type: 'note',
        control: data1,
        value: data2
      };
    }
    
    if (inputData.type) {
      this.handleUniversalInput(inputData);
    }
  }
  
  // Démarre l'écoute d'un périphérique via le bridge
  startListening(deviceId) {
    if (this.universalBridge && this.universalBridge.readyState === WebSocket.OPEN) {
      this.universalBridge.send(JSON.stringify({
        type: 'start_listening',
        device_id: deviceId
      }));
      console.log(`🎧 Démarrage écoute: ${deviceId}`);
    }
  }
  
  stopListening(deviceId) {
    if (this.universalBridge && this.universalBridge.readyState === WebSocket.OPEN) {
      this.universalBridge.send(JSON.stringify({
        type: 'stop_listening',
        device_id: deviceId
      }));
      console.log(`🛑 Arrêt écoute: ${deviceId}`);
    }
  }

  executeAction(action) {
    const state = window.EnderTrack?.State?.get();
    if (!state || state.historyMode) return;

    const actions = {
      'up': () => window.moveDirection('up'),
      'down': () => window.moveDirection('down'),
      'left': () => window.moveDirection('left'),
      'right': () => window.moveDirection('right'),
      'zUp': () => window.moveDirection('zUp'),
      'zDown': () => window.moveDirection('zDown'),
      'custom_goHome_xy': () => window.goHome('xy'),
      'custom_goHome_xyz': () => window.goHome('xyz'),
      'custom_emergencyStop': () => window.emergencyStop(),
      'custom_toggleInputMode': () => window.setInputMode(state.inputMode === 'relative' ? 'absolute' : 'relative'),
      'custom_toggleCoupling': () => window.toggleCoupling(),
      'custom_clearHistory': () => window.clearHistory(),
      'custom_saveTrack': () => window.saveTrack(),
      'custom_loadTrack': () => window.loadTrack(),
      'custom_setPresetFine': () => { window.setAxisPreset('xy', 'fine'); window.setAxisPreset('z', 'fine'); },
      'custom_setPresetCoarse': () => { window.setAxisPreset('xy', 'coarse'); window.setAxisPreset('z', 'coarse'); }
    };

    if (actions[action]) {
      actions[action]();
    }
  }
}

// Global instance
window.ExternalController = new ExternalController();

// Fonctions globales pour compatibilité
function selectDevice(deviceId) {
  window.ExternalController.selectDevice(deviceId);
}

function refreshDevices() {
  window.ExternalController.refreshDevices();
}

function openMappingModal() {
  window.ExternalController.openMappingModal();
}

function closeMappingModal() {
  window.ExternalController.closeMappingModal();
}

function startMapping(action) {
  window.ExternalController.startMapping(action);
}

function saveMappingConfig() {
  window.ExternalController.saveMappingConfig();
}

function loadMappingConfig() {
  window.ExternalController.loadMappingConfig();
}

function clearMappingConfig() {
  window.ExternalController.clearMappingConfig();
}

function loadPresetMapping() {
  window.ExternalController.loadAkaiPreset();
}