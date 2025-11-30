// modules/state/state.js - Central state management
// Pure state management with no UI dependencies

class StateManager {
  constructor() {
    this.state = this.getDefaultState();
    this.listeners = new Map();
    this.history = [];
    this.maxHistorySize = 1000;
  }

  getDefaultState() {
    return {
      // Map configuration
      mapSizeMm: 200, // Kept for backward compatibility
      plateauDimensions: { x: 200, y: 200, z: 100 },
      canvasPx: { w: 600, h: 600 },
      
      // Position tracking
      pos: { x: 0, y: 0, z: 0 },
      track: [],
      continuousTrack: [], // Track pour le mode continu (couleur différente)
      positionHistory: [],
      positionHistoryXY: [], // XY-only history (unique XY positions)
      historyIndex: -1, // Current position in history (-1 = live position)
      historyMode: false, // When true, freeze history recording
      historyViewMode: 'XYZ', // 'XY' or 'XYZ' - which history to display
      
      // UI modes
      clickMode: 'navigate',
      inputMode: 'relative', // Default to relative mode
      leftPanelMode: 'navigation',
      
      // Display options
      showNavigationTrack: true,
      showTargetPreview: true,
      showZVisualization: true,
      
      // Axis controls
      lockXY: true,  // XY coupled by default
      lockX: false,
      lockY: false,
      lockZ: true,   // Z locked by default
      lockHomeXY: false,  // Home XY unlocked by default
      lockHomeXYZ: false, // Home XYZ unlocked by default
      
      // Interaction settings
      enableClickGo: false,
      enableMapInteraction: true,
      
      // Visual settings
      colors: {
        mapBackground: '#2d3748',
        gridColor: '#4a5568',
        positionColor: '#0b84ff',
        trackColor: '#10b981'
      },
      
      // Control ranges
      sliderMin: 0.01,
      sliderMax: 50,
      
      // Movement presets
      stepPresets: {
        fine: 0.1,
        coarse: 5
      },
      
      // Sensitivity defaults
      sensitivityX: 1.0,
      sensitivityY: 1.0,
      sensitivityZ: 0.5,
      
      // Home positions
      homePositions: {
        xyz: { x: 0, y: 0, z: 0 },
        xy: { x: 0, y: 0 }
      },
      
      // UI button visibility
      showButtons: {
        homeXYZ: false,
        homeXY: true,
        presetButtons: true,
        resetTrack: true
      },
      
      // Movement settings
      xyzSameStep: false,
      isMoving: false,
      moveSpeed: 50,
      animationId: null,
      
      // Sequence control
      sequenceQueue: [],
      sequenceIndex: 0,
      
      // Tab management
      activeTab: 'navigation',
      availableTabs: ['navigation', 'settings'],
      pluginTabs: [],
      
      // Map interaction
      panX: 0,
      panY: 0,
      zoom: 1,
      zZoom: 1,
      isDragging: false,
      lastMouseX: 0,
      lastMouseY: 0,
      
      // Grid and template interaction
      gridOffsetX: 0,
      gridOffsetY: 0,
      isDraggingGrid: false,
      wasPanning: false,
      selectedTemplateIndex: -1,
      
      // Keyboard controls
      keyboardShortcuts: {
        up: 'ArrowUp',
        down: 'ArrowDown',
        left: 'ArrowLeft',
        right: 'ArrowRight',
        zUp: 'PageUp',
        zDown: 'PageDown'
      },
      
      // AI integration
      aiAgent: {
        serverUrl: 'http://localhost:3002',
        isConnected: false,
        isProcessing: false,
        lastCommand: null
      },
      
      // Voice integration
      voice: {
        serviceUrl: 'http://localhost:3001',
        isRecording: false,
        isEnabled: true,
        language: 'fr-FR'
      },
      
      // Theme
      theme: 'dark',
      
      // Snake mode for continuous track
      enableSnakeMode: true,
      maxContinuousTrackPoints: 2000
    };
  }

  async init() {
    // Load saved state if available
    await this.loadState();
    
    // Apply theme
    this.applyTheme(this.state.theme);
    
    // Setup auto-save
    this.setupAutoSave();
    
    return true;
  }

  // Get current state (read-only)
  get() {
    return { ...this.state };
  }

  // Update state and notify listeners
  update(changes) {
    const oldState = { ...this.state };
    
    // Apply changes
    this.state = { ...this.state, ...changes };
    
    // Position changes are now only recorded when explicitly marked as final
    // This prevents intermediate movement points from cluttering the history
    
    // Notify listeners
    this.notifyListeners('state:changed', this.state, oldState);
    
    // Update live displays
    this.updateLiveDisplays(this.state);
    
    // Update navigation controls state based on history mode
    this.updateNavigationControlsState(this.state);
    
    // Force immediate render for real-time feedback
    this.requestCanvasRender();
    if (window.EnderTrack?.ZVisualization?.render) {
      window.EnderTrack.ZVisualization.render();
    }
    
    // Auto-save if significant changes
    if (this.isSignificantChange(changes)) {
      this.saveState();
    }
  }

  // Set specific property
  set(key, value) {
    this.update({ [key]: value });
  }

  // Get specific property
  getProperty(key) {
    return this.state[key];
  }

  // Record position in history
  recordPosition(pos, isFinalPosition = false) {
    const timestamp = Date.now();
    const entry = {
      timestamp,
      x: Number(pos.x.toFixed(3)),
      y: Number(pos.y.toFixed(3)),
      z: Number(pos.z.toFixed(3)),
      isFinalPosition
    };
    
    // Only add to history if it's a final position or first entry
    if (isFinalPosition || this.state.positionHistory.length === 0) {
      this.state.positionHistory.push(entry);
      
      // Limit history size
      if (this.state.positionHistory.length > this.maxHistorySize) {
        this.state.positionHistory.shift();
      }
    }
    
    // Only add to track if it's a final position and significantly different
    if (isFinalPosition) {
      const lastTrackPoint = this.state.track[this.state.track.length - 1];
      if (!lastTrackPoint || 
          Math.abs(lastTrackPoint.x - pos.x) > 0.01 || 
          Math.abs(lastTrackPoint.y - pos.y) > 0.01 || 
          Math.abs(lastTrackPoint.z - pos.z) > 0.01) {
        
        this.state.track.push({ x: pos.x, y: pos.y, z: pos.z });
        
        // Limit track points
        if (this.state.track.length > 1000) {
          this.state.track.shift();
        }
      }
    }
  }

  // Mark final position when movement completes
  recordFinalPosition(pos) {
    // Only record if not in history mode
    if (!this.state.historyMode) {
      this.recordPosition(pos, true);
      this.recordXYPosition(pos);
      // Reset to live position when new position is recorded
      this.state.historyIndex = -1;
    }
    
    // Force immediate update of all displays
    this.updateLiveDisplays(this.state);
    this.requestCanvasRender();
    if (window.EnderTrack?.ZVisualization?.render) {
      window.EnderTrack.ZVisualization.render();
    }
  }

  // Toggle history mode
  toggleHistoryMode() {
    const newMode = !this.state.historyMode;
    this.update({ 
      historyMode: newMode,
      historyIndex: newMode ? (this.state.positionHistory.filter(p => p.isFinalPosition).length - 1) : -1
    });
    
    console.log('History mode:', newMode ? 'ON (frozen)' : 'OFF (live)');
  }
  
  // Go to specific history position by index
  async goToHistoryPosition(index) {
    const currentHistory = this.getCurrentHistory();
    if (index < 0 || index >= currentHistory.length) return;
    
    const targetPos = currentHistory[index];
    
    // Use movement system to physically move to position
    if (window.EnderTrack?.Movement) {
      if (this.state.historyViewMode === 'XY') {
        // XY mode: go to XY position but keep current Z
        await EnderTrack.Movement.moveAbsolute(targetPos.x, targetPos.y, this.state.pos.z);
      } else {
        // XYZ mode: go to full XYZ position
        await EnderTrack.Movement.moveAbsolute(targetPos.x, targetPos.y, targetPos.z);
      }
    }
    
    this.update({ historyIndex: index });
  }

  // Record XY-only position (unique XY positions)
  recordXYPosition(pos) {
    const timestamp = Date.now();
    const entry = {
      timestamp,
      x: Number(pos.x.toFixed(3)),
      y: Number(pos.y.toFixed(3)),
      z: Number(pos.z.toFixed(3)),
      isFinalPosition: true
    };
    
    // Check if XY position is significantly different from last XY entry
    const lastXYEntry = this.state.positionHistoryXY[this.state.positionHistoryXY.length - 1];
    if (!lastXYEntry || 
        Math.abs(lastXYEntry.x - pos.x) > 0.01 || 
        Math.abs(lastXYEntry.y - pos.y) > 0.01) {
      
      this.state.positionHistoryXY.push(entry);
      
      // Limit XY history size
      if (this.state.positionHistoryXY.length > this.maxHistorySize) {
        this.state.positionHistoryXY.shift();
      }
    }
  }
  
  // Toggle history view mode
  toggleHistoryViewMode() {
    const newMode = this.state.historyViewMode === 'XYZ' ? 'XY' : 'XYZ';
    this.update({ 
      historyViewMode: newMode,
      historyIndex: -1 // Reset to live when switching modes
    });
    console.log('History view mode:', newMode);
  }
  
  // Get current history based on view mode
  getCurrentHistory() {
    return this.state.historyViewMode === 'XY' ? 
           this.state.positionHistoryXY.filter(p => p.isFinalPosition) :
           this.state.positionHistory.filter(p => p.isFinalPosition);
  }

  // Add point to continuous track
  addContinuousTrackPoint(x, y, z) {
    this.state.continuousTrack.push({ x, y, z });
    
    // Limit continuous track points only if snake mode is enabled
    if (this.state.enableSnakeMode !== false) {
      const maxPoints = this.state.maxContinuousTrackPoints || 2000;
      
      // Debug log
      if (this.state.continuousTrack.length > maxPoints) {
        console.log('Snake mode: suppression point ancien. Limite:', maxPoints, 'Actuel:', this.state.continuousTrack.length);
      }
      
      while (this.state.continuousTrack.length > maxPoints) {
        this.state.continuousTrack.shift();
      }
      
      // Force canvas re-render when track is trimmed
      this.requestCanvasRender();
    }
  }

  // Clear position history
  clearHistory() {
    this.update({
      positionHistory: [],
      positionHistoryXY: [],
      track: [],
      continuousTrack: [],
      historyIndex: -1,
      historyMode: false
    });
    
    // Add current position as first entry
    this.recordFinalPosition(this.state.pos);
    
    // Force Z visualization update
    if (EnderTrack.ZVisualization && EnderTrack.ZVisualization.render) {
      EnderTrack.ZVisualization.render();
    }
    
    this.notifyListeners('history:cleared');
  }

  // Event system
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  notifyListeners(event, ...args) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(...args);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  // Persistence
  async saveState() {
    try {
      const stateToSave = {
        ...this.state,
        // Don't save runtime state
        isMoving: false,
        animationId: null,
        isDragging: false
      };
      
      localStorage.setItem('endertrack_state', JSON.stringify(stateToSave));
    } catch (error) {
      console.warn('Failed to save state:', error);
    }
  }

  async loadState() {
    try {
      const saved = localStorage.getItem('endertrack_state');
      if (saved) {
        const parsedState = JSON.parse(saved);
        
        // Merge with defaults to handle new properties
        this.state = { ...this.getDefaultState(), ...parsedState };
        

      }
    } catch (error) {
      console.warn('Failed to load state:', error);
      this.state = this.getDefaultState();
    }
  }

  setupAutoSave() {
    // Save state every 30 seconds
    setInterval(() => {
      this.saveState();
    }, 30000);
    
    // Save on page unload
    window.addEventListener('beforeunload', () => {
      this.saveState();
    });
  }

  isSignificantChange(changes) {
    const significantKeys = [
      'pos', 'mapSizeMm', 'sensitivityX', 'sensitivityY', 'sensitivityZ',
      'lockX', 'lockY', 'lockZ', 'lockXY', 'inputMode', 'activeTab', 'zoom', 'panX', 'panY'
    ];
    
    return Object.keys(changes).some(key => significantKeys.includes(key));
  }

  shouldRenderCanvas(changes, oldState) {
    const renderKeys = [
      'pos', 'zoom', 'panX', 'panY', 'showGrid', 'track', 'mapSizeMm'
    ];
    
    return Object.keys(changes).some(key => renderKeys.includes(key));
  }

  requestCanvasRender() {
    if (window.EnderTrack?.Canvas?.requestRender) {
      window.EnderTrack.Canvas.requestRender();
    }
  }

  // Export/Import functionality
  exportState() {
    const exportData = {
      version: '1.0',
      timestamp: Date.now(),
      state: this.state
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `endertrack_export_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async importState(file) {
    try {
      const text = await file.text();
      const importData = JSON.parse(text);
      
      if (importData.version && importData.state) {
        this.state = { ...this.getDefaultState(), ...importData.state };
        this.notifyListeners('state:imported', this.state);
        await this.saveState();
        return true;
      }
      
      throw new Error('Invalid file format');
    } catch (error) {
      console.error('Import failed:', error);
      return false;
    }
  }

  // Track management
  saveTrack() {
    if (this.state.positionHistory.length === 0) {
      console.warn('No track data to save');
      return;
    }
    
    const trackData = {
      version: '1.0',
      timestamp: Date.now(),
      positions: this.state.positionHistory,
      metadata: {
        totalPoints: this.state.positionHistory.length,
        duration: this.state.positionHistory.length > 0 ? 
          this.state.positionHistory[this.state.positionHistory.length - 1].timestamp - 
          this.state.positionHistory[0].timestamp : 0
      }
    };
    
    const blob = new Blob([JSON.stringify(trackData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `endertrack_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async loadTrack() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    return new Promise((resolve) => {
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return resolve(false);
        
        try {
          const text = await file.text();
          const trackData = JSON.parse(text);
          
          if (trackData.positions && Array.isArray(trackData.positions)) {
            this.update({
              positionHistory: trackData.positions,
              track: trackData.positions.map(p => ({ x: p.x, y: p.y, z: p.z }))
            });
            
            this.notifyListeners('track:loaded', trackData);
            resolve(true);
          } else {
            throw new Error('Invalid track file format');
          }
        } catch (error) {
          console.error('Failed to load track:', error);
          resolve(false);
        }
      };
      
      input.click();
    });
  }

  // Debug helpers
  debug() {
    console.log('🔍 EnderTrack State:', this.state);
    console.log('📊 Position History:', this.state.positionHistory.length, 'entries');
    console.log('🎯 Current Position:', this.state.pos);
    console.log('⚙️ Settings:', {
      inputMode: this.state.inputMode,
      sensitivity: {
        x: this.state.sensitivityX,
        y: this.state.sensitivityY,
        z: this.state.sensitivityZ
      },
      locks: {
        x: this.state.lockX,
        y: this.state.lockY,
        z: this.state.lockZ,
        xy: this.state.lockXY
      }
    });
  }

  // Live display updates
  updateLiveDisplays(state) {
    // Update position display
    const posLabel = document.getElementById('posLabel');
    if (posLabel) {
      posLabel.textContent = `X:${state.pos.x.toFixed(2)} Y:${state.pos.y.toFixed(2)} Z:${state.pos.z.toFixed(2)}`;
    }
    
    // Update platform info
    const platformSize = document.getElementById('platformSize');
    if (platformSize) {
      const dimensions = state.plateauDimensions || { x: 200, y: 200, z: 100 };
      platformSize.textContent = `${dimensions.x}×${dimensions.y}×${dimensions.z}mm`;
    }
    
    // Update zoom level
    const zoomLevel = document.getElementById('zoomLevel');
    if (zoomLevel) {
      const zoom = state.zoom || 1;
      zoomLevel.textContent = `${zoom.toFixed(1)}x`;
    }
    
    // Update individual position displays
    const posX = document.getElementById('posX');
    const posY = document.getElementById('posY');
    const posZ = document.getElementById('posZ');
    
    if (posX) posX.textContent = state.pos.x.toFixed(2);
    if (posY) posY.textContent = state.pos.y.toFixed(2);
    if (posZ) posZ.textContent = state.pos.z.toFixed(2);
    
    // Update history navigation
    this.updateHistoryNavigation(state);
    
    // Update history table
    this.updateHistoryTable(state.positionHistory);
    
    // Update mini graphs
    this.updateMiniGraphs(state.positionHistory);
    
    // Update get button states when position changes
    if (window.updateGetButtonStates) {
      window.updateGetButtonStates();
    }
  }
  
  updateHistoryTable(history) {
    const tbody = document.getElementById('historyTableBody');
    if (!tbody) return;
    
    const state = this.state;
    const currentHistory = this.getCurrentHistory();
    
    // Show last 10 positions from current history
    const recentHistory = currentHistory.slice(-10);
    
    // Gray out table in history mode
    const table = tbody.closest('table');
    if (table) {
      table.style.opacity = state.historyMode ? '1' : '0.6';
      table.style.pointerEvents = state.historyMode ? 'auto' : 'none';
    }
    
    // Update table header based on mode
    const thead = table.querySelector('thead');
    if (thead) {
      if (state.historyViewMode === 'XY') {
        thead.innerHTML = `
          <tr>
            <th>Time</th>
            <th>ID</th>
            <th>X</th>
            <th>Y</th>
          </tr>
        `;
      } else {
        thead.innerHTML = `
          <tr>
            <th>Time</th>
            <th>ID</th>
            <th>X</th>
            <th>Y</th>
            <th>Z</th>
          </tr>
        `;
      }
    }
    
    // Generate numbering for XYZ mode
    const allVisited = state.positionHistory.filter(pos => pos.isFinalPosition);
    const xyGroups = new Map();
    
    allVisited.forEach((pos, allIndex) => {
      const xyKey = `${pos.x.toFixed(2)},${pos.y.toFixed(2)}`;
      if (!xyGroups.has(xyKey)) {
        xyGroups.set(xyKey, []);
      }
      xyGroups.get(xyKey).push({ pos, allIndex });
    });
    
    tbody.innerHTML = recentHistory.map((entry, index) => {
      const time = new Date(entry.timestamp).toLocaleTimeString();
      const globalIndex = currentHistory.length - recentHistory.length + index;
      const isCurrentlyExplored = state.historyIndex === globalIndex;
      const isLivePosition = state.historyIndex === -1 && index === recentHistory.length - 1 && !state.historyMode;
      
      const bgColor = (isCurrentlyExplored || isLivePosition) ? 'background: rgba(79, 158, 255, 0.5) !important;' : '';
      const cursor = state.historyMode ? 'cursor: pointer;' : 'cursor: default;';
      const onclick = state.historyMode ? `onclick="EnderTrack.State.goToHistoryPosition(${globalIndex})"` : '';
      
      // Generate display number based on mode
      let displayNumber;
      if (state.historyViewMode === 'XY') {
        displayNumber = globalIndex + 1;
      } else {
        // XYZ mode: find sub-numbering
        const xyKey = `${entry.x.toFixed(2)},${entry.y.toFixed(2)}`;
        const group = xyGroups.get(xyKey) || [];
        
        if (group.length > 1) {
          const subIndex = group.findIndex(item => 
            Math.abs(item.pos.x - entry.x) < 0.01 && 
            Math.abs(item.pos.y - entry.y) < 0.01 && 
            Math.abs(item.pos.z - entry.z) < 0.01
          );
          
          let xyGroupIndex = 1;
          for (const [key, grp] of xyGroups) {
            if (key === xyKey) break;
            xyGroupIndex++;
          }
          
          displayNumber = `${xyGroupIndex}-${subIndex + 1}`;
        } else {
          let xyGroupIndex = 1;
          for (const [key, grp] of xyGroups) {
            if (key === xyKey) break;
            xyGroupIndex++;
          }
          displayNumber = xyGroupIndex;
        }
      }
      
      if (state.historyViewMode === 'XY') {
        return `
          <tr style="${bgColor} ${cursor}" ${onclick}>
            <td>${time}</td>
            <td>${displayNumber}</td>
            <td>${entry.x.toFixed(2)}</td>
            <td>${entry.y.toFixed(2)}</td>
          </tr>
        `;
      } else {
        return `
          <tr style="${bgColor} ${cursor}" ${onclick}>
            <td>${time}</td>
            <td>${displayNumber}</td>
            <td>${entry.x.toFixed(2)}</td>
            <td>${entry.y.toFixed(2)}</td>
            <td>${entry.z.toFixed(2)}</td>
          </tr>
        `;
      }
    }).join('');
  }
  
  updateMiniGraphs(history) {
    if (history.length < 2) return;
    
    const canvases = {
      x: document.getElementById('gX'),
      y: document.getElementById('gY'),
      z: document.getElementById('gZ')
    };
    
    Object.entries(canvases).forEach(([axis, canvas]) => {
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d');
      const width = canvas.width;
      const height = canvas.height;
      
      // Clear canvas
      ctx.clearRect(0, 0, width, height);
      
      // Get recent data (last 50 points)
      const recentData = history.slice(-50);
      if (recentData.length < 2) return;
      
      // Find min/max for scaling
      const values = recentData.map(p => p[axis]);
      const min = Math.min(...values);
      const max = Math.max(...values);
      const range = max - min || 1;
      
      // Draw line with axis-specific color
      const colors = { x: '#ff4444', y: '#44ff44', z: '#4444ff' };
      ctx.strokeStyle = colors[axis] || '#0b84ff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      
      recentData.forEach((point, i) => {
        const x = (i / (recentData.length - 1)) * width;
        const y = height - ((point[axis] - min) / range) * height;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      
      ctx.stroke();
    });
  }
  


  // Theme management
  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    
    // Update theme selector if it exists
    const themeSelector = document.getElementById('themeSelector');
    if (themeSelector && themeSelector.value !== theme) {
      themeSelector.value = theme;
    }
  }

  setTheme(theme) {
    if (theme !== 'dark' && theme !== 'light') {
      console.warn('Invalid theme:', theme);
      return;
    }
    
    this.update({ theme });
    this.applyTheme(theme);
    
    console.log(`🎨 Theme changed to: ${theme}`);
  }

  // History navigation
  async goToPreviousPosition() {
    const currentHistory = this.getCurrentHistory();
    if (currentHistory.length === 0) return;
    
    let newIndex = this.state.historyIndex;
    if (newIndex === -1) {
      newIndex = currentHistory.length - 2; // Go to second-to-last
    } else if (newIndex > 0) {
      newIndex--;
    }
    
    if (newIndex >= 0) {
      const targetPos = currentHistory[newIndex];
      
      // Use movement system to physically move to position
      if (window.EnderTrack?.Movement) {
        if (this.state.historyViewMode === 'XY') {
          await EnderTrack.Movement.moveAbsolute(targetPos.x, targetPos.y, this.state.pos.z);
        } else {
          await EnderTrack.Movement.moveAbsolute(targetPos.x, targetPos.y, targetPos.z);
        }
      }
      
      this.update({ historyIndex: newIndex });
    }
  }
  
  async goToNextPosition() {
    const currentHistory = this.getCurrentHistory();
    if (currentHistory.length === 0) return;
    
    let newIndex = this.state.historyIndex;
    if (newIndex < currentHistory.length - 1) {
      newIndex++;
      const targetPos = currentHistory[newIndex];
      
      // Use movement system to physically move to position
      if (window.EnderTrack?.Movement) {
        if (this.state.historyViewMode === 'XY') {
          await EnderTrack.Movement.moveAbsolute(targetPos.x, targetPos.y, this.state.pos.z);
        } else {
          await EnderTrack.Movement.moveAbsolute(targetPos.x, targetPos.y, targetPos.z);
        }
      }
      
      this.update({ historyIndex: newIndex });
    } else {
      // Go back to live position
      this.update({ historyIndex: -1 });
    }
  }
  
  updateHistoryNavigation(state) {
    // Create navigation controls if they don't exist
    let navContainer = document.getElementById('historyNavigation');
    if (!navContainer) {
      const historySection = document.querySelector('.history-section');
      if (historySection) {
        navContainer = document.createElement('div');
        navContainer.id = 'historyNavigation';
        navContainer.style.cssText = `
          display: block;
          margin-top: 8px;
          padding: 12px 8px;
          border-top: 1px solid #333;
          background: rgba(0,0,0,0.2);
          border-radius: 4px;
        `;
        
        navContainer.innerHTML = `
          <div style="display: flex; flex-direction: column; gap: 8px; width: 100%;">
            <div style="display: flex; gap: 4px; margin-bottom: 8px; background: #2c2c2c; padding: 4px; border-radius: 6px;">
              <button id="historyModeBtn" style="
                flex: 1;
                padding: 8px 16px;
                border: none;
                background: transparent;
                color: #aaa;
                border-radius: 4px;
                cursor: pointer;
                font-weight: 500;
                transition: all 0.2s ease;
              ">ACTIVATE HISTORY</button>
            </div>
            <div style="display: flex; gap: 4px; margin-bottom: 8px; background: #2c2c2c; padding: 4px; border-radius: 6px;">
              <button id="historyViewModeXY" style="
                flex: 1;
                padding: 8px 16px;
                border: none;
                background: transparent;
                color: #aaa;
                border-radius: 4px;
                cursor: pointer;
                font-weight: 500;
                transition: all 0.2s ease;
              ">XY</button>
              <button id="historyViewModeXYZ" style="
                flex: 1;
                padding: 8px 16px;
                border: none;
                background: transparent;
                color: #aaa;
                border-radius: 4px;
                cursor: pointer;
                font-weight: 500;
                transition: all 0.2s ease;
              ">XYZ</button>
            </div>
            <div style="display: flex; align-items: center; justify-content: center; gap: 8px;">
              <button id="historyPrevBtn" style="
                background: #444;
                border: 1px solid #666;
                color: #fff;
                padding: 6px 12px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                font-weight: bold;
              ">◀ PREV</button>
              <span id="historyIndicator" style="
                font-size: 12px;
                color: #fff;
                background: #333;
                padding: 4px 8px;
                border-radius: 4px;
                min-width: 80px;
                text-align: center;
                font-weight: bold;
              ">0/0</span>
              <button id="historyNextBtn" style="
                background: #444;
                border: 1px solid #666;
                color: #fff;
                padding: 6px 12px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                font-weight: bold;
              ">NEXT ▶</button>
            </div>
          </div>
        `;
        
        historySection.appendChild(navContainer);
        
        // Add event listeners
        document.getElementById('historyViewModeXY').addEventListener('click', () => {
          if (this.state.historyViewMode !== 'XY') {
            this.toggleHistoryViewMode();
          }
        });
        
        document.getElementById('historyViewModeXYZ').addEventListener('click', () => {
          if (this.state.historyViewMode !== 'XYZ') {
            this.toggleHistoryViewMode();
          }
        });
        
        document.getElementById('historyModeBtn').addEventListener('click', () => {
          deactivateControllerMode();
          this.toggleHistoryMode();
        });
        
        document.getElementById('historyPrevBtn').addEventListener('click', () => {
          this.goToPreviousPosition();
        });
        
        document.getElementById('historyNextBtn').addEventListener('click', () => {
          this.goToNextPosition();
        });
      }
    }
    
    const viewModeBtnXY = document.getElementById('historyViewModeXY');
    const viewModeBtnXYZ = document.getElementById('historyViewModeXYZ');
    const modeBtn = document.getElementById('historyModeBtn');
    const prevBtn = document.getElementById('historyPrevBtn');
    const nextBtn = document.getElementById('historyNextBtn');
    const indicator = document.getElementById('historyIndicator');
    
    const currentHistory = this.getCurrentHistory();
    const totalPositions = currentHistory.length;
    
    if (viewModeBtnXY && viewModeBtnXYZ && modeBtn && prevBtn && nextBtn && indicator) {
      // Update view mode buttons
      if (state.historyViewMode === 'XY') {
        viewModeBtnXY.style.background = '#4a5568';
        viewModeBtnXY.style.color = '#fff';
        viewModeBtnXYZ.style.background = 'transparent';
        viewModeBtnXYZ.style.color = '#aaa';
      } else {
        viewModeBtnXY.style.background = 'transparent';
        viewModeBtnXY.style.color = '#aaa';
        viewModeBtnXYZ.style.background = '#4a5568';
        viewModeBtnXYZ.style.color = '#fff';
      }
      
      // Update mode button
      if (state.historyMode) {
        modeBtn.style.background = '#4a5568';
        modeBtn.style.color = '#fff';
        modeBtn.title = 'History mode ON (frozen) - Click to return to live mode';
      } else {
        modeBtn.style.background = 'transparent';
        modeBtn.style.color = '#aaa';
        modeBtn.title = 'Live mode - Click to enter HISTORY mode';
      }
      
      // Show/hide navigation buttons and view mode buttons based on mode
      const viewModeContainer = viewModeBtnXY.parentElement;
      viewModeContainer.style.display = state.historyMode ? 'flex' : 'none';
      prevBtn.style.display = state.historyMode ? 'inline-block' : 'none';
      nextBtn.style.display = state.historyMode ? 'inline-block' : 'none';
      indicator.style.display = state.historyMode ? 'inline-block' : 'none';
      
      if (state.historyMode) {
        // Update navigation buttons
        const canNavigate = totalPositions > 0;
        prevBtn.disabled = !canNavigate || state.historyIndex <= 0;
        nextBtn.disabled = !canNavigate || state.historyIndex >= totalPositions - 1;
        
        // Update button styles based on state
        prevBtn.style.opacity = prevBtn.disabled ? '0.3' : '1';
        nextBtn.style.opacity = nextBtn.disabled ? '0.3' : '1';
      }
      
      // Update indicator
      if (totalPositions === 0) {
        indicator.textContent = '0/0';
      } else if (state.historyMode) {
        indicator.textContent = `${state.historyIndex + 1}/${totalPositions}`;
      } else {
        indicator.textContent = `${totalPositions}/${totalPositions} (live)`;
      }
    }
  }

  // Update navigation controls state
  updateNavigationControlsState(state) {
    const leftPanel = document.querySelector('.left-panel');
    if (leftPanel) {
      leftPanel.style.opacity = state.historyMode ? '0.5' : '1';
      leftPanel.style.pointerEvents = state.historyMode ? 'none' : 'auto';
    }
    
    // Keep Z visualization panel interactive in history mode
    const zPanel = document.querySelector('.z-visualization-panel');
    if (zPanel && state.historyMode) {
      zPanel.style.pointerEvents = 'auto';
      zPanel.style.opacity = '1';
    }
  }

  reset() {
    this.state = this.getDefaultState();
    this.applyTheme(this.state.theme);
    this.notifyListeners('state:reset', this.state);
    this.saveState();
  }
}

// Global instance
window.EnderTrack = window.EnderTrack || {};
window.EnderTrack.State = new StateManager();
window.EnderTrack.Events = window.EnderTrack.State; // Alias for event system