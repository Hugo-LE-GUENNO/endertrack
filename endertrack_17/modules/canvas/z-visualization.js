// modules/canvas/z-visualization.js - Z-axis thermometer visualization
// Dedicated Z-axis canvas management

class ZVisualization {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.isInitialized = false;
    this.zRange = 200; // Full Z range (cube)
    this.zPan = 0; // Z pan offset
    this.isDragging = false;
    this.lastMouseY = 0;
    this.mouseZ = null; // Z position under mouse
    this.resizePending = false; // Prevent resize loops
  }

  init() {
    console.log('🔧 ZVisualization.init() starting...');
    
    const zPanel = document.getElementById('zVisualizationPanel');
    if (!zPanel) {
      console.error('❌ Z panel element not found!');
      return false;
    }
    
    // Force Z panel visible immediately
    zPanel.style.display = 'flex';
    zPanel.style.visibility = 'visible';
    console.log('✅ Z panel visible in init()');
    
    

    
    this.setupCanvas(zPanel);
    this.setupEventListeners();
    
    // Force initialize Z range and zoom based on actual Z dimension
    const state = EnderTrack.State.get();
    const dimensions = state.plateauDimensions || { x: 200, y: 200, z: 100 };
    const zSizeMm = dimensions.z;
    
    // Calculate and set minimum zoom if not already set
    const minZoom = this.canvas.height / zSizeMm;
    if (!state.zZoom || state.zZoom < minZoom) {
      EnderTrack.State.update({ zZoom: minZoom });
    }
    
    const currentZoom = state.zZoom || minZoom;
    this.zRange = this.canvas.height / currentZoom;

    
    // Add initial position to history
    if (state.positionHistory.length === 0) {
      EnderTrack.State.recordFinalPosition(state.pos);
    }
    
    this.isInitialized = true;

    
    // Initial render
    setTimeout(() => this.render(), 100);
    
    return true;
  }

  setupCanvas(zPanel) {
    const zScale = document.getElementById('zScale');
    if (!zScale) {
      console.warn('zScale element not found');
      return;
    }
    
    // Get main canvas height to align with it
    const mainCanvas = document.getElementById('mapCanvas');
    const canvasHeight = mainCanvas ? mainCanvas.offsetHeight : 400;
    

    
    // Set zScale height to match main canvas
    zScale.style.height = canvasHeight + 'px';
    
    // Clear existing content
    zScale.innerHTML = '';
    
    // Create canvas with wider width for better spacing
    this.canvas = document.createElement('canvas');
    this.canvas.width = 80;
    this.canvas.height = canvasHeight;
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.cursor = 'crosshair';
    
    this.ctx = this.canvas.getContext('2d');
    zScale.appendChild(this.canvas);
    

  }

  setupEventListeners() {
    // Listen to state changes
    EnderTrack.Events?.on?.('state:changed', () => {
      this.render();
    });
    
    // Listen to position changes
    EnderTrack.Events?.on?.('position:changed', () => {
      this.render();
    });
    
    // Listen to movement events
    EnderTrack.Events?.on?.('movement:started', () => {
      this.render();
    });
    
    EnderTrack.Events?.on?.('movement:completed', () => {
      this.render();
    });
    
    // Listen to history cleared event
    EnderTrack.Events?.on?.('history:cleared', () => {
      const state = EnderTrack.State.get();
      this.zRange = 50 / (state.zZoom || 1);
      setTimeout(() => this.render(), 50);
    });
    
    // Listen to input changes
    const inputs = ['inputZ', 'sensitivityZ'];
    inputs.forEach(id => {
      const input = document.getElementById(id);
      if (input) {
        input.addEventListener('input', () => this.render());
      }
    });
    
    // Listen to mode changes
    const modeButtons = ['relativeTab', 'absoluteTab'];
    modeButtons.forEach(id => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.addEventListener('click', () => {
          setTimeout(() => this.render(), 50);
        });
      }
    });
    
    // Add ResizeObserver to handle container resize
    if (this.canvas) {
      const zScale = document.getElementById('zScale');
      if (zScale && window.ResizeObserver) {
        this.resizeObserver = new ResizeObserver((entries) => {
          // Prevent resize loops by using requestAnimationFrame
          if (!this.resizePending) {
            this.resizePending = true;
            requestAnimationFrame(() => {
              this.resize();
              this.resizePending = false;
            });
          }
        });
        this.resizeObserver.observe(zScale);
      }
    }
    
    // Add mouse wheel zoom for Z-axis
    if (this.canvas) {
      this.canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        
        const state = EnderTrack.State.get();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const dimensions = state.plateauDimensions || { x: 200, y: 200, z: 100 };
        
        // Calculate minimum zoom to show full Z range (same as compass reset)
        const minZoom = this.canvas.height / dimensions.z;
        const currentZoom = state.zZoom || minZoom;
        const newZoom = Math.max(minZoom, Math.min(1000, currentZoom * delta));
        
        // Center zoom on current Z position (blue line)
        this.zPan = state.pos.z;
        
        EnderTrack.State.update({ zZoom: newZoom });
        this.zRange = this.canvas.height / newZoom;

        this.render();
      });
      
      // Add middle mouse button pan
      this.canvas.addEventListener('mousedown', (e) => {
        if (e.button === 1) { // Middle button
          e.preventDefault();
          this.isDragging = true;
          this.lastMouseY = e.clientY;
          this.canvas.style.cursor = 'grabbing';
        }
      });
      
      this.canvas.addEventListener('mousemove', (e) => {
        // Update mouse Z position with 0.01mm precision and plateau limits
        const rect = this.canvas.getBoundingClientRect();
        const canvasY = e.clientY - rect.top;
        const halfRange = this.zRange / 2;
        const rawZ = this.zPan + (0.5 - canvasY / this.canvas.height) * this.zRange;
        
        // Round to 0.01mm precision and clamp to plateau bounds
        const state = EnderTrack.State.get();
        const dimensions = state.plateauDimensions || { x: 200, y: 200, z: 100 };
        const halfSize = dimensions.z / 2;
        const clampedZ = Math.max(-halfSize, Math.min(halfSize, rawZ));
        this.mouseZ = Math.round(clampedZ * 100) / 100;

        
        // Check compass hover
        this.checkZCompassHover(canvasY);
        
        // Update cursor based on mode and hover state
        this.updateZCursor(canvasY, state);

        
        if (this.isDragging) {
          const deltaY = e.clientY - this.lastMouseY;
          const zMovement = (deltaY / this.canvas.height) * this.zRange;
          const newPan = this.zPan + zMovement;
          
          // Limit pan to Z boundaries
          const dimensions = state.plateauDimensions || { x: 200, y: 200, z: 100 };
          const halfSize = dimensions.z / 2;
          const maxPan = halfSize - this.zRange / 4; // Keep some margin
          const minPan = -halfSize + this.zRange / 4;
          
          this.zPan = Math.max(minPan, Math.min(maxPan, newPan));
          this.lastMouseY = e.clientY;
          this.render();
        } else {
          this.updateZInfo(state);
        }
      });
      
      this.canvas.addEventListener('mouseup', (e) => {
        if (e.button === 1) {
          this.isDragging = false;
          this.canvas.style.cursor = 'crosshair';
        }
      });
      
      this.canvas.addEventListener('mouseleave', () => {
        this.isDragging = false;
        this.canvas.style.cursor = 'crosshair';
        this.mouseZ = null;
        this.updateZInfo(EnderTrack.State.get());
      });
      
      // Add click to go functionality
      this.canvas.addEventListener('click', (e) => {

        if (e.button === 0) { // Left click
          const rect = this.canvas.getBoundingClientRect();
          const canvasX = e.clientX - rect.left;
          const canvasY = e.clientY - rect.top;
          
          // Check if click is on Z compass
          if (this.zCompassBounds && 
              canvasX >= this.zCompassBounds.x && canvasX <= this.zCompassBounds.x + this.zCompassBounds.width &&
              canvasY >= this.zCompassBounds.y && canvasY <= this.zCompassBounds.y + this.zCompassBounds.height) {
            // Reset Z zoom and pan to minimum zoom showing full range
            const state = EnderTrack.State.get();
            const dimensions = state.plateauDimensions || { x: 200, y: 200, z: 100 };
            const minZoom = this.canvas.height / dimensions.z;

            EnderTrack.State.update({ zZoom: minZoom });
            this.zPan = 0; // Center on origin
            this.zRange = this.canvas.height / minZoom;
            this.render();
            return;
          }
          
          const state = EnderTrack.State.get();
          
          // Check if clicking on existing Z history position in history mode
          if (state.historyMode && state.positionHistory) {
            const finalPositions = state.positionHistory.filter(p => p.isFinalPosition);
            const clickRadius = 8; // pixels
            const halfRange = this.zRange / 2;
            
            for (let i = 0; i < finalPositions.length; i++) {
              const pos = finalPositions[i];
              const posY = this.canvas.height/2 - ((pos.z - this.zPan) / halfRange) * (this.canvas.height/2);
              
              if (Math.abs(canvasY - posY) <= clickRadius) {
                // Click on existing Z position - go to that full XYZ position
                EnderTrack.State.goToHistoryPosition(i);
                return;
              }
            }
            // In history mode, don't allow click-and-go on empty areas
            return;
          }
          
          // FORCE Z click-and-go for testing (ignore locks)
          if (this.mouseZ !== null) {
            
            // Switch to absolute mode first
            if (state.inputMode !== 'absolute') {
              EnderTrack.State.update({ inputMode: 'absolute' });
              
              // Update UI tabs
              const absoluteTab = document.getElementById('absoluteTab');
              const relativeTab = document.getElementById('relativeTab');
              if (absoluteTab && relativeTab) {
                absoluteTab.classList.add('active');
                relativeTab.classList.remove('active');
              }
              
              const absoluteControls = document.getElementById('absoluteControls');
              const relativeControls = document.getElementById('relativeControls');
              if (absoluteControls && relativeControls) {
                absoluteControls.classList.add('active');
                relativeControls.classList.remove('active');
              }
            }
            
            // Update input Z immediately to trigger yellow line rendering
            const inputZ = document.getElementById('inputZ');
            if (inputZ) {
              inputZ.value = this.mouseZ.toFixed(2);
              // Trigger input event to update state and render yellow line
              inputZ.dispatchEvent(new Event('input', { bubbles: true }));
              
              // Update get button states
              if (window.updateGetButtonStates) {
                window.updateGetButtonStates();
              }
              
              setTimeout(() => this.render(), 10);
            }
            
            this.showZClickDialog(this.mouseZ, e.clientX, e.clientY);
          }
        }
      });
    }
  }

  render() {
    if (!this.isInitialized || !this.ctx) return;
    
    const state = EnderTrack.State.get();
    const canvasHeight = this.canvas.height;
    const canvasWidth = this.canvas.width;
    
    // Clear canvas completely with custom background color
    this.ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    const backgroundColor = window.customColors?.zBackground || '#1a1a1a';
    this.ctx.fillStyle = backgroundColor;
    this.ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    // Draw Z limits with custom color
    this.drawZLimits();
    
    // Draw grid
    this.drawGrid();
    
    // Draw origin (Z=0) - RED
    this.drawOrigin();
    
    // Draw current position - BLUE
    this.drawCurrentPosition(state);
    
    // Draw potential positions - YELLOW
    this.drawPotentialPositions(state);
    
    // Draw visited positions - GREEN
    this.drawVisitedPositions(state);
    
    // Draw Z compass
    this.drawZCompass();
    
    // Update Z info display
    this.updateZInfo(state);
  }

  drawGrid() {
    const canvasHeight = this.canvas.height;
    const canvasWidth = this.canvas.width;
    const state = EnderTrack.State.get();
    const dimensions = state.plateauDimensions || { x: 200, y: 200, z: 100 };
    const halfSize = dimensions.z / 2;
    const zZoom = state.zZoom || (canvasHeight / dimensions.z);
    
    const gridColor = window.customColors?.gridColor || '#404040';
    const scaleColor = window.customColors?.zScaleColor || '#ffffff';
    
    this.ctx.strokeStyle = gridColor;
    this.ctx.lineWidth = 0.3;
    this.ctx.font = '10px monospace';
    this.ctx.fillStyle = scaleColor;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    // Calculate grid spacing - at max zoom show 0.01mm grid
    const pixelsPerMm = zZoom;
    let interval;
    
    // At very high zoom, force 0.01mm grid
    if (zZoom >= 500) {
      interval = 0.01;
    } else {
      // Target 50-60 pixels between grid lines for better readability
      const targetSpacing = 55;
      const mmSpacing = targetSpacing / pixelsPerMm;
      
      // Round to nice intervals
      if (mmSpacing <= 0.01) interval = 0.01;
      else if (mmSpacing <= 0.02) interval = 0.02;
      else if (mmSpacing <= 0.05) interval = 0.05;
      else if (mmSpacing <= 0.1) interval = 0.1;
      else if (mmSpacing <= 0.2) interval = 0.2;
      else if (mmSpacing <= 0.5) interval = 0.5;
      else if (mmSpacing <= 1) interval = 1;
      else if (mmSpacing <= 2) interval = 2;
      else if (mmSpacing <= 5) interval = 5;
      else if (mmSpacing <= 10) interval = 10;
      else if (mmSpacing <= 20) interval = 20;
      else if (mmSpacing <= 50) interval = 50;
      else interval = 100;
    }
    
    // Calculate visible range but limit to plateau bounds
    const halfRange = this.zRange / 2;
    const visibleMinZ = this.zPan - halfRange;
    const visibleMaxZ = this.zPan + halfRange;
    
    // Clamp to plateau limits
    const minZ = Math.max(-halfSize, Math.floor(visibleMinZ / interval) * interval);
    const maxZ = Math.min(halfSize, Math.ceil(visibleMaxZ / interval) * interval);
    
    // Draw grid lines only within plateau bounds
    for (let z = minZ; z <= maxZ; z += interval) {
      // Skip if outside plateau bounds
      if (z < -halfSize || z > halfSize) continue;
      
      const y = canvasHeight/2 - ((z - this.zPan) / halfRange) * (canvasHeight/2);
      
      if (y >= 0 && y <= canvasHeight) {
        this.ctx.beginPath();
        this.ctx.moveTo(10, y);
        this.ctx.lineTo(canvasWidth - 5, y);
        this.ctx.stroke();
        
        // Show labels for grid lines - at 0.01mm grid, only show every 0.1mm
        const actualSpacing = interval * pixelsPerMm;
        let showLabel = false;
        
        if (interval === 0.01) {
          // At 0.01mm grid, only label every 0.1mm (every 10th line)
          showLabel = Math.abs(z % 0.1) < 0.005;
        } else {
          // Normal spacing rules
          showLabel = actualSpacing >= 20;
        }
        
        if (showLabel) {
          const label = interval <= 0.01 ? z.toFixed(2) : interval < 1 ? z.toFixed(1) : z.toString();
          
          // Background for readability
          this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
          this.ctx.fillRect(canvasWidth - 35, y - 6, 30, 12);
          
          // Label text
          this.ctx.fillStyle = scaleColor;
          this.ctx.fillText(label, canvasWidth - 20, y);
        }
      }
    }
    
    // At 0.01mm grid, add 0.1mm major graduations
    if (interval === 0.01) {
      const visibleMin01 = this.zPan - halfRange;
      const visibleMax01 = this.zPan + halfRange;
      const min01 = Math.max(-halfSize, Math.floor(visibleMin01 / 0.1) * 0.1);
      const max01 = Math.min(halfSize, Math.ceil(visibleMax01 / 0.1) * 0.1);
      
      for (let z = min01; z <= max01; z += 0.1) {
        // Skip if outside plateau bounds
        if (z < -halfSize || z > halfSize) continue;
        
        const y = canvasHeight/2 - ((z - this.zPan) / halfRange) * (canvasHeight/2);
        
        if (y >= 0 && y <= canvasHeight) {
          // Slightly thicker lines for 0.1mm graduations
          const majorGridColor = window.customColors?.gridColor || '#808080';
          this.ctx.strokeStyle = majorGridColor;
          this.ctx.lineWidth = 1;
          this.ctx.beginPath();
          this.ctx.moveTo(5, y);
          this.ctx.lineTo(canvasWidth - 2, y);
          this.ctx.stroke();
        }
      }
    }
  }

  drawOrigin() {
    const canvasHeight = this.canvas.height;
    const canvasWidth = this.canvas.width;
    const halfRange = this.zRange / 2;
    const originY = canvasHeight/2 - ((0 - this.zPan) / halfRange) * (canvasHeight/2);
    
    if (originY >= 0 && originY <= canvasHeight) {
      const originColor = window.customColors?.zOriginColor || '#ef4444';
      this.ctx.strokeStyle = originColor;
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(0, originY);
      this.ctx.lineTo(canvasWidth, originY);
      this.ctx.stroke();
    }
  }

  drawCurrentPosition(state) {
    const canvasHeight = this.canvas.height;
    const canvasWidth = this.canvas.width;
    const halfRange = this.zRange / 2;
    const currentY = canvasHeight/2 - ((state.pos.z - this.zPan) / halfRange) * (canvasHeight/2);
    
    // Render continuous movement Z vector (YELLOW)
    if (window.continuousVector && window.continuousVector.z) {
      const vector = window.continuousVector.z;
      const vectorLength = 20 + (vector.speed * 2); // 20-120px based on speed (1-50mm/s)
      
      // Calculate vector end position (dz: +1 = up, -1 = down)
      const vectorEndY = currentY - (vector.dz * vectorLength); // Negative because Y increases downward
      
      // Draw vector line
      this.ctx.strokeStyle = '#ffd700';
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.moveTo(canvasWidth/2, currentY);
      this.ctx.lineTo(canvasWidth/2, vectorEndY);
      this.ctx.stroke();
      
      // Draw arrowhead
      const arrowSize = 8;
      
      this.ctx.fillStyle = '#ffd700';
      this.ctx.beginPath();
      this.ctx.moveTo(canvasWidth/2, vectorEndY);
      
      if (vector.dz > 0) {
        // Arrow pointing up (Z+)
        this.ctx.lineTo(canvasWidth/2 - arrowSize/2, vectorEndY + arrowSize);
        this.ctx.lineTo(canvasWidth/2 + arrowSize/2, vectorEndY + arrowSize);
      } else {
        // Arrow pointing down (Z-)
        this.ctx.lineTo(canvasWidth/2 - arrowSize/2, vectorEndY - arrowSize);
        this.ctx.lineTo(canvasWidth/2 + arrowSize/2, vectorEndY - arrowSize);
      }
      
      this.ctx.closePath();
      this.ctx.fill();
    }
    
    if (currentY >= 0 && currentY <= canvasHeight) {
      const currentPositionColor = window.customColors?.zCurrentPosition || '#4f9eff';
      this.ctx.strokeStyle = currentPositionColor;
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.moveTo(0, currentY);
      this.ctx.lineTo(canvasWidth, currentY);
      this.ctx.stroke();
    }
  }

  drawPotentialPositions(state) {
    // Only show potential positions in live mode, not in history mode
    if (state.historyMode) return;
    
    // Check if Z future positions should be shown
    const showFuturePositionsZ = document.getElementById('showFuturePositionsZ');
    if (showFuturePositionsZ && !showFuturePositionsZ.checked) return;
    
    // Hide overlays in controller continuous mode
    if (state.inputMode === 'relative' && window.EnderTrack?.KeyboardMode?.isActive && (window.controllerMode || 'step') === 'continuous') {
      return;
    }
    
    const canvasHeight = this.canvas.height;
    const canvasWidth = this.canvas.width;
    const halfRange = this.zRange / 2;
    
    if (state.inputMode === 'relative' && !state.lockZ) {
      const sensitivityZ = state.sensitivityZ || 0.5;
      
      // Z up position
      const zUpY = canvasHeight/2 - (((state.pos.z + sensitivityZ) - this.zPan) / halfRange) * (canvasHeight/2);
      if (zUpY >= 0 && zUpY <= canvasHeight) {
        this.ctx.strokeStyle = '#ffc107';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(5, zUpY);
        this.ctx.lineTo(canvasWidth - 5, zUpY);
        this.ctx.stroke();
      }
      
      // Z down position
      const zDownY = canvasHeight/2 - (((state.pos.z - sensitivityZ) - this.zPan) / halfRange) * (canvasHeight/2);
      if (zDownY >= 0 && zDownY <= canvasHeight) {
        this.ctx.strokeStyle = '#ffc107';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(5, zDownY);
        this.ctx.lineTo(canvasWidth - 5, zDownY);
        this.ctx.stroke();
      }
    } else if (state.inputMode === 'absolute') {
      const inputZ = document.getElementById('inputZ');
      if (inputZ) {
        const futureZ = parseFloat(inputZ.value) || 0;
        // Always show yellow line if there's any difference
        if (futureZ !== state.pos.z) {
          const futureY = canvasHeight/2 - ((futureZ - this.zPan) / halfRange) * (canvasHeight/2);
          if (futureY >= 0 && futureY <= canvasHeight) {
            // Make yellow line more visible when close to blue line
            const distanceFromCurrent = Math.abs(futureY - (canvasHeight/2 - ((state.pos.z - this.zPan) / halfRange) * (canvasHeight/2)));
            
            if (distanceFromCurrent < 5) {
              // Very close - use dashed yellow line with thicker stroke
              this.ctx.strokeStyle = '#ffc107';
              this.ctx.lineWidth = 4;
              this.ctx.setLineDash([8, 4]);
            } else {
              // Normal distance - solid yellow line
              this.ctx.strokeStyle = '#ffc107';
              this.ctx.lineWidth = 3;
              this.ctx.setLineDash([]);
            }
            
            this.ctx.beginPath();
            this.ctx.moveTo(0, futureY);
            this.ctx.lineTo(canvasWidth, futureY);
            this.ctx.stroke();
            this.ctx.setLineDash([]); // Reset dash
          }
        }
      }
    }
  }

  drawVisitedPositions(state) {
    // Check if Z history should be shown - default to true if not set
    const showPositionZHistory = document.getElementById('showPositionZHistory');
    if (showPositionZHistory && !showPositionZHistory.checked) return;
    
    const canvasHeight = this.canvas.height;
    const canvasWidth = this.canvas.width;
    const halfRange = this.zRange / 2;
    
    if (state.positionHistory && state.positionHistory.length > 1) {
      const visited = state.positionHistory.filter(pos => pos.isFinalPosition);
      
      visited.forEach((pos, index) => {
        const visitedY = canvasHeight/2 - ((pos.z - this.zPan) / halfRange) * (canvasHeight/2);
        if (visitedY >= 0 && visitedY <= canvasHeight) {
          // Skip current position (will be drawn as blue line)
          if (Math.abs(pos.z - state.pos.z) > 0.01) {
            const historyColor = window.customColors?.zHistoryPosition || '#10b981';
            this.ctx.strokeStyle = historyColor + '66'; // Add transparency
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.moveTo(8, visitedY);
            this.ctx.lineTo(canvasWidth - 8, visitedY);
            this.ctx.stroke();
          }
          
          // Numéro en overlay seulement en mode historique
          if (state.historyMode) {
            const isCurrentHistory = state.historyIndex === index;
            this.ctx.fillStyle = isCurrentHistory ? '#4f9eff' : '#ffffff';
            this.ctx.strokeStyle = '#000000';
            this.ctx.lineWidth = 1;
            this.ctx.font = 'bold 10px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            
            const number = (index + 1).toString();
            
            // Contour noir pour lisibilité
            this.ctx.strokeText(number, canvasWidth - 15, visitedY);
            // Texte blanc/bleu
            this.ctx.fillText(number, canvasWidth - 15, visitedY);
          }
        }
      });
    }
  }

  updateZInfo(state) {
    // Create or update Z info display in the main canvas area
    let zInfo = document.getElementById('zInfo');
    if (!zInfo) {
      zInfo = document.createElement('div');
      zInfo.id = 'zInfo';
      zInfo.className = 'z-info';
      
      // Add to main canvas container instead of Z panel
      const mainCanvas = document.querySelector('.main-canvas');
      if (mainCanvas) {
        mainCanvas.appendChild(zInfo);
      }
    }
    
    const dimensions = state.plateauDimensions || { x: 200, y: 200, z: 100 };
    const minZoom = this.canvas.height / dimensions.z;
    const zZoom = state.zZoom || minZoom;
    const mouseZText = this.mouseZ !== null ? this.mouseZ.toFixed(2) : '---';
    
    // Calculate display zoom (pixels per mm)
    const displayZoom = zZoom;
    
    // Format to match XY info style exactly with yellow coordinates
    const zStr = mouseZText.padStart(7, '\u00A0');
    zInfo.innerHTML = `Z: <span style="color: #ffc107; font-family: monospace;">${zStr}</span> | Z-Zoom: ${displayZoom.toFixed(1)}x | Z-Pan: ${this.zPan.toFixed(1)}`;
  }

  showZClickDialog(targetZ, screenX, screenY) {
    // Use same dialog system as canvas XY
    this.showClickAndGoDialog({ z: targetZ }, screenX, screenY);
  }
  
  showClickAndGoDialog(pos, screenX, screenY) {
    // Remove any existing dialog
    const existingDialog = document.querySelector('.click-and-go-dialog');
    if (existingDialog) {
      existingDialog.remove();
    }
    
    // Create dialog with same style as canvas XY
    const dialog = document.createElement('div');
    dialog.className = 'click-and-go-dialog';
    dialog.style.cssText = `
      position: fixed;
      left: ${screenX + 10}px;
      top: ${screenY - 60}px;
      background: #2c2c2c;
      border: 1px solid #666;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10000;
      padding: 12px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      min-width: 200px;
      animation: fadeIn 0.2s ease-out;
    `;
    
    dialog.innerHTML = `
      <div style="margin-bottom: 12px; font-size: 15px; font-family: monospace;">
        <span style="color: #aaa;">Z:</span><span style="color: #ffc107;">${pos.z.toFixed(2)}</span>
      </div>
      <div style="display: flex; gap: 8px;">
        <button class="go-btn" style="
          background: #0b84ff;
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
        ">Go</button>
        <button class="cancel-btn" style="
          background: #444;
          color: #ccc;
          border: none;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
        ">Cancel</button>
      </div>
    `;
    
    // Position dialog to stay within viewport
    document.body.appendChild(dialog);
    const rect = dialog.getBoundingClientRect();
    
    let adjustedX = screenX + 10;
    let adjustedY = screenY - 60;
    
    if (rect.right > window.innerWidth) {
      adjustedX = screenX - rect.width - 10;
    }
    if (rect.top < 0) {
      adjustedY = screenY + 10;
    }
    if (rect.bottom > window.innerHeight) {
      adjustedY = window.innerHeight - rect.height - 10;
    }
    
    dialog.style.left = adjustedX + 'px';
    dialog.style.top = adjustedY + 'px';
    
    // Button handlers
    const goBtn = dialog.querySelector('.go-btn');
    const cancelBtn = dialog.querySelector('.cancel-btn');
    
    goBtn.addEventListener('click', () => {
      // Move to Z position
      if (EnderTrack.Movement) {
        const state = EnderTrack.State.get();
        EnderTrack.Movement.moveAbsolute(state.pos.x, state.pos.y, pos.z);
      }
      dialog.remove();
    });
    
    cancelBtn.addEventListener('click', () => {
      dialog.remove();
    });
    
    // Close handlers
    const closeDialog = (e) => {
      if (e.type === 'keydown' && e.key === 'Escape') {
        dialog.remove();
        document.removeEventListener('keydown', closeDialog);
        document.removeEventListener('click', closeDialog);
      } else if (e.type === 'click' && !dialog.contains(e.target)) {
        dialog.remove();
        document.removeEventListener('keydown', closeDialog);
        document.removeEventListener('click', closeDialog);
      }
    };
    
    setTimeout(() => {
      document.addEventListener('keydown', closeDialog);
      document.addEventListener('click', closeDialog);
    }, 100);
    
    goBtn.focus();
  }

  // Draw Z limits (white lines at boundaries)
  drawZLimits() {
    const canvasHeight = this.canvas.height;
    const canvasWidth = this.canvas.width;
    const state = EnderTrack.State.get();
    const dimensions = state.plateauDimensions || { x: 200, y: 200, z: 100 };
    const halfSize = dimensions.z / 2;
    
    // Calculate Y positions for limits using current view range
    const halfRange = this.zRange / 2;
    const topLimitY = canvasHeight/2 - ((halfSize - this.zPan) / halfRange) * (canvasHeight/2);
    const bottomLimitY = canvasHeight/2 - ((-halfSize - this.zPan) / halfRange) * (canvasHeight/2);
    
    const scaleColor = window.customColors?.zScaleColor || '#ffffff';
    this.ctx.strokeStyle = scaleColor;
    this.ctx.lineWidth = 3;
    
    // Always draw limit lines if they're in view
    if (topLimitY >= -10 && topLimitY <= canvasHeight + 10) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, Math.max(0, Math.min(canvasHeight, topLimitY)));
      this.ctx.lineTo(canvasWidth, Math.max(0, Math.min(canvasHeight, topLimitY)));
      this.ctx.stroke();
    }
    
    if (bottomLimitY >= -10 && bottomLimitY <= canvasHeight + 10) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, Math.max(0, Math.min(canvasHeight, bottomLimitY)));
      this.ctx.lineTo(canvasWidth, Math.max(0, Math.min(canvasHeight, bottomLimitY)));
      this.ctx.stroke();
    }
  }
  
  // Draw Z compass (matching XY compass style)
  drawZCompass() {
    const canvasWidth = this.canvas.width;
    const canvasHeight = this.canvas.height;
    
    // Compass position (centered horizontally, matching XY compass height)
    const centerX = canvasWidth / 2; // Center horizontally in Z canvas
    const centerY = 40; // Match XY compass Y position
    const baseRadius = 20; // Match XY compass radius
    const isHovered = this.zCompassHovered || false;
    const radius = isHovered ? baseRadius + 2 : baseRadius;
    
    // Store bounds for click detection
    this.zCompassBounds = {
      x: centerX - baseRadius - 2,
      y: centerY - baseRadius - 2,
      width: (baseRadius + 2) * 2,
      height: (baseRadius + 2) * 2
    };
    
    // Background circle (matching XY compass style)
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
    
    // Z+ arrow (blue, pointing up - matching XY compass colors)
    this.ctx.strokeStyle = '#4f9eff';
    this.ctx.lineWidth = isHovered ? 3 : 2;
    this.ctx.beginPath();
    this.ctx.moveTo(centerX, centerY);
    this.ctx.lineTo(centerX, centerY - radius + 5);
    this.ctx.stroke();
    
    // Arrow head (pointing up)
    this.ctx.fillStyle = '#4f9eff';
    this.ctx.beginPath();
    this.ctx.moveTo(centerX, centerY - radius + 5);
    this.ctx.lineTo(centerX - 4, centerY - radius + 11);
    this.ctx.lineTo(centerX + 4, centerY - radius + 11);
    this.ctx.closePath();
    this.ctx.fill();
    
    // Label
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = isHovered ? 'bold 10px sans-serif' : '10px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Z+', centerX, centerY - radius - 5);
  }
  
  // Check Z compass hover
  checkZCompassHover(canvasY) {
    const wasHovered = this.zCompassHovered || false;
    
    if (this.zCompassBounds) {
      const bounds = this.zCompassBounds;
      this.zCompassHovered = canvasY >= bounds.y && canvasY <= bounds.y + bounds.height;
    } else {
      this.zCompassHovered = false;
    }
    
    // Re-render if hover state changed
    if (wasHovered !== this.zCompassHovered) {
      this.render();
    }
  }
  
  // Update Z canvas cursor based on mode and hover state
  updateZCursor(canvasY, state) {
    if (this.zCompassHovered) {
      this.canvas.style.cursor = 'pointer';
      return;
    }
    

    
    if (state.historyMode && state.positionHistory) {
      // Check if hovering over history Z position
      const finalPositions = state.positionHistory.filter(p => p.isFinalPosition);
      const clickRadius = 8;
      const halfRange = this.zRange / 2;
      let overHistoryZ = false;
      
      for (const pos of finalPositions) {
        const posY = this.canvas.height/2 - ((pos.z - this.zPan) / halfRange) * (this.canvas.height/2);
        if (Math.abs(canvasY - posY) <= clickRadius) {
          overHistoryZ = true;
          break;
        }
      }
      
      this.canvas.style.cursor = overHistoryZ ? 'pointer' : 'default';
    } else {
      // Live mode - always crosshair for testing
      this.canvas.style.cursor = 'crosshair';
    }
  }

  // Public API
  update() {
    this.render();
  }

  resize() {
    if (this.canvas) {
      // Get main canvas height to stay aligned
      const mainCanvas = document.getElementById('mapCanvas');
      const zScale = document.getElementById('zScale');
      
      if (mainCanvas && zScale) {
        const newHeight = mainCanvas.offsetHeight;
        const newWidth = 80;
        
        // Update zScale height to match main canvas
        zScale.style.height = newHeight + 'px';
        
        // Only update if dimensions actually changed
        if (this.canvas.height !== newHeight || this.canvas.width !== newWidth) {
          this.canvas.width = newWidth;
          this.canvas.height = newHeight;
          
          // Recalculate zoom minimum based on new height
          const state = EnderTrack.State.get();
          const dimensions = state.plateauDimensions || { x: 200, y: 200, z: 100 };
          const minZoom = newHeight / dimensions.z;
          
          // Update zoom if it's below new minimum
          if (state.zZoom < minZoom) {
            EnderTrack.State.update({ zZoom: minZoom });
          }
          
          // Update range
          this.zRange = newHeight / (state.zZoom || minZoom);
          
          // Re-render after resize
          setTimeout(() => this.render(), 10);
        }
      }
    }
  }
}

// Global instance
window.EnderTrack = window.EnderTrack || {};
window.EnderTrack.ZVisualization = new ZVisualization();