// Module Lists - Gestion des listes de positions
class ListsModule {
  constructor() {
    this.name = 'lists';
    this.isActive = false;
    this.lists = new Map();
    this.currentList = null;
    this.ui = null;
    this.currentMode = 'click';
    this.previewPositions = [];
    this.listColors = ['#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#84CC16', '#F97316'];
    this.canvasClickHandler = null;
  }

  async init() {
    console.log('📋 Initializing Lists Module...');
    this.createUI();
    this.loadLists();
    console.log('✅ Lists Module initialized');
    return true;
  }

  async activate() {
    this.isActive = true;
    this.setupCanvasClick();
    setTimeout(() => this.showUI(), 100);
    return true;
  }

  deactivate() {
    this.isActive = false;
    this.removeCanvasClick();
    this.hideUI();
    
    // Check if any list has locked preview
    const hasLockedPreview = Array.from(this.lists.values()).some(list => list.lockPreview);
    if (hasLockedPreview) {
      console.log('[Lists] Preview locked, keeping overlays visible');
      return;
    }
    
    // Trigger canvas re-render to hide list overlays
    if (window.EnderTrack?.Canvas?.requestRender) {
      window.EnderTrack.Canvas.requestRender();
    }
  }

  setupCanvasClick() {
    const canvas = document.getElementById('mapCanvas');
    if (canvas) {
      this.canvasClickHandler = (event) => {
        if (this.isActive && this.currentMode === 'click' && this.currentList) {
          const rect = canvas.getBoundingClientRect();
          const canvasX = event.clientX - rect.left;
          const canvasY = event.clientY - rect.top;
          
          // Use same coordinate conversion as interactions.js
          const state = window.EnderTrack.State.get();
          const centerX = canvas.width / 2;
          const centerY = canvas.height / 2;
          const zoom = state.zoom || 1;
          const panX = state.panX || 0;
          const panY = state.panY || 0;
          
          const mapX = (canvasX - centerX - panX) / zoom;
          const mapY = (canvasY - centerY - panY) / zoom;
          
          // Check if within plateau bounds
          const plateauDimensions = state.plateauDimensions || { x: 200, y: 200, z: 100 };
          const halfX = plateauDimensions.x / 2;
          const halfY = plateauDimensions.y / 2;
          const isOnPlateau = Math.abs(mapX) <= halfX && Math.abs(mapY) <= halfY;
          
          if (isOnPlateau) {
            this.addPosition(mapX, mapY, 0, `Clic ${this.currentList.positions.length + 1}`);
            // Trigger canvas re-render to show new position
            if (window.EnderTrack?.Canvas?.requestRender) {
              window.EnderTrack.Canvas.requestRender();
            }
          }
        }
      };
      canvas.addEventListener('click', this.canvasClickHandler);
    }
  }

  removeCanvasClick() {
    const canvas = document.getElementById('mapCanvas');
    if (canvas && this.canvasClickHandler) {
      canvas.removeEventListener('click', this.canvasClickHandler);
      this.canvasClickHandler = null;
    }
  }

  getListColor(listId) {
    const index = Array.from(this.lists.keys()).indexOf(listId);
    return this.listColors[index % this.listColors.length];
  }

  getAllListsPositions() {
    const allPositions = [];
    this.lists.forEach((list, listId) => {
      const color = list.color || this.getListColor(listId);
      list.positions.forEach((pos, index) => {
        allPositions.push({ ...pos, listId, color, positionNumber: index + 1 });
      });
    });
    return allPositions;
  }
  
  // Check if Lists overlays should be shown
  shouldShowOverlays() {
    return this.isActive || Array.from(this.lists.values()).some(list => list.lockPreview);
  }
  
  // Toggle lock preview for current list
  toggleLockPreview(isLocked) {
    if (!this.currentList) return;
    
    this.currentList.lockPreview = isLocked;
    console.log(`[Lists] Preview lock for "${this.currentList.name}": ${isLocked ? 'ON' : 'OFF'}`);
    
    this.saveLists();
    
    // If unlocking and Lists module is inactive, check if we should hide overlays
    if (!isLocked && !this.isActive) {
      const hasAnyLocked = Array.from(this.lists.values()).some(list => list.lockPreview);
      if (!hasAnyLocked && window.EnderTrack?.Canvas?.requestRender) {
        window.EnderTrack.Canvas.requestRender();
      }
    }
  }

  showListSettings() {
    if (!this.currentList) {
      alert('Veuillez sélectionner une liste');
      return;
    }

    const modal = document.createElement('div');
    modal.className = 'edit-modal-overlay';
    modal.innerHTML = `
      <div class="edit-modal">
        <div class="edit-modal-header">
          <h3>⚙️ Paramètres de la liste</h3>
          <button class="close-btn">×</button>
        </div>
        <div class="edit-modal-body">
          <div class="edit-field">
            <label>Nom de la liste:</label>
            <input type="text" id="list-name" value="${this.currentList.name}">
          </div>
          <div class="edit-field">
            <label>Couleur:</label>
            <div class="color-picker">
              ${this.listColors.map(color => `
                <div class="color-option ${(this.currentList.color || this.getListColor(this.currentList.id)) === color ? 'selected' : ''}" 
                     style="background: ${color}" 
                     onclick="EnderTrack.Lists.selectColor('${color}')"></div>
              `).join('')}
            </div>
            <div class="custom-color-row">
              <label>Couleur personnalisée:</label>
              <input type="color" id="custom-color" value="${this.currentList.color || this.getListColor(this.currentList.id)}" onchange="EnderTrack.Lists.selectCustomColor(this.value)">
            </div>
          </div>
          <div class="edit-field">
            <label class="checkbox-label">
              <input type="checkbox" id="lock-preview" ${this.currentList.lockPreview ? 'checked' : ''} onchange="EnderTrack.Lists.toggleLockPreview(this.checked)">
              <span class="checkmark"></span>
              Verrouiller aperçu
            </label>
          </div>
        </div>
        <div class="edit-modal-footer">
          <button class="btn-secondary" onclick="EnderTrack.Lists.loadListFromSettings()">📁 Charger</button>
          <button class="btn-danger" onclick="EnderTrack.Lists.deleteListFromSettings()">🗑️ Supprimer</button>
          <button class="btn-cancel">Annuler</button>
          <button class="btn-save">💾 Sauvegarder</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.querySelector('#list-name').focus();
    modal.querySelector('#list-name').select();
    
    const closeModal = () => {
      document.body.removeChild(modal);
    };
    
    const saveChanges = () => {
      const newName = modal.querySelector('#list-name').value.trim();
      const selectedColor = modal.querySelector('.color-option.selected');
      const customColor = modal.querySelector('#custom-color').value;
      
      if (newName) {
        this.currentList.name = newName;
      }
      
      // Use custom color if no preset is selected, or if custom color was changed
      if (this.selectedCustomColor) {
        this.currentList.color = this.selectedCustomColor;
      } else if (selectedColor) {
        this.currentList.color = selectedColor.style.background;
      } else {
        this.currentList.color = customColor;
      }
      
      this.updateListSelector();
      this.saveLists();
      
      // Trigger canvas re-render to show new color
      if (window.EnderTrack?.Canvas?.requestRender) {
        window.EnderTrack.Canvas.requestRender();
      }
      
      closeModal();
    };
    
    modal.querySelector('.close-btn').addEventListener('click', closeModal);
    modal.querySelector('.btn-cancel').addEventListener('click', closeModal);
    modal.querySelector('.btn-save').addEventListener('click', saveChanges);
    
    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
      if (e.key === 'Enter') saveChanges();
    });
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }

  selectColor(color) {
    document.querySelectorAll('.color-option').forEach(option => {
      option.classList.remove('selected');
    });
    const colorOption = document.querySelector(`[style*="${color}"]`);
    if (colorOption) {
      colorOption.classList.add('selected');
    }
    // Update custom color picker
    const customColorPicker = document.getElementById('custom-color');
    if (customColorPicker) {
      customColorPicker.value = color;
    }
  }

  selectCustomColor(color) {
    // Remove selection from preset colors
    document.querySelectorAll('.color-option').forEach(option => {
      option.classList.remove('selected');
    });
    // Store the custom color for saving
    this.selectedCustomColor = color;
  }

  loadListFromSettings() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          if (data.lists) {
            // Merge with existing lists
            const importedLists = new Map(data.lists);
            importedLists.forEach((list, id) => {
              // Generate new ID to avoid conflicts
              const newId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
              list.id = newId;
              this.lists.set(newId, list);
            });
            
            this.updateListSelector();
            this.saveLists();
            
            // Close modal
            const modal = document.querySelector('.edit-modal-overlay');
            if (modal) modal.remove();
            
            console.log('📁 Listes chargées avec succès');
          }
        } catch (error) {
          alert('Erreur lors du chargement du fichier');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  deleteListFromSettings() {
    if (confirm(`Supprimer la liste "${this.currentList.name}" ?\n\nCette action est irréversible.`)) {
      this.lists.delete(this.currentList.id);
      this.currentList = null;
      this.updateListSelector();
      this.updatePositionsDisplay();
      this.saveLists();
      
      // Close modal
      const modal = document.querySelector('.edit-modal-overlay');
      if (modal) modal.remove();
      
      // Trigger canvas re-render
      if (window.EnderTrack?.Canvas?.requestRender) {
        window.EnderTrack.Canvas.requestRender();
      }
    }
  }

  getPreviewPositions() {
    return this.previewPositions.map(pos => ({ ...pos, color: 'rgba(255, 255, 255, 0.5)' }));
  }

  createUI() {
    this.ui = document.createElement('div');
    this.ui.id = 'lists-panel';
    this.ui.className = 'module-panel';
    this.ui.innerHTML = `
      <div class="module-header">
        <h3>📋 Listes</h3>
        <div class="header-actions">
          <button id="save-btn" class="btn-icon" title="Sauvegarder">💾</button>
          <button id="load-btn" class="btn-icon" title="Charger">📁</button>
          <button id="reset-btn" class="btn-icon" title="Reset">🔄</button>
          <button id="new-list-btn" class="btn-primary">➕ Nouvelle</button>
        </div>
      </div>
      
      <div class="lists-container">
        <div class="list-selector-group">
          <div class="list-selector-row">
            <select id="list-selector" class="form-control">
            </select>
            <button id="list-settings-btn" class="btn-icon" title="Paramètres de la liste">⚙️</button>
          </div>
        </div>
        
        <div class="add-modes">
          <div class="mode-toggle">
            <button id="mode-click" class="mode-btn active">📍 Clic</button>
            <button id="mode-xyz" class="mode-btn">XYZ</button>
            <button id="mode-auto" class="mode-btn">🌀 Auto</button>
          </div>
          
          <div id="interface-click" class="mode-interface active">
            <button id="add-current-btn" class="btn-add">📍 Ajouter Position Actuelle</button>
          </div>
          
          <div id="interface-xyz" class="mode-interface">
            <div class="xyz-inputs">
              <input type="number" id="manual-x" placeholder="X" step="0.1">
              <input type="number" id="manual-y" placeholder="Y" step="0.1">
              <input type="number" id="manual-z" placeholder="Z" step="0.1">
              <button id="add-manual-btn" class="btn-add">➕ Ajouter</button>
            </div>
          </div>
          
          <div id="interface-auto" class="mode-interface">
            <div class="auto-controls">
              <div class="auto-row">
                <input type="number" id="pattern-cols" value="3" min="1" max="20" placeholder="Cols">
                <input type="number" id="pattern-rows" value="3" min="1" max="20" placeholder="Rows">
                <input type="number" id="pattern-stepx" value="5" step="0.1" placeholder="Pas X">
                <input type="number" id="pattern-stepy" value="5" step="0.1" placeholder="Pas Y">
              </div>
              <div class="auto-row">
                <select id="pattern-type">
                  <option value="grid">Grille</option>
                  <option value="snake">Serpent</option>
                  <option value="spiral">Spirale</option>
                  <option value="random">Aléatoire</option>
                </select>
                <button id="add-pattern-btn" class="btn-add">🌀 Générer</button>
              </div>
            </div>
          </div>
        </div>
        
        <div class="list-actions">
          <button id="execute-list-btn" class="btn-success">🎯 Visiter tous</button>
        </div>
        
        <div class="positions-section">
          <h4>Positions (<span id="position-count">0</span>)</h4>
          <div id="positions-list" class="positions-container">
            <div class="text-muted">Aucune position dans cette liste</div>
          </div>
        </div>
      </div>
    `;
    this.setupEventListeners();
  }

  setupEventListeners() {
    this.ui.querySelector('#new-list-btn').addEventListener('click', () => this.createNewList());
    this.ui.querySelector('#list-selector').addEventListener('change', (e) => this.selectList(e.target.value));
    this.ui.querySelector('#list-settings-btn').addEventListener('click', () => this.showListSettings());
    this.ui.querySelector('#execute-list-btn').addEventListener('click', () => this.executeList());
    
    this.ui.querySelector('#save-btn').addEventListener('click', () => this.exportLists());
    this.ui.querySelector('#load-btn').addEventListener('click', () => this.importLists());
    this.ui.querySelector('#reset-btn').addEventListener('click', () => this.resetLists());
    
    this.ui.querySelector('#mode-click').addEventListener('click', () => this.switchMode('click'));
    this.ui.querySelector('#mode-xyz').addEventListener('click', () => this.switchMode('xyz'));
    this.ui.querySelector('#mode-auto').addEventListener('click', () => this.switchMode('auto'));
    
    this.ui.querySelector('#add-current-btn').addEventListener('click', () => this.addCurrentPosition());
    this.ui.querySelector('#add-manual-btn').addEventListener('click', () => this.addManualPosition());
    this.ui.querySelector('#add-pattern-btn').addEventListener('click', () => this.addPatternPositions());
    
    ['#manual-x', '#manual-y', '#manual-z'].forEach(selector => {
      this.ui.querySelector(selector).addEventListener('input', () => {
        if (this.currentMode === 'xyz') this.updatePreview();
      });
    });
    
    ['#pattern-cols', '#pattern-rows', '#pattern-stepx', '#pattern-stepy', '#pattern-type'].forEach(selector => {
      this.ui.querySelector(selector).addEventListener('input', () => {
        if (this.currentMode === 'auto') this.updatePreview();
      });
    });
    
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.position-menu')) {
        document.querySelectorAll('.menu-dropdown').forEach(menu => {
          menu.classList.remove('show');
        });
      }
    });
  }

  showUI() {
    const listsPanel = document.getElementById('listsTabContent');
    if (listsPanel) {
      listsPanel.innerHTML = '';
      listsPanel.appendChild(this.ui);
      console.log('📋 Interface Lists affichée');
    }
  }

  hideUI() {
    if (this.ui && this.ui.parentNode) {
      this.ui.parentNode.removeChild(this.ui);
    }
  }

  createNewList() {
    const name = prompt('Nom de la nouvelle liste:');
    if (!name) return;

    const listId = Date.now().toString();
    const newList = {
      id: listId,
      name: name,
      positions: [],
      created: new Date().toISOString(),
      color: this.getListColor(listId),
      lockPreview: false
    };

    this.lists.set(listId, newList);
    this.updateListSelector();
    this.selectList(listId);
    this.saveLists();
  }

  selectList(listId) {
    if (!listId) {
      this.currentList = null;
      this.updatePositionsDisplay();
      // Trigger canvas re-render to hide overlays
      if (window.EnderTrack?.Canvas?.requestRender) {
        window.EnderTrack.Canvas.requestRender();
      }
      return;
    }
    this.currentList = this.lists.get(listId);
    this.updatePositionsDisplay();
    
    // Trigger canvas re-render to show new list overlays
    if (window.EnderTrack?.Canvas?.requestRender) {
      window.EnderTrack.Canvas.requestRender();
    }
  }

  addCurrentPosition() {
    if (!this.currentList) {
      alert('Veuillez sélectionner une liste');
      return;
    }
    const state = EnderTrack.State?.get?.() || {};
    const pos = state.pos || { x: 0, y: 0, z: 0 };
    this.addPosition(pos.x, pos.y, pos.z, `Position ${this.currentList.positions.length + 1}`);
  }

  addManualPosition() {
    if (!this.currentList) {
      alert('Veuillez sélectionner une liste');
      return;
    }
    const x = parseFloat(this.ui.querySelector('#manual-x').value) || 0;
    const y = parseFloat(this.ui.querySelector('#manual-y').value) || 0;
    const z = parseFloat(this.ui.querySelector('#manual-z').value) || 0;
    
    this.addPosition(x, y, z, `Manuel ${this.currentList.positions.length + 1}`);
    
    this.ui.querySelector('#manual-x').value = '';
    this.ui.querySelector('#manual-y').value = '';
    this.ui.querySelector('#manual-z').value = '';
  }

  addPatternPositions() {
    if (!this.currentList) {
      alert('Veuillez sélectionner une liste');
      return;
    }
    const cols = parseInt(this.ui.querySelector('#pattern-cols').value) || 3;
    const rows = parseInt(this.ui.querySelector('#pattern-rows').value) || 3;
    const stepX = parseFloat(this.ui.querySelector('#pattern-stepx').value) || 5;
    const stepY = parseFloat(this.ui.querySelector('#pattern-stepy').value) || 5;
    const type = this.ui.querySelector('#pattern-type').value;
    
    const positions = this.generatePattern(cols, rows, stepX, stepY, type);
    
    positions.forEach((pos, index) => {
      this.addPosition(pos.x, pos.y, 0, `${type.charAt(0).toUpperCase() + type.slice(1)} ${index + 1}`);
    });
  }

  switchMode(mode) {
    this.ui.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
    this.ui.querySelectorAll('.mode-interface').forEach(iface => iface.classList.remove('active'));
    
    this.ui.querySelector(`#mode-${mode}`).classList.add('active');
    this.ui.querySelector(`#interface-${mode}`).classList.add('active');
    
    this.currentMode = mode;
    if (mode === 'click') {
      this.clearPreview();
    } else {
      this.updatePreview();
    }
  }

  addPosition(x, y, z, name) {
    const position = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      x: x,
      y: y,
      z: z,
      name: name,
      timestamp: new Date().toISOString()
    };

    this.currentList.positions.push(position);
    this.updatePositionsDisplay();
    this.saveLists();
  }

  executeList() {
    if (!this.currentList || this.currentList.positions.length === 0) {
      alert('Aucune position à exécuter');
      return;
    }
    this.executeSequence(this.currentList.positions, 0);
  }

  async executeSequence(positions, index) {
    if (index >= positions.length) {
      console.log('✅ Exécution de la liste terminée');
      return;
    }

    const position = positions[index];
    console.log(`🎯 Déplacement vers: ${position.name} (${position.x}, ${position.y}, ${position.z})`);

    if (EnderTrack.State?.update) {
      EnderTrack.State.update({
        pos: { x: position.x, y: position.y, z: position.z }
      });
    }

    setTimeout(() => {
      this.executeSequence(positions, index + 1);
    }, 1000);
  }

  deleteCurrentList() {
    if (!this.currentList) return;

    if (confirm(`Supprimer la liste "${this.currentList.name}" ?`)) {
      this.lists.delete(this.currentList.id);
      this.currentList = null;
      this.updateListSelector();
      this.updatePositionsDisplay();
      this.saveLists();
    }
  }

  updateListSelector() {
    const selector = this.ui.querySelector('#list-selector');
    selector.innerHTML = '';

    this.lists.forEach(list => {
      const option = document.createElement('option');
      option.value = list.id;
      option.textContent = `${list.name} (${list.positions.length})`;
      selector.appendChild(option);
    });
  }

  updatePositionsDisplay() {
    const container = this.ui.querySelector('#positions-list');
    const countElement = this.ui.querySelector('#position-count');
    
    if (!this.currentList) {
      container.innerHTML = '<div class="text-muted">Aucune liste sélectionnée</div>';
      if (countElement) countElement.textContent = '0';
      return;
    }

    const count = this.currentList.positions.length;
    if (countElement) countElement.textContent = count;

    if (count === 0) {
      container.innerHTML = '<div class="text-muted">Aucune position dans cette liste</div>';
      return;
    }

    container.innerHTML = this.currentList.positions.map((pos, index) => `
      <div class="position-item">
        <span class="position-index">${index + 1}</span>
        <span class="position-name">${pos.name}</span>
        <span class="position-coords">X:${pos.x.toFixed(1)} Y:${pos.y.toFixed(1)} Z:${pos.z.toFixed(1)}</span>
        <div class="position-actions">
          <div class="position-menu" data-position-id="${pos.id}">
            <button class="btn-menu" onclick="EnderTrack.Lists.toggleMenu('${pos.id}')" title="Actions">⚙️</button>
            <div class="menu-dropdown" id="menu-${pos.id}">
              <button class="menu-item" onclick="EnderTrack.Lists.goToPosition('${pos.id}')">🎯 Aller</button>
              <button class="menu-item" onclick="EnderTrack.Lists.editPosition('${pos.id}')">✏️ Éditer</button>
              <button class="menu-item menu-danger" onclick="EnderTrack.Lists.confirmRemovePosition('${pos.id}')">🗑️ Supprimer</button>
            </div>
          </div>
        </div>
      </div>
    `).join('');
  }

  toggleMenu(positionId) {
    document.querySelectorAll('.menu-dropdown').forEach(menu => {
      if (menu.id !== `menu-${positionId}`) {
        menu.classList.remove('show');
      }
    });
    
    const menu = document.getElementById(`menu-${positionId}`);
    if (menu) {
      menu.classList.toggle('show');
    }
  }

  confirmRemovePosition(positionId) {
    if (!this.currentList) return;
    
    const position = this.currentList.positions.find(p => p.id === positionId);
    if (!position) return;
    
    const menu = document.getElementById(`menu-${positionId}`);
    if (menu) menu.classList.remove('show');
    
    if (confirm(`Supprimer la position "${position.name}" ?\n\nCette action est irréversible.`)) {
      this.removePosition(positionId);
    }
  }

  removePosition(positionId) {
    if (!this.currentList) return;
    this.currentList.positions = this.currentList.positions.filter(p => p.id !== positionId);
    this.updatePositionsDisplay();
    this.saveLists();
  }

  goToPosition(positionId) {
    if (!this.currentList) return;
    
    const position = this.currentList.positions.find(p => p.id === positionId);
    if (!position) return;
    
    const menu = document.getElementById(`menu-${positionId}`);
    if (menu) menu.classList.remove('show');
    
    if (EnderTrack.State?.update) {
      EnderTrack.State.update({
        pos: { x: position.x, y: position.y, z: position.z }
      });
    }
    
    console.log(`🎯 Déplacement vers: ${position.name} (${position.x}, ${position.y}, ${position.z})`);
  }

  updatePreview() {
    if (this.currentMode === 'click') {
      this.clearPreview();
      return;
    }

    this.previewPositions = [];

    if (this.currentMode === 'xyz') {
      const x = parseFloat(this.ui.querySelector('#manual-x').value) || 0;
      const y = parseFloat(this.ui.querySelector('#manual-y').value) || 0;
      const z = parseFloat(this.ui.querySelector('#manual-z').value) || 0;
      
      if (x !== 0 || y !== 0 || z !== 0) {
        this.previewPositions.push({ x, y, z, type: 'single' });
      }
    } else if (this.currentMode === 'auto') {
      const cols = parseInt(this.ui.querySelector('#pattern-cols').value) || 3;
      const rows = parseInt(this.ui.querySelector('#pattern-rows').value) || 3;
      const stepX = parseFloat(this.ui.querySelector('#pattern-stepx').value) || 5;
      const stepY = parseFloat(this.ui.querySelector('#pattern-stepy').value) || 5;
      const type = this.ui.querySelector('#pattern-type').value;
      
      const positions = this.generatePattern(cols, rows, stepX, stepY, type);
      this.previewPositions = positions.map(pos => ({ ...pos, z: 0, type: 'pattern' }));
    }

    this.drawPreview();
  }

  drawPreview() {
    this.clearPreview();
    if (this.previewPositions.length === 0) return;

    if (EnderTrack.Canvas && EnderTrack.Canvas.drawPreview) {
      EnderTrack.Canvas.drawPreview(this.previewPositions);
    } else if (EnderTrack.State && EnderTrack.State.triggerRender) {
      EnderTrack.State.triggerRender();
    }
  }

  clearPreview() {
    this.previewPositions = [];
    if (EnderTrack.Canvas && EnderTrack.Canvas.clearPreview) {
      EnderTrack.Canvas.clearPreview();
    } else if (EnderTrack.State && EnderTrack.State.triggerRender) {
      EnderTrack.State.triggerRender();
    }
  }

  getPreviewPositions() {
    return this.previewPositions || [];
  }

  saveLists() {
    const data = Array.from(this.lists.entries());
    localStorage.setItem('endertrack_lists', JSON.stringify(data));
  }

  loadLists() {
    try {
      const data = localStorage.getItem('endertrack_lists');
      if (data) {
        const entries = JSON.parse(data);
        this.lists = new Map(entries);
      }
    } catch (error) {
      console.warn('Erreur lors du chargement des listes:', error);
    }
    
    // Créer Liste 0 par défaut si aucune liste
    if (this.lists.size === 0) {
      const defaultList = {
        id: '0',
        name: 'Liste 0',
        positions: [],
        created: new Date().toISOString(),
        color: this.listColors[0],
        lockPreview: false
      };
      this.lists.set('0', defaultList);
      this.saveLists();
    }
    
    this.updateListSelector();
    
    // Sélectionner la première liste par défaut
    const firstListId = this.lists.keys().next().value;
    if (firstListId) {
      this.selectList(firstListId);
      const selector = this.ui.querySelector('#list-selector');
      if (selector) selector.value = firstListId;
    }
  }

  generatePattern(cols, rows, stepX, stepY, type) {
    const positions = [];
    
    switch (type) {
      case 'grid':
        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < cols; col++) {
            positions.push({ x: col * stepX, y: row * stepY });
          }
        }
        break;
        
      case 'snake':
        for (let row = 0; row < rows; row++) {
          if (row % 2 === 0) {
            for (let col = 0; col < cols; col++) {
              positions.push({ x: col * stepX, y: row * stepY });
            }
          } else {
            for (let col = cols - 1; col >= 0; col--) {
              positions.push({ x: col * stepX, y: row * stepY });
            }
          }
        }
        break;
        
      case 'spiral':
        const centerX = (cols - 1) * stepX / 2;
        const centerY = (rows - 1) * stepY / 2;
        const maxRadius = Math.max(cols, rows) / 2;
        
        for (let r = 0; r < maxRadius; r++) {
          const points = Math.max(1, Math.floor(2 * Math.PI * r));
          for (let i = 0; i < points; i++) {
            const angle = (2 * Math.PI * i) / points;
            const x = centerX + r * stepX * Math.cos(angle);
            const y = centerY + r * stepY * Math.sin(angle);
            if (positions.length < cols * rows) {
              positions.push({ x, y });
            }
          }
        }
        break;
        
      case 'random':
        for (let i = 0; i < cols * rows; i++) {
          positions.push({
            x: Math.random() * (cols - 1) * stepX,
            y: Math.random() * (rows - 1) * stepY
          });
        }
        break;
    }
    
    return positions;
  }

  exportLists() {
    const data = {
      lists: Array.from(this.lists.entries()),
      exported: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `endertrack-lists-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  importLists() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          if (data.lists) {
            this.lists = new Map(data.lists);
            this.updateListSelector();
            this.saveLists();
            console.log('📎 Listes importées avec succès');
          }
        } catch (error) {
          alert('Erreur lors de l\'importation du fichier');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  resetLists() {
    if (confirm('Supprimer toutes les listes ? Cette action est irréversible.')) {
      this.lists.clear();
      this.currentList = null;
      this.updateListSelector();
      this.updatePositionsDisplay();
      localStorage.removeItem('endertrack_lists');
      console.log('🔄 Listes réinitialisées');
    }
  }

  editPosition(positionId) {
    if (!this.currentList) return;
    
    const position = this.currentList.positions.find(p => p.id === positionId);
    if (!position) return;
    
    const menu = document.getElementById(`menu-${positionId}`);
    if (menu) menu.classList.remove('show');
    
    this.showEditModal(position);
  }

  showEditModal(position) {
    const modal = document.createElement('div');
    modal.className = 'edit-modal-overlay';
    modal.innerHTML = `
      <div class="edit-modal">
        <div class="edit-modal-header">
          <h3>✏️ Éditer Position</h3>
          <button class="close-btn">×</button>
        </div>
        <div class="edit-modal-body">
          <div class="edit-field">
            <label>Nom:</label>
            <input type="text" id="edit-name" value="${position.name}">
          </div>
          <div class="edit-field">
            <label>X (mm):</label>
            <input type="number" id="edit-x" value="${position.x}" step="0.1">
          </div>
          <div class="edit-field">
            <label>Y (mm):</label>
            <input type="number" id="edit-y" value="${position.y}" step="0.1">
          </div>
          <div class="edit-field">
            <label>Z (mm):</label>
            <input type="number" id="edit-z" value="${position.z}" step="0.1">
          </div>
        </div>
        <div class="edit-modal-footer">
          <button class="btn-cancel">Annuler</button>
          <button class="btn-save">💾 Sauvegarder</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.querySelector('#edit-name').focus();
    modal.querySelector('#edit-name').select();
    
    const closeModal = () => {
      document.body.removeChild(modal);
    };
    
    const saveChanges = () => {
      const newName = modal.querySelector('#edit-name').value.trim();
      const newX = parseFloat(modal.querySelector('#edit-x').value) || 0;
      const newY = parseFloat(modal.querySelector('#edit-y').value) || 0;
      const newZ = parseFloat(modal.querySelector('#edit-z').value) || 0;
      
      position.name = newName || position.name;
      position.x = newX;
      position.y = newY;
      position.z = newZ;
      
      this.updatePositionsDisplay();
      this.saveLists();
      closeModal();
    };
    
    modal.querySelector('.close-btn').addEventListener('click', closeModal);
    modal.querySelector('.btn-cancel').addEventListener('click', closeModal);
    modal.querySelector('.btn-save').addEventListener('click', saveChanges);
    
    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
      if (e.key === 'Enter') saveChanges();
    });
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }
}

window.EnderTrack = window.EnderTrack || {};
window.EnderTrack.Lists = new ListsModule();