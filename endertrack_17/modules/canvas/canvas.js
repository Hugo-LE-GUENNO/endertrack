// modules/canvas/canvas.js - Canvas setup and management
// Pure canvas management with coordinate system integration

class CanvasManager {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.isInitialized = false;
    this.renderRequested = false;
    this.lastRenderTime = 0;
    this.targetFPS = 60;
    this.frameInterval = 1000 / this.targetFPS;
  }

  async init(canvasId) {
    console.log('🎨 Initializing Canvas Manager...');
    
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      throw new Error(`Canvas element with id '${canvasId}' not found`);
    }
    
    this.ctx = this.canvas.getContext('2d');
    if (!this.ctx) {
      throw new Error('Failed to get 2D rendering context');
    }
    
    // Setup canvas properties
    this.setupCanvas();
    
    // Initialize coordinate system
    this.updateCoordinateSystem();
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Initial render
    this.requestRender();
    
    this.isInitialized = true;
    console.log('✅ Canvas Manager initialized');
    
    return true;
  }

  setupCanvas() {
    // Get container size
    const container = this.canvas.parentElement;
    const rect = container.getBoundingClientRect();
    
    // Set canvas size to fill container
    const width = Math.floor(rect.width - 16); // Account for padding
    const height = Math.floor(rect.height - 16);
    
    this.canvas.width = width;
    this.canvas.height = height;
    
    // Set CSS size
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
    
    // Enable high DPI support
    const dpr = window.devicePixelRatio || 1;
    if (dpr > 1) {
      this.canvas.width = width * dpr;
      this.canvas.height = height * dpr;
      this.ctx.scale(dpr, dpr);
      this.canvas.style.width = width + 'px';
      this.canvas.style.height = height + 'px';
    }
    
    // Set default rendering properties
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
  }

  setupEventListeners() {
    // Listen to state changes
    EnderTrack.Events.on('state:changed', (newState, oldState) => {
      // Update coordinate system if relevant properties changed
      if (this.shouldUpdateCoordinates(newState, oldState)) {
        this.updateCoordinateSystem();
      }
      
      // Request render
      this.requestRender();
      
    });
    
    // Listen to window resize
    window.addEventListener('resize', () => {
      this.handleResize();
    });
    
    // Listen to input changes for overlays with debouncing
    setTimeout(() => {
      let renderTimeout;
      const debouncedRender = () => {
        clearTimeout(renderTimeout);
        renderTimeout = setTimeout(() => {
          this.requestRender();
        }, 100);
      };
      
      const inputs = ['inputX', 'inputY', 'inputXSep', 'inputYSep', 'inputZ', 'sensitivityX', 'sensitivityY', 'sensitivityZ', 'sensitivityXY'];
      inputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
          input.addEventListener('input', debouncedRender);
        }
      });
      
      // Listen to mode toggle buttons
      const relativeTab = document.getElementById('relativeTab');
      const absoluteTab = document.getElementById('absoluteTab');
      if (relativeTab) {
        relativeTab.addEventListener('click', () => {
          setTimeout(() => {
            this.requestRender();
          }, 50);
        });
      }
      if (absoluteTab) {
        absoluteTab.addEventListener('click', () => {
          setTimeout(() => {
            this.requestRender();
          }, 50);
        });
      }
    }, 1000);
  }

  shouldUpdateCoordinates(newState, oldState) {
    return newState.mapSizeMm !== oldState.mapSizeMm ||
           newState.zoom !== oldState.zoom ||
           newState.panX !== oldState.panX ||
           newState.panY !== oldState.panY;
  }

  updateCoordinateSystem() {
    const state = EnderTrack.State.get();
    
    EnderTrack.Coordinates.updateParameters({
      canvasWidth: this.canvas.width,
      canvasHeight: this.canvas.height,
      mapSizeMm: state.mapSizeMm,
      zoom: state.zoom || 1,
      panX: state.panX || 0,
      panY: state.panY || 0
    });
  }

  handleResize() {
    // Recalculate canvas size
    this.setupCanvas();
    
    // Update coordinate system
    this.updateCoordinateSystem();
    
    // Request render
    this.requestRender();
  }

  // Render management with frame rate limiting
  requestRender() {
    if (this.renderRequested) return;
    
    this.renderRequested = true;
    requestAnimationFrame((timestamp) => {
      if (timestamp - this.lastRenderTime >= this.frameInterval) {
        this.render();
        this.lastRenderTime = timestamp;
      }
      this.renderRequested = false;
    });
  }

  render() {
    if (!this.isInitialized) return;
    
    const state = EnderTrack.State.get();
    
    // Clear canvas
    this.clear();
    
    // Render layers in order
    this.renderBackground(state);
    this.renderPlatform(state);
    this.renderGrid(state);
    this.renderTrack(state);
    this.renderCurrentPosition(state);
    this.renderUI(state);
    
    // Notify render complete
    EnderTrack.Events.notifyListeners('canvas:rendered', this.ctx, state);
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  renderBackground(state) {
    // Fill background with custom color
    const bgColor = window.customColors?.outsideColor || '#2c2c2c';
    this.ctx.fillStyle = bgColor;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  renderPlatform(state) {
    const zoom = state.zoom || 1;
    const panX = state.panX || 0;
    const panY = state.panY || 0;
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    
    // Platform limits using actual XY dimensions
    const dimensions = state.plateauDimensions || { x: 200, y: 200, z: 100 };
    const halfX = dimensions.x / 2;
    const halfY = dimensions.y / 2;
    
    const leftEdge = centerX + panX + (-halfX * zoom);
    const rightEdge = centerX + panX + (halfX * zoom);
    const topEdge = centerY + panY + (-halfY * zoom);
    const bottomEdge = centerY + panY + (halfY * zoom);
    
    // Fill platform area with custom background color
    const mapBackground = window.customColors?.mapBackground || '#1a1a1a';
    this.ctx.fillStyle = mapBackground;
    this.ctx.fillRect(leftEdge, topEdge, rightEdge - leftEdge, bottomEdge - topEdge);
    
    // Draw platform boundary
    const originAxesColor = window.customColors?.originAxes || '#ef4444';
    this.ctx.strokeStyle = originAxesColor;
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.rect(leftEdge, topEdge, rightEdge - leftEdge, bottomEdge - topEdge);
    this.ctx.stroke();
  }

  renderGrid(state) {
    if (state.showGrid === false) return;
    
    const zoom = state.zoom || 1;
    const panX = state.panX || 0;
    const panY = state.panY || 0;
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    
    // Platform limits using actual XY dimensions
    const dimensions = state.plateauDimensions || { x: 200, y: 200, z: 100 };
    const halfX = dimensions.x / 2;
    const halfY = dimensions.y / 2;
    
    const leftEdge = centerX + panX + (-halfX * zoom);
    const rightEdge = centerX + panX + (halfX * zoom);
    const topEdge = centerY + panY + (-halfY * zoom);
    const bottomEdge = centerY + panY + (halfY * zoom);
    
    // 1mm grid spacing
    const gridSpacing = 1;
    
    // Only draw grid within platform bounds
    const startX = Math.max(-halfX, Math.floor(-halfX / gridSpacing) * gridSpacing);
    const endX = Math.min(halfX, Math.ceil(halfX / gridSpacing) * gridSpacing);
    const startY = Math.max(-halfY, Math.floor(-halfY / gridSpacing) * gridSpacing);
    const endY = Math.min(halfY, Math.ceil(halfY / gridSpacing) * gridSpacing);
    
    // Ultra-fine grid - 100µm spacing (same clarity as 1mm grid)
    if (zoom > 100) { // Only show 100µm grid when zoomed in enough
      this.ctx.strokeStyle = '#333333';
      this.ctx.lineWidth = 0.2;
      this.ctx.beginPath();
      
      // Vertical lines every 0.1mm (100µm)
      for (let x = -halfX; x <= halfX; x += 0.1) {
        if (x % 1 !== 0) { // Skip 1mm lines
          const pixelX = centerX + panX + (x * zoom);
          this.ctx.moveTo(pixelX, topEdge);
          this.ctx.lineTo(pixelX, bottomEdge);
        }
      }
      
      // Horizontal lines every 0.1mm (100µm)
      for (let y = -halfY; y <= halfY; y += 0.1) {
        if (y % 1 !== 0) { // Skip 1mm lines
          const pixelY = centerY + panY + (y * zoom);
          this.ctx.moveTo(leftEdge, pixelY);
          this.ctx.lineTo(rightEdge, pixelY);
        }
      }
      
      this.ctx.stroke();
    }
    
    // Fine grid - 1mm spacing (very subtle)
    if (zoom > 10) { // Only show 1mm grid when zoomed in enough
      this.ctx.strokeStyle = '#333333';
      this.ctx.lineWidth = 0.2;
      this.ctx.beginPath();
      
      // Vertical lines every 1mm
      for (let x = -halfX; x <= halfX; x += 1) {
        if (x % 10 !== 0) { // Skip 10mm lines
          const pixelX = centerX + panX + (x * zoom);
          this.ctx.moveTo(pixelX, topEdge);
          this.ctx.lineTo(pixelX, bottomEdge);
        }
      }
      
      // Horizontal lines every 1mm
      for (let y = -halfY; y <= halfY; y += 1) {
        if (y % 10 !== 0) { // Skip 10mm lines
          const pixelY = centerY + panY + (y * zoom);
          this.ctx.moveTo(leftEdge, pixelY);
          this.ctx.lineTo(rightEdge, pixelY);
        }
      }
      
      this.ctx.stroke();
    }
    
    // Main grid - 10mm spacing - use custom color if available
    const gridColor = window.customColors?.gridColor || '#404040';
    this.ctx.strokeStyle = gridColor;
    this.ctx.lineWidth = 0.5;
    this.ctx.beginPath();
    
    // Vertical lines every 10mm
    for (let x = -halfX; x <= halfX; x += 10) {
      const pixelX = centerX + panX + (x * zoom);
      this.ctx.moveTo(pixelX, topEdge);
      this.ctx.lineTo(pixelX, bottomEdge);
    }
    
    // Horizontal lines every 10mm
    for (let y = -halfY; y <= halfY; y += 10) {
      const pixelY = centerY + panY + (y * zoom);
      this.ctx.moveTo(leftEdge, pixelY);
      this.ctx.lineTo(rightEdge, pixelY);
    }
    
    this.ctx.stroke();

    
    // Draw origin axes
    this.renderOriginAxes(state);
    
    // Draw grid labels
    this.renderGridLabels(state, zoom, panX, panY, halfX, halfY);
  }

  renderOriginAxes(state) {
    const zoom = state.zoom || 1;
    const panX = state.panX || 0;
    const panY = state.panY || 0;
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    
    const originX = centerX + panX;
    const originY = centerY + panY;
    
    const axisXColor = window.customColors?.axisXColor || '#ff4444';
    const axisYColor = window.customColors?.axisYColor || '#44ff44';
    
    this.ctx.lineWidth = 1;
    this.ctx.globalAlpha = 0.4;
    
    this.ctx.beginPath();
    
    // X axis with custom color
    this.ctx.strokeStyle = axisXColor;
    this.ctx.moveTo(0, originY);
    this.ctx.lineTo(this.canvas.width, originY);
    
    this.ctx.stroke();
    
    // Y axis with custom color
    this.ctx.strokeStyle = axisYColor;
    this.ctx.beginPath();
    this.ctx.moveTo(originX, 0);
    this.ctx.lineTo(originX, this.canvas.height);
    
    this.ctx.stroke();
    this.ctx.globalAlpha = 1;
    
    // Origin marker (ROUGE)
    const originAxesColor = window.customColors?.originAxes || '#ef4444';
    this.ctx.fillStyle = originAxesColor;
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(originX, originY, 5, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.stroke();
  }

  renderGridLabels(state, zoom, panX, panY, halfX, halfY) {
    // Only show labels if zoom is sufficient
    if (zoom < 5) return;
    
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const originX = centerX + panX;
    const originY = centerY + panY;
    
    this.ctx.fillStyle = 'rgba(255,255,255,0.8)';
    this.ctx.font = '10px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    // Label spacing based on zoom
    const labelSpacing = zoom >= 20 ? 10 : zoom >= 10 ? 20 : 50;
    
    // Only label within platform bounds
    const startX = Math.max(-halfX, Math.floor(-halfX / labelSpacing) * labelSpacing);
    const endX = Math.min(halfX, Math.ceil(halfX / labelSpacing) * labelSpacing);
    const startY = Math.max(-halfY, Math.floor(-halfY / labelSpacing) * labelSpacing);
    const endY = Math.min(halfY, Math.ceil(halfY / labelSpacing) * labelSpacing);
    
    // X axis labels
    for (let x = startX; x <= endX; x += labelSpacing) {
      if (x === 0) continue;
      
      const pixelX = centerX + panX + (x * zoom);
      if (pixelX > 20 && pixelX < this.canvas.width - 20) {
        // Background for readability
        this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
        this.ctx.fillRect(pixelX - 15, originY + 5, 30, 12);
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillText(x.toString(), pixelX, originY + 11);
      }
    }
    
    // Y axis labels
    this.ctx.textAlign = 'left';
    for (let y = startY; y <= endY; y += labelSpacing) {
      if (y === 0) continue;
      
      const pixelY = centerY + panY + (y * zoom);
      if (pixelY > 15 && pixelY < this.canvas.height - 15) {
        // Background for readability
        this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
        this.ctx.fillRect(originX + 5, pixelY - 6, 25, 12);
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillText(y.toString(), originX + 7, pixelY);
      }
    }
  }

  renderTrack(state) {
    const zoom = state.zoom || 1;
    const panX = state.panX || 0;
    const panY = state.panY || 0;
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    
    // Draw continuous track (ORANGE - mode libre continu)
    const showTrackFree = document.getElementById('showTrackFree');
    const showTrackFreeEnabled = !showTrackFree || showTrackFree.checked;
    if (showTrackFreeEnabled && state.continuousTrack && state.continuousTrack.length > 1) {
      const trackFreeColor = window.customColors?.trackFreeColor || '#ff8c00';
      this.ctx.strokeStyle = trackFreeColor;
      this.ctx.lineWidth = 2;
      this.ctx.globalAlpha = 0.8;
      this.ctx.beginPath();
      
      let firstPoint = true;
      for (const point of state.continuousTrack) {
        const posX = centerX + panX + (point.x * zoom);
        const posY = centerY + panY + (point.y * zoom);
        
        if (firstPoint) {
          this.ctx.moveTo(posX, posY);
          firstPoint = false;
        } else {
          this.ctx.lineTo(posX, posY);
        }
      }
      
      this.ctx.stroke();
      this.ctx.globalAlpha = 1;
    }
    
    // Draw discrete track (VERT - mode pas-à-pas) - use custom color if available
    const showTrackPositions = document.getElementById('showTrackPositions');
    const showTrackPositionsEnabled = !showTrackPositions || showTrackPositions.checked;
    if (showTrackPositionsEnabled && state.track.length > 1) {
      const trackColor = window.customColors?.trackColor || '#10b981';
      this.ctx.strokeStyle = trackColor;
      this.ctx.lineWidth = 2;
      this.ctx.globalAlpha = 0.7;
      this.ctx.beginPath();
      
      let firstPoint = true;
      for (const point of state.track) {
        const posX = centerX + panX + (point.x * zoom);
        const posY = centerY + panY + (point.y * zoom);
        
        if (firstPoint) {
          this.ctx.moveTo(posX, posY);
          firstPoint = false;
        } else {
          this.ctx.lineTo(posX, posY);
        }
      }
      
      this.ctx.stroke();
      this.ctx.globalAlpha = 1;
    }
    
    // Draw discrete points at visited positions (VERT) - seulement si showTrackPositions ET showPositionXYHistory sont activés
    const showPositionXYHistory = document.getElementById('showPositionXYHistory');
    const showHistoryXYEnabled = !showPositionXYHistory || showPositionXYHistory.checked;
    if (showTrackPositionsEnabled && showHistoryXYEnabled && state.track.length > 0) {
      const historyPositionsColor = window.customColors?.historyPositionsColor || '#10b981';
      this.ctx.fillStyle = historyPositionsColor;
      
      for (const point of state.track) {
        const posX = centerX + panX + (point.x * zoom);
        const posY = centerY + panY + (point.y * zoom);
        
        // Only draw if visible
        if (posX >= -10 && posX <= this.canvas.width + 10 && 
            posY >= -10 && posY <= this.canvas.height + 10) {
          this.ctx.beginPath();
          this.ctx.arc(posX, posY, 3, 0, Math.PI * 2);
          this.ctx.fill();
        }
      }
    }
  }

  renderCurrentPosition(state) {
    const zoom = state.zoom || 1;
    const panX = state.panX || 0;
    const panY = state.panY || 0;
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    
    const posX = centerX + panX + (state.pos.x * zoom);
    const posY = centerY + panY + (state.pos.y * zoom);
    
    // Render continuous movement vector (YELLOW)
    if (window.continuousVector && window.continuousVector.xy) {
      const vector = window.continuousVector.xy;
      const vectorLength = 20 + (vector.speed * 2); // 20-120px based on speed (1-50mm/s)
      
      // Calculate vector end position
      const vectorEndX = posX + (vector.dx * vectorLength);
      const vectorEndY = posY + (vector.dy * vectorLength);
      
      // Draw vector line
      const futurePositionColor = window.customColors?.futurePosition || '#ffc107';
      this.ctx.strokeStyle = futurePositionColor;
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.moveTo(posX, posY);
      this.ctx.lineTo(vectorEndX, vectorEndY);
      this.ctx.stroke();
      
      // Draw arrowhead
      const angle = Math.atan2(vector.dy, vector.dx);
      const arrowSize = 8;
      
      this.ctx.fillStyle = futurePositionColor;
      this.ctx.beginPath();
      this.ctx.moveTo(vectorEndX, vectorEndY);
      this.ctx.lineTo(
        vectorEndX - arrowSize * Math.cos(angle - Math.PI / 6),
        vectorEndY - arrowSize * Math.sin(angle - Math.PI / 6)
      );
      this.ctx.lineTo(
        vectorEndX - arrowSize * Math.cos(angle + Math.PI / 6),
        vectorEndY - arrowSize * Math.sin(angle + Math.PI / 6)
      );
      this.ctx.closePath();
      this.ctx.fill();
    }
    
    // OVERLAYS - Only show in live mode, not in history mode
    const showFuturePositionsXY = document.getElementById('showFuturePositionsXY');
    const showFutureXYEnabled = !showFuturePositionsXY || showFuturePositionsXY.checked;
    
    if (!state.historyMode && showFutureXYEnabled) {
      // OVERLAYS - Mode Lists: positions des listes avec couleurs
      if (window.EnderTrack?.Lists?.shouldShowOverlays()) {
        // Render current list positions only
        try {
          const currentList = window.EnderTrack.Lists.currentList;
          if (currentList && currentList.positions) {
            const color = currentList.color || window.EnderTrack.Lists.getListColor(currentList.id);
            currentList.positions.forEach((pos, index) => {
              const posWithMeta = { ...pos, listId: currentList.id, color, positionNumber: index + 1 };
              
              const listPosX = centerX + panX + (posWithMeta.x * zoom);
              const listPosY = centerY + panY + (posWithMeta.y * zoom);
              
              // Only render if visible
              if (listPosX >= -10 && listPosX <= this.canvas.width + 10 && 
                  listPosY >= -10 && listPosY <= this.canvas.height + 10) {
                // Draw position circle
                this.ctx.fillStyle = posWithMeta.color || '#8B5CF6';
                this.ctx.strokeStyle = '#ffffff';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.arc(listPosX, listPosY, 6, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.stroke();
                
                // Draw position number
                this.ctx.fillStyle = '#ffffff';
                this.ctx.strokeStyle = '#000000';
                this.ctx.lineWidth = 1;
                this.ctx.font = 'bold 10px monospace';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                
                const numberText = posWithMeta.positionNumber.toString();
                this.ctx.strokeText(numberText, listPosX, listPosY - 12);
                this.ctx.fillText(numberText, listPosX, listPosY - 12);
              }
            });
          }
        } catch (e) {
          // Silently handle if Lists module not ready
        }
        
        // Render preview positions (transparent)
        try {
          const previewPositions = window.EnderTrack.Lists.getPreviewPositions();
          previewPositions.forEach(pos => {
            const prevPosX = centerX + panX + (pos.x * zoom);
            const prevPosY = centerY + panY + (pos.y * zoom);
            
            // Only render if visible
            if (prevPosX >= -10 && prevPosX <= this.canvas.width + 10 && 
                prevPosY >= -10 && prevPosY <= this.canvas.height + 10) {
              this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
              this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
              this.ctx.lineWidth = 1;
              this.ctx.beginPath();
              this.ctx.arc(prevPosX, prevPosY, 4, 0, Math.PI * 2);
              this.ctx.fill();
              this.ctx.stroke();
            }
          });
        } catch (e) {
          // Silently handle if Lists module not ready
        }
      }
      // OVERLAYS - Mode relatif: 8 directions (JAUNE) - masquer en mode contrôleur continu et en mode Lists
      else if (state.inputMode === 'relative' && !(window.EnderTrack?.KeyboardMode?.isActive && (window.controllerMode || 'step') === 'continuous')) {
        const sens = { x: state.sensitivityX || 1, y: state.sensitivityY || 1 };
        const dirs = [
          // Directions cardinales
          { x: state.pos.x, y: state.pos.y + sens.y, locked: state.lockY },
          { x: state.pos.x, y: state.pos.y - sens.y, locked: state.lockY },
          { x: state.pos.x - sens.x, y: state.pos.y, locked: state.lockX },
          { x: state.pos.x + sens.x, y: state.pos.y, locked: state.lockX },
          // Directions diagonales
          { x: state.pos.x - sens.x / Math.sqrt(2), y: state.pos.y - sens.y / Math.sqrt(2), locked: state.lockX || state.lockY },
          { x: state.pos.x + sens.x / Math.sqrt(2), y: state.pos.y - sens.y / Math.sqrt(2), locked: state.lockX || state.lockY },
          { x: state.pos.x - sens.x / Math.sqrt(2), y: state.pos.y + sens.y / Math.sqrt(2), locked: state.lockX || state.lockY },
          { x: state.pos.x + sens.x / Math.sqrt(2), y: state.pos.y + sens.y / Math.sqrt(2), locked: state.lockX || state.lockY }
        ];
        
        dirs.forEach(dir => {
          if (!dir.locked) {
            const dirX = centerX + panX + (dir.x * zoom);
            const dirY = centerY + panY + (dir.y * zoom);
            
            const futurePositionColor = window.customColors?.futurePosition || '#ffc107';
            this.ctx.fillStyle = futurePositionColor + '99'; // Add alpha
            this.ctx.beginPath();
            this.ctx.arc(dirX, dirY, 6, 0, Math.PI * 2);
            this.ctx.fill();
          }
        });
      }
      
      // OVERLAYS - Mode absolu: position future - masquer en mode Lists
      if (state.inputMode === 'absolute' && !window.EnderTrack?.Lists?.isActive) {
        let inputX, inputY;
        
        // Get inputs based on coupling state
        if (state.lockXY) {
          inputX = document.getElementById('inputX');
          inputY = document.getElementById('inputY');
        } else {
          inputX = document.getElementById('inputXSep');
          inputY = document.getElementById('inputYSep');
        }
        
        if (inputX && inputY) {
          const futureX = parseFloat(inputX.value) || 0;
          const futureY = parseFloat(inputY.value) || 0;
          
          if (Math.abs(futureX - state.pos.x) > 0.01 || Math.abs(futureY - state.pos.y) > 0.01) {
            const futPosX = centerX + panX + (futureX * zoom);
            const futPosY = centerY + panY + (futureY * zoom);
            
            const futurePositionColor = window.customColors?.futurePosition || '#ffc107';
            this.ctx.fillStyle = futurePositionColor + 'E6'; // Add alpha
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(futPosX, futPosY, 8, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();
          }
        }
      }
    }
    
    // OVERLAYS - Positions visitées (VERT) avec numéros
    const showPositionXYHistory = document.getElementById('showPositionXYHistory');
    const showHistoryXYEnabled = !showPositionXYHistory || showPositionXYHistory.checked;
    if (state.positionHistory && showHistoryXYEnabled) {
      // Use current history mode for display
      const currentHistory = state.historyViewMode === 'XY' ? 
                           state.positionHistoryXY.filter(p => p.isFinalPosition) :
                           state.positionHistory.filter(p => p.isFinalPosition);
      
      // Show all XYZ positions as green dots with sub-numbering
      const allVisited = state.positionHistory.filter(pos => pos.isFinalPosition);
      const xyGroups = new Map();
      
      // Group positions by XY coordinates
      allVisited.forEach((pos, allIndex) => {
        const xyKey = `${pos.x.toFixed(2)},${pos.y.toFixed(2)}`;
        if (!xyGroups.has(xyKey)) {
          xyGroups.set(xyKey, []);
        }
        xyGroups.get(xyKey).push({ pos, allIndex });
      });
      
      // Render with numbering based on view mode
      let displayIndex = 1;
      xyGroups.forEach((group) => {
        if (state.historyViewMode === 'XY') {
          // XY mode: show only one number per XY group (latest Z)
          const latestItem = group[group.length - 1];
          const { pos } = latestItem;
          const visitedX = centerX + panX + (pos.x * zoom);
          const visitedY = centerY + panY + (pos.y * zoom);
          
          // Point vert for all positions in group - seulement si showPositionXYHistory est activé
          if (showHistoryXYEnabled) {
            const historyColor = window.customColors?.historyPositionsColor || '#10b981';
            group.forEach(item => {
              const groupPosX = centerX + panX + (item.pos.x * zoom);
              const groupPosY = centerY + panY + (item.pos.y * zoom);
              this.ctx.fillStyle = historyColor;
              this.ctx.beginPath();
              this.ctx.arc(groupPosX, groupPosY, 4, 0, Math.PI * 2);
              this.ctx.fill();
            });
          }
          
          // Number only on latest position
          if (state.historyMode) {
            const historyIndex = currentHistory.findIndex(h => 
              Math.abs(h.x - pos.x) < 0.01 && Math.abs(h.y - pos.y) < 0.01
            );
            
            if (historyIndex >= 0) {
              const isCurrentHistory = state.historyIndex === historyIndex;
              this.ctx.fillStyle = isCurrentHistory ? '#4f9eff' : '#ffffff';
              this.ctx.strokeStyle = '#000000';
              this.ctx.lineWidth = 1;
              this.ctx.font = 'bold 12px monospace';
              this.ctx.textAlign = 'center';
              this.ctx.textBaseline = 'middle';
              
              this.ctx.strokeText(displayIndex.toString(), visitedX, visitedY - 12);
              this.ctx.fillText(displayIndex.toString(), visitedX, visitedY - 12);
            }
          }
        } else {
          // XYZ mode: show only the latest sub-number for each XY group
          const latestItem = group[group.length - 1];
          const { pos } = latestItem;
          const visitedX = centerX + panX + (pos.x * zoom);
          const visitedY = centerY + panY + (pos.y * zoom);
          
          // Point vert for all positions in group - seulement si showPositionXYHistory est activé
          if (showHistoryXYEnabled) {
            const historyColor = window.customColors?.historyPositionsColor || '#10b981';
            group.forEach(item => {
              const groupPosX = centerX + panX + (item.pos.x * zoom);
              const groupPosY = centerY + panY + (item.pos.y * zoom);
              this.ctx.fillStyle = historyColor;
              this.ctx.beginPath();
              this.ctx.arc(groupPosX, groupPosY, 4, 0, Math.PI * 2);
              this.ctx.fill();
            });
          }
          
          // Show only the latest sub-number (highest number for this XY)
          if (state.historyMode) {
            const isCurrentHistory = state.historyIndex >= 0 && 
              Math.abs(currentHistory[state.historyIndex].x - pos.x) < 0.01 && 
              Math.abs(currentHistory[state.historyIndex].y - pos.y) < 0.01;
            
            this.ctx.fillStyle = isCurrentHistory ? '#4f9eff' : '#ffffff';
            this.ctx.strokeStyle = '#000000';
            this.ctx.lineWidth = 1;
            this.ctx.font = 'bold 12px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            
            const number = group.length > 1 ? `${displayIndex}-${group.length}` : displayIndex.toString();
            
            this.ctx.strokeText(number, visitedX, visitedY - 12);
            this.ctx.fillText(number, visitedX, visitedY - 12);
          }
        }
        displayIndex++;
      });
    }
    
    // Only render if position is visible
    if (posX < -50 || posX > this.canvas.width + 50 || 
        posY < -50 || posY > this.canvas.height + 50) {
      return;
    }
    
    // Position crosshair (BLEU) - use custom color if available
    const crosshairColor = window.customColors?.positionColor || '#4f9eff';
    this.ctx.strokeStyle = crosshairColor;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(posX - 10, posY);
    this.ctx.lineTo(posX + 10, posY);
    this.ctx.moveTo(posX, posY - 10);
    this.ctx.lineTo(posX, posY + 10);
    this.ctx.stroke();
  }



  renderUI(state) {
    // Render any additional UI elements on canvas
    this.renderScaleIndicator(state);
    this.renderCompass(state);
  }



  renderScaleIndicator(state) {
    const zoom = state.zoom || 1;
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const panX = state.panX || 0;
    const panY = state.panY || 0;
    
    // 1mm in world coordinates = zoom pixels on screen
    // So 1 grid square (1mm) = zoom pixels
    
    // Scale with nice round values: 50, 20, 10, 5, 2, 1, 500µm, etc.
    const targetScaleMm = 50 / zoom;
    
    // Define nice scale values in mm
    const scaleSteps = [
      // mm values
      50, 20, 10, 5, 2, 1,
      // µm values (in mm)
      0.5, 0.2, 0.1, 0.05, 0.02, 0.01,
      0.005, 0.002, 0.001,
      // nm values (in mm)
      0.0005, 0.0002, 0.0001, 0.00005, 0.00002, 0.00001,
      0.000005, 0.000002, 0.000001
    ];
    
    // Find the best scale step
    let bestScale = scaleSteps[0];
    for (const step of scaleSteps) {
      if (step <= targetScaleMm) {
        bestScale = step;
        break;
      }
    }
    
    // Determine unit and display value
    let scaleValueMm, unit, displayValue;
    
    if (bestScale >= 1) {
      // mm range
      scaleValueMm = bestScale;
      displayValue = bestScale;
      unit = 'mm';
    } else if (bestScale >= 0.001) {
      // µm range
      scaleValueMm = bestScale;
      displayValue = Math.round(bestScale * 1000);
      unit = 'µm';
    } else {
      // nm range
      scaleValueMm = bestScale;
      displayValue = Math.round(bestScale * 1000000);
      unit = 'nm';
    }
    
    const actualScaleValueMm = scaleValueMm;
    
    // Convert mm to pixels using the actual zoom factor
    const barLengthPx = actualScaleValueMm * zoom;
    
    const x = this.canvas.width - Math.max(100, barLengthPx + 30);
    const y = this.canvas.height - 30;
    
    // Scale bar (larger) - use custom color
    const scaleBarColor = window.customColors?.scaleBarColor || '#ffffff';
    this.ctx.strokeStyle = scaleBarColor;
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
    this.ctx.lineTo(x + barLengthPx, y);
    this.ctx.moveTo(x, y - 8);
    this.ctx.lineTo(x, y + 8);
    this.ctx.moveTo(x + barLengthPx, y - 8);
    this.ctx.lineTo(x + barLengthPx, y + 8);
    this.ctx.stroke();
    
    // Scale text (larger) - use same custom color
    this.ctx.fillStyle = scaleBarColor;
    this.ctx.font = '12px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`${displayValue}${unit}`, x + barLengthPx / 2, y - 12);
    
    // Remove zoom indicator (moved to overlay)
  }

  renderCompass(state) {
    // XY axis indicator in top right (clickable for fit to view)
    const centerX = this.canvas.width - 40;
    const centerY = 40;
    const baseRadius = 20;
    const isHovered = this.compassHovered || false;
    const radius = isHovered ? baseRadius + 2 : baseRadius;
    
    // Store compass bounds for click detection
    this.compassBounds = {
      x: centerX - baseRadius - 2,
      y: centerY - baseRadius - 2,
      width: (baseRadius + 2) * 2,
      height: (baseRadius + 2) * 2
    };
    
    // Background circle (highlighted when hovered)
    if (isHovered) {
      this.ctx.fillStyle = 'rgba(0,0,0,0.8)';
      this.ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      this.ctx.lineWidth = 2;
    } else {
      this.ctx.fillStyle = 'rgba(0,0,0,0.6)';
      this.ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      this.ctx.lineWidth = 1;
    }
    
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.stroke();
    
    // X+ arrow (red, pointing right)
    this.ctx.strokeStyle = '#ff4444';
    this.ctx.lineWidth = isHovered ? 3 : 2;
    this.ctx.beginPath();
    this.ctx.moveTo(centerX, centerY);
    this.ctx.lineTo(centerX + radius - 5, centerY);
    this.ctx.stroke();
    
    // Y+ arrow (green, pointing up)
    this.ctx.strokeStyle = '#44ff44';
    this.ctx.beginPath();
    this.ctx.moveTo(centerX, centerY);
    this.ctx.lineTo(centerX, centerY - radius + 5);
    this.ctx.stroke();
    
    // Labels
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = isHovered ? 'bold 10px sans-serif' : '10px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('X+', centerX + radius + 8, centerY + 3);
    this.ctx.fillText('Y+', centerX, centerY - radius - 5);
  }



  // Utility methods for external use
  drawCircle(x, y, radius, color, fill = true) {
    const canvasPos = EnderTrack.Coordinates.mapToCanvas(x, y);
    const pixelRadius = EnderTrack.Coordinates.mmToPixels(radius);
    
    this.ctx.beginPath();
    this.ctx.arc(canvasPos.cx, canvasPos.cy, pixelRadius, 0, Math.PI * 2);
    
    if (fill) {
      this.ctx.fillStyle = color;
      this.ctx.fill();
    } else {
      this.ctx.strokeStyle = color;
      this.ctx.stroke();
    }
  }

  drawLine(x1, y1, x2, y2, color, width = 1) {
    const start = EnderTrack.Coordinates.mapToCanvas(x1, y1);
    const end = EnderTrack.Coordinates.mapToCanvas(x2, y2);
    
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = width;
    this.ctx.beginPath();
    this.ctx.moveTo(start.cx, start.cy);
    this.ctx.lineTo(end.cx, end.cy);
    this.ctx.stroke();
  }

  drawText(x, y, text, color, font = '12px sans-serif') {
    const canvasPos = EnderTrack.Coordinates.mapToCanvas(x, y);
    
    this.ctx.fillStyle = color;
    this.ctx.font = font;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(text, canvasPos.cx, canvasPos.cy);
  }

  // Get canvas element and context for external use
  getCanvas() {
    return this.canvas;
  }

  getContext() {
    return this.ctx;
  }

  // Export canvas as image
  exportAsImage(filename = 'endertrack_canvas.png') {
    const link = document.createElement('a');
    link.download = filename;
    link.href = this.canvas.toDataURL();
    link.click();
  }

  // Debug information
  getDebugInfo() {
    return {
      canvasSize: `${this.canvas.width}x${this.canvas.height}`,
      isInitialized: this.isInitialized,
      lastRenderTime: this.lastRenderTime,
      coordinates: EnderTrack.Coordinates.getDebugInfo()
    };
  }
}

// Global instance
window.EnderTrack = window.EnderTrack || {};
window.EnderTrack.Canvas = new CanvasManager();