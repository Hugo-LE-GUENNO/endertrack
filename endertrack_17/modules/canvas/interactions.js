// modules/canvas/interactions.js - Canvas mouse/touch interactions

class CanvasInteractions {
  constructor() {
    this.canvas = null;
    this.isInitialized = false;
    this.isDragging = false;
    this.isPanning = false;
    this.lastMousePos = { x: 0, y: 0 };
    this.dragStartPos = { x: 0, y: 0 };
    this.touchStartDistance = 0;
    this.touchStartZoom = 1;
  }

  init(canvas) {
    this.canvas = canvas;
    
    // Set initial cursor
    this.canvas.style.cursor = 'default';
    
    // Setup event listeners
    this.setupMouseEvents();
    this.setupTouchEvents();
    this.setupKeyboardEvents();
    this.setupWheelEvents();
    
    this.isInitialized = true;
    
    return true;
  }

  setupMouseEvents() {
    // Mouse down
    this.canvas.addEventListener('mousedown', (e) => {
      this.handlePointerStart(e.clientX, e.clientY, e);
    });
    
    // Mouse move
    this.canvas.addEventListener('mousemove', (e) => {
      this.handlePointerMove(e.clientX, e.clientY, e);
    });
    
    // Mouse up
    this.canvas.addEventListener('mouseup', (e) => {
      this.handlePointerEnd(e.clientX, e.clientY, e);
    });
    
    // Mouse leave
    this.canvas.addEventListener('mouseleave', (e) => {
      this.clearMouseCoordinates();
      this.compassHovered = false;
      if (EnderTrack.Canvas) {
        EnderTrack.Canvas.compassHovered = false;
        EnderTrack.Canvas.requestRender();
      }
      this.handlePointerEnd(e.clientX, e.clientY, e);
    });
    
    // Click
    this.canvas.addEventListener('click', (e) => {
      this.handleClick(e.clientX, e.clientY, e);
    });
    
    // Double click
    this.canvas.addEventListener('dblclick', (e) => {
      this.handleDoubleClick(e.clientX, e.clientY, e);
    });
    
    // Context menu
    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.handleRightClick(e.clientX, e.clientY, e);
    });
  }

  setupTouchEvents() {
    // Touch start
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        this.handlePointerStart(touch.clientX, touch.clientY, e);
      } else if (e.touches.length === 2) {
        this.handlePinchStart(e);
      }
    });
    
    // Touch move
    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        this.handlePointerMove(touch.clientX, touch.clientY, e);
      } else if (e.touches.length === 2) {
        this.handlePinchMove(e);
      }
    });
    
    // Touch end
    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      
      if (e.touches.length === 0) {
        this.handlePointerEnd(0, 0, e);
      }
    });
  }

  setupKeyboardEvents() {
    // Canvas needs to be focusable for keyboard events
    this.canvas.tabIndex = 0;
    
    this.canvas.addEventListener('keydown', (e) => {
      this.handleKeyDown(e);
    });
    
    this.canvas.addEventListener('keyup', (e) => {
      this.handleKeyUp(e);
    });
  }

  setupWheelEvents() {
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.handleWheel(e);
    });
  }

  // Pointer event handlers
  handlePointerStart(screenX, screenY, event) {
    const canvasPos = this.screenToCanvas(screenX, screenY);
    
    // Check if this is a pan operation (middle click or shift+click)
    const isPanOperation = event.button === 1 || (event.button === 0 && event.shiftKey);
    

    
    this.isDragging = true;
    this.isPanning = isPanOperation;
    this.lastMousePos = { x: screenX, y: screenY };
    this.dragStartPos = { x: screenX, y: screenY };
    
    // Change cursor for pan operation
    if (this.isPanning) {
      this.canvas.style.cursor = 'grabbing';
    }
    
    // Update state
    EnderTrack.State.update({
      isDragging: true,
      isPanning: this.isPanning,
      lastMouseX: screenX,
      lastMouseY: screenY
    });
    
    // Emit event
    EnderTrack.Events.emit('canvas:pointer:start', {
      screen: { x: screenX, y: screenY },
      canvas: canvasPos,
      isPanning: this.isPanning,
      originalEvent: event
    });
  }

  handlePointerMove(screenX, screenY, event) {
    const canvasPos = this.screenToCanvas(screenX, screenY);
    
      // Check if hovering over compass
    this.checkCompassHover(canvasPos);
    
    // Update mouse coordinates display (this will also set cursor)
    this.updateMouseCoordinates(canvasPos, event);
    
    // Override cursor for special modes
    if (!this.isDragging && event.shiftKey) {
      this.canvas.style.cursor = 'grab';
    } else if (this.compassHovered) {
      this.canvas.style.cursor = 'pointer';
    } else {
      // Check if hovering over history point in history mode
      const state = EnderTrack.State.get();
      if (state.historyMode && state.positionHistory) {
        const finalPositions = state.positionHistory.filter(p => p.isFinalPosition);
        const clickRadius = 8;
        let overHistoryPoint = false;
        
        for (const pos of finalPositions) {
          const zoom = state.zoom || 1;
          const panX = state.panX || 0;
          const panY = state.panY || 0;
          const centerX = this.canvas.width / 2;
          const centerY = this.canvas.height / 2;
          
          const posX = centerX + panX + (pos.x * zoom);
          const posY = centerY + panY + (pos.y * zoom);
          
          const distance = Math.sqrt(Math.pow(canvasPos.cx - posX, 2) + Math.pow(canvasPos.cy - posY, 2));
          if (distance <= clickRadius) {
            overHistoryPoint = true;
            break;
          }
        }
        
        if (!this.compassHovered && !event?.shiftKey) {
          this.canvas.style.cursor = overHistoryPoint ? 'pointer' : (isOnPlateau ? 'crosshair' : 'default');
        }
      }
    }
    
    if (this.isDragging && this.isPanning) {
      const deltaX = screenX - this.lastMousePos.x;
      const deltaY = screenY - this.lastMousePos.y;
      
      // Pan the canvas
      this.handlePan(deltaX, deltaY);
    }
    
    this.lastMousePos = { x: screenX, y: screenY };
    
    // Update state
    EnderTrack.State.update({
      lastMouseX: screenX,
      lastMouseY: screenY
    });
    
    // Emit event
    EnderTrack.Events.emit('canvas:pointer:move', {
      screen: { x: screenX, y: screenY },
      canvas: canvasPos,
      isDragging: this.isDragging,
      isPanning: this.isPanning,
      originalEvent: event
    });
  }

  handlePointerEnd(screenX, screenY, event) {
    const canvasPos = this.screenToCanvas(screenX, screenY);
    
    this.isDragging = false;
    this.isPanning = false;
    
    // Reset cursor
    this.canvas.style.cursor = 'default';
    
    // Update state
    EnderTrack.State.update({
      isDragging: false,
      isPanning: false
    });
    
    // Emit event
    EnderTrack.Events.emit('canvas:pointer:end', {
      screen: { x: screenX, y: screenY },
      canvas: canvasPos,
      originalEvent: event
    });
  }

  handleClick(screenX, screenY, event) {
    const canvasPos = this.screenToCanvas(screenX, screenY);
    
    // Check if this was a drag operation
    const dragDistance = Math.sqrt(
      Math.pow(screenX - this.dragStartPos.x, 2) + 
      Math.pow(screenY - this.dragStartPos.y, 2)
    );
    
    if (dragDistance > 5) {
      // This was a drag, not a click
      return;
    }
    
    // Check if click is on compass (fit to view)
    if (EnderTrack.Canvas.compassBounds) {
      const bounds = EnderTrack.Canvas.compassBounds;
      if (canvasPos.cx >= bounds.x && canvasPos.cx <= bounds.x + bounds.width &&
          canvasPos.cy >= bounds.y && canvasPos.cy <= bounds.y + bounds.height) {
        this.fitToView();
        return;
      }
    }
    
    // Use same coordinate calculation as mouse coordinates display
    const state = EnderTrack.State.get();
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const zoom = state.zoom || 1;
    const panX = state.panX || 0;
    const panY = state.panY || 0;
    
    const mapX = (canvasPos.cx - centerX - panX) / zoom;
    const mapY = (canvasPos.cy - centerY - panY) / zoom;
    const mapPos = { x: mapX, y: mapY };
    
    // Check if click is within plateau bounds
    const plateauDimensions = state.plateauDimensions || { x: 200, y: 200, z: 100 };
    const halfX = plateauDimensions.x / 2;
    const halfY = plateauDimensions.y / 2;
    const isOnPlateau = Math.abs(mapX) <= halfX && Math.abs(mapY) <= halfY;
    
    // Handle Lists mode click
    if (window.EnderTrack?.Lists?.isActive && window.EnderTrack.Lists.currentMode === 'click' && isOnPlateau) {
      // Lists module will handle this click via its own event listener
      return;
    }
    
    // Check if clicking on existing history point in history mode
    if (state.historyMode && state.positionHistory) {
      const finalPositions = state.positionHistory.filter(p => p.isFinalPosition);
      const clickRadius = 8; // pixels
      
      for (let i = 0; i < finalPositions.length; i++) {
        const pos = finalPositions[i];
        const posX = centerX + panX + (pos.x * zoom);
        const posY = centerY + panY + (pos.y * zoom);
        
        const distance = Math.sqrt(Math.pow(canvasPos.cx - posX, 2) + Math.pow(canvasPos.cy - posY, 2));
        if (distance <= clickRadius) {
          // Click on existing point - go to that position
          EnderTrack.State.goToHistoryPosition(i);
          return;
        }
      }
      // In history mode, don't allow click-and-go on empty areas
      return;
    }
    
    // Update inputs if on plateau and in absolute mode
    if (isOnPlateau) {
      const currentInputMode = state.inputMode || 'relative';
      
      if (currentInputMode === 'absolute') {
        // Determine which inputs to use based on coupling mode
        const isCoupled = state.lockXY;
        const inputX = document.getElementById(isCoupled ? 'inputX' : 'inputXSep');
        const inputY = document.getElementById(isCoupled ? 'inputY' : 'inputYSep');
        const inputZ = document.getElementById('inputZ');
        
        // Start with mouse coordinates, then apply lock filters
        let targetPosition = {
          x: state.lockX ? parseFloat(inputX?.value || 0) : mapPos.x,
          y: state.lockY ? parseFloat(inputY?.value || 0) : mapPos.y,
          z: state.lockZ ? parseFloat(inputZ?.value || 0) : state.pos.z
        };
        
        // Update inputs with filtered coordinates
        if (inputX && !state.lockX) {
          inputX.value = targetPosition.x.toFixed(2);
          inputX.dispatchEvent(new Event('input', { bubbles: true }));
        }
        if (inputY && !state.lockY) {
          inputY.value = targetPosition.y.toFixed(2);
          inputY.dispatchEvent(new Event('input', { bubbles: true }));
        }
        if (inputZ && !state.lockZ) {
          inputZ.value = targetPosition.z.toFixed(2);
          inputZ.dispatchEvent(new Event('input', { bubbles: true }));
        }
        
        // Update get button states
        if (window.updateGetButtonStates) {
          window.updateGetButtonStates();
        }
        
        // Force immediate canvas render to show yellow dot
        if (EnderTrack.Canvas) {
          EnderTrack.Canvas.requestRender();
        }
        
        // Show dialog only if not in history mode
        if (!state.historyMode) {
          this.showClickAndGoDialog(targetPosition, screenX, screenY);
        }
      } else if (!state.historyMode) {
        // Switch to absolute mode and fill inputs before showing dialog
        if (EnderTrack.Navigation) {
          EnderTrack.Navigation.setInputMode('absolute');
        }
        
        // Wait for mode switch to complete, then update inputs
        setTimeout(() => {
          const updatedState = EnderTrack.State.get();
          const isCoupled = updatedState.lockXY;
          const inputX = document.getElementById(isCoupled ? 'inputX' : 'inputXSep');
          const inputY = document.getElementById(isCoupled ? 'inputY' : 'inputYSep');
          const inputZ = document.getElementById('inputZ');
          
          // Start with mouse coordinates, then apply lock filters
          let targetPosition = {
            x: updatedState.lockX ? parseFloat(inputX?.value || 0) : mapPos.x,
            y: updatedState.lockY ? parseFloat(inputY?.value || 0) : mapPos.y,
            z: updatedState.lockZ ? parseFloat(inputZ?.value || 0) : updatedState.pos.z
          };
          
          // Update inputs with filtered coordinates
          if (inputX && !updatedState.lockX) {
            inputX.value = targetPosition.x.toFixed(2);
            inputX.dispatchEvent(new Event('input', { bubbles: true }));
          }
          if (inputY && !updatedState.lockY) {
            inputY.value = targetPosition.y.toFixed(2);
            inputY.dispatchEvent(new Event('input', { bubbles: true }));
          }
          if (inputZ && !updatedState.lockZ) {
            inputZ.value = targetPosition.z.toFixed(2);
            inputZ.dispatchEvent(new Event('input', { bubbles: true }));
          }
          
          // Update get button states
          if (window.updateGetButtonStates) {
            window.updateGetButtonStates();
          }
          
          // Force canvas render
          if (EnderTrack.Canvas) {
            EnderTrack.Canvas.requestRender();
          }
        }, 50);
        
        // Force immediate canvas render to show yellow dot
        if (EnderTrack.Canvas) {
          EnderTrack.Canvas.requestRender();
        }
        
        // Déclarer targetPosition pour le mode relatif
        let targetPosition = {
          x: mapPos.x,
          y: mapPos.y,
          z: state.pos.z
        };
        this.showClickAndGoDialog(targetPosition, screenX, screenY);
      }
    }
    
    // Emit event
    EnderTrack.Events.emit('canvas:clicked', {
      screen: { x: screenX, y: screenY },
      canvas: canvasPos,
      map: mapPos,
      originalEvent: event
    });
  }

  handleDoubleClick(screenX, screenY, event) {
    const canvasPos = this.screenToCanvas(screenX, screenY);
    const mapPos = EnderTrack.Coordinates.canvasToMap(canvasPos.cx, canvasPos.cy);
    
    // Double click to center on position
    this.centerOnPosition(mapPos.x, mapPos.y);
    
    // Emit event
    EnderTrack.Events.emit('canvas:double_clicked', {
      screen: { x: screenX, y: screenY },
      canvas: canvasPos,
      map: mapPos,
      originalEvent: event
    });
  }

  handleRightClick(screenX, screenY, event) {
    const canvasPos = this.screenToCanvas(screenX, screenY);
    const mapPos = EnderTrack.Coordinates.canvasToMap(canvasPos.cx, canvasPos.cy);
    
    // Show context menu
    this.showContextMenu(screenX, screenY, mapPos);
    
    // Emit event
    EnderTrack.Events.emit('canvas:right_clicked', {
      screen: { x: screenX, y: screenY },
      canvas: canvasPos,
      map: mapPos,
      originalEvent: event
    });
  }

  // Touch-specific handlers
  handlePinchStart(event) {
    if (event.touches.length !== 2) return;
    
    const touch1 = event.touches[0];
    const touch2 = event.touches[1];
    
    this.touchStartDistance = Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) + 
      Math.pow(touch2.clientY - touch1.clientY, 2)
    );
    
    this.touchStartZoom = EnderTrack.State.get().zoom || 1;
  }

  handlePinchMove(event) {
    if (event.touches.length !== 2) return;
    
    const touch1 = event.touches[0];
    const touch2 = event.touches[1];
    
    const currentDistance = Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) + 
      Math.pow(touch2.clientY - touch1.clientY, 2)
    );
    
    if (this.touchStartDistance > 0) {
      const zoomFactor = currentDistance / this.touchStartDistance;
      const newZoom = this.touchStartZoom * zoomFactor;
      
      this.handleZoom(newZoom, {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2
      });
    }
  }

  // Keyboard handlers
  handleKeyDown(event) {
    const keyName = EnderTrack.KeyboardUtils.getKeyName(event);
    const modifiers = EnderTrack.KeyboardUtils.getModifiers(event);
    
    // Handle navigation keys
    if (this.handleNavigationKey(keyName, modifiers)) {
      event.preventDefault();
      return;
    }
    
    // Handle zoom keys
    if (this.handleZoomKey(keyName, modifiers)) {
      event.preventDefault();
      return;
    }
    
    // Emit event for other handlers
    EnderTrack.Events.emit('canvas:key_down', {
      key: keyName,
      modifiers,
      originalEvent: event
    });
  }

  handleKeyUp(event) {
    const keyName = EnderTrack.KeyboardUtils.getKeyName(event);
    const modifiers = EnderTrack.KeyboardUtils.getModifiers(event);
    
    EnderTrack.Events.emit('canvas:key_up', {
      key: keyName,
      modifiers,
      originalEvent: event
    });
  }

  handleNavigationKey(key, modifiers) {
    const state = EnderTrack.State.get();
    const shortcuts = state.keyboardShortcuts;
    
    // Map keys to directions
    const keyToDirection = {
      [shortcuts.up]: 'up',
      [shortcuts.down]: 'down',
      [shortcuts.left]: 'left',
      [shortcuts.right]: 'right',
      [shortcuts.zUp]: 'zUp',
      [shortcuts.zDown]: 'zDown'
    };
    
    const direction = keyToDirection[key];
    if (!direction) return false;
    
    // Use navigation system to move
    if (EnderTrack.Navigation) {
      EnderTrack.Navigation.moveDirection(direction);
    }
    
    return true;
  }

  handleZoomKey(key, modifiers) {
    if (modifiers.ctrl) {
      switch (key) {
        case '=':
        case '+':
          this.handleZoom(EnderTrack.State.get().zoom * 1.2);
          return true;
        case '-':
          this.handleZoom(EnderTrack.State.get().zoom / 1.2);
          return true;
        case '0':
          this.handleZoom(1);
          return true;
      }
    }
    
    return false;
  }

  // Wheel handler
  handleWheel(event) {
    const delta = -event.deltaY;
    const zoomFactor = delta > 0 ? 1.05 : 1/1.05;
    
    const currentZoom = EnderTrack.State.get().zoom || 1;
    const newZoom = currentZoom * zoomFactor;
    
    // Zoom towards mouse position
    const mousePos = { x: event.clientX, y: event.clientY };
    this.handleZoom(newZoom, mousePos);
  }

  // Action handlers
  handlePan(deltaX, deltaY) {
    const state = EnderTrack.State.get();
    const plateauDimensions = state.plateauDimensions || { x: 200, y: 200, z: 100 };
    const zoom = state.zoom || 1;
    
    // Calculate plateau bounds in pixels
    const plateauSizeXPx = plateauDimensions.x * zoom;
    const plateauSizeYPx = plateauDimensions.y * zoom;
    
    // Calculate pan limits (keep at least 20% of plateau visible)
    const marginX = plateauSizeXPx * 0.2;
    const marginY = plateauSizeYPx * 0.2;
    const maxPanX = plateauSizeXPx / 2 - marginX;
    const maxPanY = plateauSizeYPx / 2 - marginY;
    
    const newPanX = (state.panX || 0) + deltaX;
    const newPanY = (state.panY || 0) + deltaY;
    
    // Clamp pan values
    const clampedPanX = EnderTrack.Math.clamp(newPanX, -maxPanX, maxPanX);
    const clampedPanY = EnderTrack.Math.clamp(newPanY, -maxPanY, maxPanY);
    
    EnderTrack.State.update({
      panX: clampedPanX,
      panY: clampedPanY
    });
  }

  handleZoom(newZoom, centerPoint = null) {
    // Calculate minimum zoom based on plateau size and canvas size
    const state = EnderTrack.State.get();
    const plateauDimensions = state.plateauDimensions || { x: 200, y: 200, z: 100 };
    const canvasSize = Math.min(this.canvas.width, this.canvas.height);
    const maxPlateauSize = Math.max(plateauDimensions.x, plateauDimensions.y);
    const minZoom = (canvasSize * 0.8) / maxPlateauSize; // 80% of canvas shows full plateau
    
    const clampedZoom = EnderTrack.Math.clamp(newZoom, minZoom, 50000);
    const oldZoom = state.zoom || 1;
    
    if (centerPoint && oldZoom !== clampedZoom) {
      // Get canvas position from screen coordinates
      const rect = this.canvas.getBoundingClientRect();
      const canvasX = centerPoint.x - rect.left;
      const canvasY = centerPoint.y - rect.top;
      
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      const oldPanX = state.panX || 0;
      const oldPanY = state.panY || 0;
      
      // Calculate world position under mouse before zoom
      const worldX = (canvasX - centerX - oldPanX) / oldZoom;
      const worldY = (canvasY - centerY - oldPanY) / oldZoom;
      
      // Calculate new pan to keep world position under mouse
      const newPanX = canvasX - centerX - (worldX * clampedZoom);
      const newPanY = canvasY - centerY - (worldY * clampedZoom);
      
      EnderTrack.State.update({
        zoom: clampedZoom,
        panX: newPanX,
        panY: newPanY
      });
    } else {
      EnderTrack.State.update({ zoom: clampedZoom });
    }
  }

  handleClickToMove(mapPos) {
    if (!EnderTrack.Movement) {
      console.warn('Movement system not available');
      return;
    }
    
    const state = EnderTrack.State.get();
    
    // Move to clicked position, keeping current Z
    EnderTrack.Movement.moveAbsolute(mapPos.x, mapPos.y, state.pos.z);
  }

  centerOnPosition(x, y) {
    // Calculate pan to center the position
    const centerCanvas = {
      cx: this.canvas.width / 2,
      cy: this.canvas.height / 2
    };
    
    const targetCanvas = EnderTrack.Coordinates.mapToCanvas(x, y);
    
    const state = EnderTrack.State.get();
    const newPanX = (state.panX || 0) + (centerCanvas.cx - targetCanvas.cx);
    const newPanY = (state.panY || 0) + (centerCanvas.cy - targetCanvas.cy);
    
    EnderTrack.State.update({
      panX: newPanX,
      panY: newPanY
    });
  }

  showContextMenu(screenX, screenY, mapPos) {
    // Create context menu
    const menu = document.createElement('div');
    menu.className = 'canvas-context-menu';
    menu.style.cssText = `
      position: fixed;
      left: ${screenX}px;
      top: ${screenY}px;
      background: white;
      border: 1px solid #ccc;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      z-index: 10000;
      min-width: 150px;
    `;
    
    const menuItems = [
      {
        label: `Aller à (${mapPos.x.toFixed(1)}, ${mapPos.y.toFixed(1)})`,
        action: () => this.handleClickToMove(mapPos)
      },
      {
        label: 'Centrer ici',
        action: () => this.centerOnPosition(mapPos.x, mapPos.y)
      },
      {
        label: 'Ajouter position',
        action: () => this.addPositionAtLocation(mapPos)
      },
      { separator: true },
      {
        label: 'Zoom 100%',
        action: () => this.handleZoom(1)
      },
      {
        label: 'Ajuster à la vue',
        action: () => this.fitToView()
      }
    ];
    
    menuItems.forEach(item => {
      if (item.separator) {
        const separator = document.createElement('div');
        separator.style.cssText = 'height: 1px; background: #eee; margin: 4px 0;';
        menu.appendChild(separator);
      } else {
        const menuItem = document.createElement('div');
        menuItem.textContent = item.label;
        menuItem.style.cssText = `
          padding: 8px 12px;
          cursor: pointer;
          font-size: 12px;
        `;
        
        menuItem.addEventListener('mouseenter', () => {
          menuItem.style.background = '#f0f0f0';
        });
        
        menuItem.addEventListener('mouseleave', () => {
          menuItem.style.background = '';
        });
        
        menuItem.addEventListener('click', () => {
          item.action();
          menu.remove();
        });
        
        menu.appendChild(menuItem);
      }
    });
    
    document.body.appendChild(menu);
    
    // Remove menu when clicking elsewhere
    const removeMenu = (e) => {
      if (!menu.contains(e.target)) {
        menu.remove();
        document.removeEventListener('click', removeMenu);
      }
    };
    
    setTimeout(() => {
      document.addEventListener('click', removeMenu);
    }, 0);
  }

  addPositionAtLocation(mapPos) {
    // This would integrate with the planning system
    EnderTrack.Events.emit('position:add_requested', {
      x: mapPos.x,
      y: mapPos.y,
      z: EnderTrack.State.get().pos.z
    });
  }

  showClickAndGoDialog(mapPos, screenX, screenY) {
    // Remove any existing dialog
    const existingDialog = document.querySelector('.click-and-go-dialog');
    if (existingDialog) {
      existingDialog.remove();
    }
    
    // Create dialog
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
    
    // Add CSS animation
    if (!document.querySelector('#click-and-go-styles')) {
      const style = document.createElement('style');
      style.id = 'click-and-go-styles';
      style.textContent = `
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        .click-and-go-dialog .coordinates {
          color: #ffc107;
          margin-bottom: 12px;
          font-size: 15px;
          font-family: monospace;
        }
        .click-and-go-dialog .buttons {
          display: flex;
          gap: 8px;
        }
        .click-and-go-dialog button {
          padding: 6px 12px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
          transition: all 0.2s;
        }
        .click-and-go-dialog .go-btn {
          background: #0b84ff;
          color: white;
        }
        .click-and-go-dialog .go-btn:hover {
          background: #0056b3;
        }
        .click-and-go-dialog .cancel-btn {
          background: #444;
          color: #ccc;
          border: none;
        }
        .click-and-go-dialog .cancel-btn:hover {
          background: #555;
        }
      `;
      document.head.appendChild(style);
    }
    
    dialog.innerHTML = `
      <div class="coordinates" style="font-size: 15px; font-family: monospace; margin-bottom: 12px;"><span style="color: #aaa;">X:</span><span style="color: #ffc107;">${mapPos.x.toFixed(2)}</span> <span style="color: #aaa;">Y:</span><span style="color: #ffc107;">${mapPos.y.toFixed(2)}</span></div>
      <div class="buttons">
        <button class="go-btn">Go</button>
        <button class="cancel-btn">Cancel</button>
      </div>
    `;
    
    // Position dialog to stay within viewport
    document.body.appendChild(dialog);
    const rect = dialog.getBoundingClientRect();
    
    // Adjust position if dialog goes outside viewport
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
      this.handleClickToMove(mapPos);
      dialog.remove();
    });
    
    cancelBtn.addEventListener('click', () => {
      dialog.remove();
    });
    
    // Close dialog when clicking outside or pressing Escape
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
    
    // Add event listeners after a short delay to prevent immediate closure
    setTimeout(() => {
      document.addEventListener('keydown', closeDialog);
      document.addEventListener('click', closeDialog);
    }, 100);
    
    // Auto-focus the Go button for keyboard navigation
    goBtn.focus();
    
    // Handle Enter/Space on focused button
    dialog.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        if (document.activeElement === goBtn) {
          goBtn.click();
        } else if (document.activeElement === cancelBtn) {
          cancelBtn.click();
        }
        e.preventDefault();
      }
    });
  }

  fitToView() {
    const state = EnderTrack.State.get();
    const plateauDimensions = state.plateauDimensions || { x: 200, y: 200, z: 100 };
    const canvasSize = Math.min(this.canvas.width, this.canvas.height);
    const maxPlateauSize = Math.max(plateauDimensions.x, plateauDimensions.y);
    
    // Calculate minimum zoom (80% of canvas shows full plateau)
    const minZoom = (canvasSize * 0.8) / maxPlateauSize;
    
    // Reset to centered view with minimum zoom
    EnderTrack.State.update({
      zoom: minZoom,
      panX: 0,
      panY: 0
    });
  }

  // Check compass hover state
  checkCompassHover(canvasPos) {
    let wasHovered = this.compassHovered || false;
    
    if (EnderTrack.Canvas.compassBounds) {
      const bounds = EnderTrack.Canvas.compassBounds;
      this.compassHovered = canvasPos.cx >= bounds.x && canvasPos.cx <= bounds.x + bounds.width &&
                           canvasPos.cy >= bounds.y && canvasPos.cy <= bounds.y + bounds.height;
    } else {
      this.compassHovered = false;
    }
    
    // Update canvas hover state and request re-render if changed
    if (EnderTrack.Canvas) {
      EnderTrack.Canvas.compassHovered = this.compassHovered;
      if (wasHovered !== this.compassHovered) {
        EnderTrack.Canvas.requestRender();
      }
    }
  }

  // Mouse coordinates display
  updateMouseCoordinates(canvasPos, event = null) {
    const state = EnderTrack.State.get();
    const mouseCoords = document.getElementById('mouseCoords');
    const panOffset = document.getElementById('panOffset');
    
    // Use EXACT same logic as renderCurrentPosition in canvas.js
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const zoom = state.zoom || 1;
    const panX = state.panX || 0;
    const panY = state.panY || 0;
    
    // Update pan offset display (convert pixels to mm)
    if (panOffset) {
      const panXmm = -panX / zoom;
      const panYmm = -panY / zoom;
      panOffset.textContent = `X:${panXmm.toFixed(0)} Y:${panYmm.toFixed(0)}`;
    }
    
    // Update resolution display
    const resolution = document.getElementById('resolution');
    if (resolution) {
      resolution.textContent = `${this.canvas.width}x${this.canvas.height}px`;
    }
    
    // Inverse of: posX = centerX + panX + (state.pos.x * zoom)
    const mapX = (canvasPos.cx - centerX - panX) / zoom;
    const mapY = (canvasPos.cy - centerY - panY) / zoom;
    
    // Check if mouse is within plateau bounds
    const plateauDimensions = state.plateauDimensions || { x: 200, y: 200, z: 100 };
    const halfX = plateauDimensions.x / 2;
    const halfY = plateauDimensions.y / 2;
    const isOnPlateau = Math.abs(mapX) <= halfX && Math.abs(mapY) <= halfY;
    
    if (mouseCoords) {
      if (isOnPlateau) {
        // Format with fixed width using non-breaking spaces and yellow color
        const xStr = mapX.toFixed(2).padStart(7, '\u00A0');
        const yStr = mapY.toFixed(2).padStart(7, '\u00A0');
        mouseCoords.innerHTML = `X:<span style="color: #ffc107;">${xStr}</span>\u00A0Y:<span style="color: #ffc107;">${yStr}</span>`;
        // Set cursor based on mode
        if (!this.compassHovered && !event?.shiftKey) {
          if (window.EnderTrack?.Lists?.isActive && window.EnderTrack.Lists.currentMode === 'click') {
            this.canvas.style.cursor = 'copy'; // Different cursor for Lists mode
          } else {
            this.canvas.style.cursor = 'crosshair';
          }
        }
      } else {
        mouseCoords.innerHTML = 'X:\u00A0\u00A0------\u00A0Y:\u00A0\u00A0------';
        // Only set default cursor if not already overridden by other states
        if (!this.compassHovered && !event?.shiftKey) {
          this.canvas.style.cursor = 'default';
        }
      }
    }
  }
  
  clearMouseCoordinates() {
    const mouseCoords = document.getElementById('mouseCoords');
    if (mouseCoords) {
      mouseCoords.innerHTML = 'X:\u00A0\u00A0------\u00A0Y:\u00A0\u00A0------';
    }
  }

  // Utility methods
  screenToCanvas(screenX, screenY) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      cx: screenX - rect.left,
      cy: screenY - rect.top
    };
  }

  canvasToScreen(canvasX, canvasY) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: canvasX + rect.left,
      y: canvasY + rect.top
    };
  }

  // Debug information
  getDebugInfo() {
    return {
      isInitialized: this.isInitialized,
      isDragging: this.isDragging,
      lastMousePos: { ...this.lastMousePos },
      touchStartDistance: this.touchStartDistance,
      touchStartZoom: this.touchStartZoom
    };
  }
}

// Global instance
window.EnderTrack = window.EnderTrack || {};
window.EnderTrack.CanvasInteractions = new CanvasInteractions();

// Global function for HTML button
window.fitToView = function() {
  if (window.EnderTrack.CanvasInteractions.isInitialized) {
    window.EnderTrack.CanvasInteractions.fitToView();
  }
};