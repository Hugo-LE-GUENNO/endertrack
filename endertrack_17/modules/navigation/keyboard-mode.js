// modules/navigation/keyboard-mode.js - Keyboard navigation mode

class KeyboardMode {
  constructor() {
    this.isActive = false;
    this.logEntries = [];
    this.maxLogEntries = 50;
  }

  init() {
    this.setupEventListeners();
    return true;
  }

  setupEventListeners() {
    // Initialize pressed keys tracking
    this.pressedKeys = new Set();
    this.keyTimeout = null;
    
    // Bind wheel handler
    this.wheelHandler = (e) => {
      if (this.isActive) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -1 : 1;
        this.handleWheelMovement(delta);
      }
    };

    // Enhanced keyboard listeners with diagonal detection
    document.addEventListener('keydown', (e) => {
      if (this.isActive) {
        this.handleKeyboardInput(e);
      }
    });
    
    document.addEventListener('keyup', (e) => {
      if (this.isActive) {
        this.handleKeyboardRelease(e);
      }
    });
  }

  toggle() {
    this.isActive = !this.isActive;
    
    const button = document.getElementById('keyboardMode');
    const relativeControls = document.getElementById('relativeControls');
    const navigationLog = document.getElementById('navigationLog');
    const zButtons = document.getElementById('zButtons');
    const zInputZone = document.getElementById('zInputZone');
    const zControlsWheel = document.getElementById('zControlsWheel');
    const arrowPad = document.getElementById('arrowPad');
    const normalMode = document.getElementById('normalMode');
    const controllerMode = document.getElementById('controllerMode');
    const controllerRight = document.getElementById('controllerRight');
    const controllerModeToggle = document.getElementById('controllerModeToggle');

    if (this.isActive) {
      // Activate controller mode
      button.classList.add('active');
      relativeControls.classList.add('keyboard-mode');
      navigationLog.style.display = 'block';
      normalMode.style.display = 'none';
      controllerMode.classList.add('active');
      if (controllerModeToggle) controllerModeToggle.style.display = 'flex';
      
      this.addLogEntry('🕹️ Contrôleur activé');
      
      // Initialize controller settings if not done
      if (window.initControllerModeSettings) {
        window.initControllerModeSettings();
      }
      
      // Setup wheel detection on controller right zone
      if (controllerRight) {
        controllerRight.addEventListener('wheel', this.wheelHandler);
      }
    } else {
      // Deactivate controller mode
      button.classList.remove('active');
      relativeControls.classList.remove('keyboard-mode');
      navigationLog.style.display = 'none';
      normalMode.style.display = 'grid';
      controllerMode.classList.remove('active');
      if (controllerModeToggle) controllerModeToggle.style.display = 'none';
      
      // Reset to step mode and show normal sensitivity
      const stepControls = document.getElementById('stepControls');
      const continuousControls = document.getElementById('continuousControls');
      if (stepControls) stepControls.style.display = 'block';
      if (continuousControls) continuousControls.style.display = 'none';
      window.controllerMode = 'step';
      
      this.addLogEntry('🕹️ Contrôleur désactivé');
      
      // Stop any continuous movement
      if (window.stopContinuousMovement) {
        window.stopContinuousMovement();
      }
      
      // Remove wheel detection
      if (controllerRight) {
        controllerRight.removeEventListener('wheel', this.wheelHandler);
      }
      
      // Reset joystick position
      this.resetJoystick();
    }

    return this.isActive;
  }

  handleKeyboardInput(e) {
    // Prevent default for navigation keys
    const navKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD'];
    if (navKeys.includes(e.code)) {
      e.preventDefault();
    }

    // Add key to pressed set
    this.pressedKeys.add(e.code);
    
    // Clear existing timeout
    if (this.keyTimeout) {
      clearTimeout(this.keyTimeout);
    }
    
    // Z movements
    if (e.code === 'PageUp' || e.code === 'KeyQ') {
      if (window.controllerMode === 'continuous') {
        window.startContinuousMovement('zUp');
        this.addLogEntry('▲ Z Haut (Continu)');
        this.animateButton('zUp', true);
      } else {
        this.executeMovement('zUp', '▲ Z Haut', 'zUp');
      }
      return;
    } else if (e.code === 'PageDown' || e.code === 'KeyE') {
      if (window.controllerMode === 'continuous') {
        window.startContinuousMovement('zDown');
        this.addLogEntry('▼ Z Bas (Continu)');
        this.animateButton('zDown', true);
      } else {
        this.executeMovement('zDown', '▼ Z Bas', 'zDown');
      }
      return;
    }
    
    // For XY movements, wait briefly to detect diagonal combinations
    this.keyTimeout = setTimeout(() => {
      this.processXYMovement();
    }, 50); // 50ms delay to detect diagonal combinations
  }
  
  processXYMovement() {
    const keys = {
      up: this.pressedKeys.has('ArrowUp') || this.pressedKeys.has('KeyW'),
      down: this.pressedKeys.has('ArrowDown') || this.pressedKeys.has('KeyS'),
      left: this.pressedKeys.has('ArrowLeft') || this.pressedKeys.has('KeyA'),
      right: this.pressedKeys.has('ArrowRight') || this.pressedKeys.has('KeyD')
    };
    
    let direction = null;
    let action = null;
    let buttonId = null;
    
    // Check for diagonal combinations first (priority)
    if (keys.up && keys.left) {
      direction = 'upLeft';
      action = '↖ Haut-Gauche';
    } else if (keys.up && keys.right) {
      direction = 'upRight';
      action = '↗ Haut-Droite';
    } else if (keys.down && keys.left) {
      direction = 'downLeft';
      action = '↙ Bas-Gauche';
    } else if (keys.down && keys.right) {
      direction = 'downRight';
      action = '↘ Bas-Droite';
    }
    // Single key movements
    else if (keys.up) {
      direction = 'up';
      action = '▲ Haut';
      buttonId = 'up';
    } else if (keys.down) {
      direction = 'down';
      action = '▼ Bas';
      buttonId = 'down';
    } else if (keys.left) {
      direction = 'left';
      action = '◄ Gauche';
      buttonId = 'left';
    } else if (keys.right) {
      direction = 'right';
      action = '► Droite';
      buttonId = 'right';
    }
    
    if (direction) {
      if (window.controllerMode === 'continuous') {
        // Mode continu : démarrer le mouvement fluide
        window.startContinuousMovement(direction);
        this.addLogEntry(action + ' (Continu)');
        this.animateJoystick(direction);
        if (buttonId) this.animateButton(buttonId, true);
      } else {
        // Mode pas-à-pas : mouvement classique avec animation
        this.executeMovement(direction, action, buttonId);
      }
    }
  }
  
  executeMovement(direction, action, buttonId = null) {
    this.addLogEntry(action);
    if (buttonId) this.animateButton(buttonId, true);
    this.animateJoystick(direction);
    
    // Call the actual movement function
    if (window.moveDirection) {
      window.moveDirection(direction);
    }
  }
  
  handleKeyboardRelease(e) {
    // Remove from pressed keys set
    this.pressedKeys.delete(e.code);
    
    let buttonId = null;
    
    if (e.code === 'ArrowUp' || e.code === 'KeyW') buttonId = 'up';
    else if (e.code === 'ArrowDown' || e.code === 'KeyS') buttonId = 'down';
    else if (e.code === 'ArrowLeft' || e.code === 'KeyA') buttonId = 'left';
    else if (e.code === 'ArrowRight' || e.code === 'KeyD') buttonId = 'right';
    else if (e.code === 'PageUp' || e.code === 'KeyQ') buttonId = 'zUp';
    else if (e.code === 'PageDown' || e.code === 'KeyE') buttonId = 'zDown';
    
    if (buttonId) {
      this.animateButton(buttonId, false);
    }
    
    // Stop continuous movement when key is released
    if (window.controllerMode === 'continuous') {
      const isMovementKey = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 
                            'KeyW', 'KeyA', 'KeyS', 'KeyD', 
                            'PageUp', 'PageDown', 'KeyQ', 'KeyE'].includes(e.code);
      if (isMovementKey) {
        window.stopContinuousMovement();
        this.addLogEntry('⏹️ Arrêt continu');
        
        // Arrêter les animations visuelles
        const allButtons = ['up', 'down', 'left', 'right', 'zUp', 'zDown'];
        allButtons.forEach(btnId => this.animateButton(btnId, false));
        this.resetJoystick();
      }
    }
    
    // Reset joystick if no XY keys are pressed
    const hasXYKeys = this.pressedKeys.has('ArrowUp') || this.pressedKeys.has('KeyW') ||
                      this.pressedKeys.has('ArrowDown') || this.pressedKeys.has('KeyS') ||
                      this.pressedKeys.has('ArrowLeft') || this.pressedKeys.has('KeyA') ||
                      this.pressedKeys.has('ArrowRight') || this.pressedKeys.has('KeyD');
    
    if (!hasXYKeys) {
      this.resetJoystick();
    }
  }
  
  animateButton(buttonId, pressed) {
    const button = document.getElementById(buttonId);
    if (button) {
      if (pressed) {
        button.classList.add('pressed');
      } else {
        button.classList.remove('pressed');
      }
    }
  }

  handleWheelMovement(delta) {
    const direction = delta > 0 ? 'zUp' : 'zDown';
    const action = delta > 0 ? '▲ Contrôle Z Haut' : '▼ Contrôle Z Bas';
    
    if (window.controllerMode === 'continuous') {
      // Start continuous movement for wheel
      window.startContinuousMovement(direction);
      this.addLogEntry(action + ' (Continu)');
      this.animateWheel(direction);
      
      // Stop after short duration for wheel
      setTimeout(() => {
        window.stopContinuousMovement();
      }, 200);
    } else {
      this.addLogEntry(action);
      this.animateWheel(direction);
      
      // Call the actual movement function
      if (window.moveDirection) {
        window.moveDirection(direction);
      }
    }
  }
  
  animateWheel(direction) {
    const gearWheel = document.getElementById('gearWheel');
    
    if (!this.currentRotation) this.currentRotation = 0;
    
    if (direction === 'zUp') {
      // Rotate wheel with finer 15-degree increments
      this.currentRotation -= 15;
      if (gearWheel) {
        gearWheel.style.transform = `rotate(${this.currentRotation}deg)`;
      }
    } else if (direction === 'zDown') {
      // Rotate wheel with finer 15-degree increments
      this.currentRotation += 15;
      if (gearWheel) {
        gearWheel.style.transform = `rotate(${this.currentRotation}deg)`;
      }
    }
  }

  addLogEntry(action) {
    const timestamp = new Date().toLocaleTimeString('fr-FR', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });

    const entry = {
      timestamp,
      action,
      id: Date.now()
    };

    this.logEntries.unshift(entry);
    
    // Limit log entries
    if (this.logEntries.length > this.maxLogEntries) {
      this.logEntries = this.logEntries.slice(0, this.maxLogEntries);
    }

    this.updateLogDisplay();
  }

  updateLogDisplay() {
    const container = document.getElementById('lastCommand');
    if (!container || this.logEntries.length === 0) return;

    const lastEntry = this.logEntries[0];
    container.textContent = `${lastEntry.timestamp} - ${lastEntry.action}`;
  }

  clearLog() {
    this.logEntries = [];
    const container = document.getElementById('lastCommand');
    if (container) {
      container.textContent = 'Aucune commande';
    }
  }

  animateJoystick(direction) {
    const stick = document.getElementById('joystickStick');
    if (!stick) return;
    
    const positions = {
      up: 'translate(0, -25px)',
      upRight: 'translate(18px, -18px)',
      right: 'translate(25px, 0)',
      downRight: 'translate(18px, 18px)',
      down: 'translate(0, 25px)',
      downLeft: 'translate(-18px, 18px)',
      left: 'translate(-25px, 0)',
      upLeft: 'translate(-18px, -18px)'
    };
    
    const transform = positions[direction] || 'translate(0, 0)';
    stick.style.transform = transform;
    stick.classList.add('active');
  }
  
  resetJoystick() {
    const stick = document.getElementById('joystickStick');
    if (stick) {
      stick.style.transform = 'translate(0, 0)';
      stick.classList.remove('active');
    }
  }

  getStatus() {
    return {
      active: this.isActive,
      logEntries: this.logEntries.length
    };
  }
}

// Global function for button onclick
function toggleKeyboardMode() {
  if (window.EnderTrack?.KeyboardMode) {
    window.EnderTrack.KeyboardMode.toggle();
  }
}

// Function to deactivate controller mode
function deactivateControllerMode() {
  if (window.EnderTrack?.KeyboardMode?.isActive) {
    window.EnderTrack.KeyboardMode.toggle();
  }
}

// Global function to update last command from any source
function updateLastCommand(action) {
  const timestamp = new Date().toLocaleTimeString('fr-FR', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  });
  
  const container = document.getElementById('lastCommand');
  if (container) {
    container.textContent = `${timestamp} - ${action}`;
  }
}

// Global function to get current position for specific axis
function getCurrentAxis(axis) {
  const state = EnderTrack.State.get();
  const currentPos = state.pos;
  
  // Determine which inputs to use based on coupling mode
  const isCoupled = state.lockXY;
  const inputX = document.getElementById(isCoupled ? 'inputX' : 'inputXSep');
  const inputY = document.getElementById(isCoupled ? 'inputY' : 'inputYSep');
  const inputZ = document.getElementById('inputZ');
  
  let updated = [];
  
  // Update specific axis or axes
  switch(axis) {
    case 'x':
      if (inputX && !state.lockX) {
        inputX.value = currentPos.x.toFixed(2);
        inputX.dispatchEvent(new Event('input', { bubbles: true }));
        updated.push('X');
      }
      break;
    case 'y':
      if (inputY && !state.lockY) {
        inputY.value = currentPos.y.toFixed(2);
        inputY.dispatchEvent(new Event('input', { bubbles: true }));
        updated.push('Y');
      }
      break;
    case 'z':
      if (inputZ && !state.lockZ) {
        inputZ.value = currentPos.z.toFixed(2);
        inputZ.dispatchEvent(new Event('input', { bubbles: true }));
        updated.push('Z');
      }
      break;
    case 'all':
      if (inputX && !state.lockX) {
        inputX.value = currentPos.x.toFixed(2);
        inputX.dispatchEvent(new Event('input', { bubbles: true }));
        updated.push('X');
      }
      if (inputY && !state.lockY) {
        inputY.value = currentPos.y.toFixed(2);
        inputY.dispatchEvent(new Event('input', { bubbles: true }));
        updated.push('Y');
      }
      if (inputZ && !state.lockZ) {
        inputZ.value = currentPos.z.toFixed(2);
        inputZ.dispatchEvent(new Event('input', { bubbles: true }));
        updated.push('Z');
      }
      break;
  }
  
  // Force canvas render to update overlay
  if (EnderTrack.Canvas) {
    EnderTrack.Canvas.requestRender();
  }
  
  // Update last command log
  if (updated.length > 0) {
    updateLastCommand(`📍 Position ${updated.join('+')} récupérée`);
  }
  
  // Update button states after getting position
  updateGetButtonStates();
}

// Function to update get button visual states
function updateGetButtonStates() {
  const state = EnderTrack.State.get();
  const currentPos = state.pos;
  
  // Determine which inputs to use based on coupling mode
  const isCoupled = state.lockXY;
  const inputX = document.getElementById(isCoupled ? 'inputX' : 'inputXSep');
  const inputY = document.getElementById(isCoupled ? 'inputY' : 'inputYSep');
  const inputZ = document.getElementById('inputZ');
  
  // Get all get buttons
  const getButtons = document.querySelectorAll('.get-btn, .get-all-btn');
  
  // Check if input values match current position (within 0.01mm tolerance)
  const tolerance = 0.01;
  const xMatches = inputX ? Math.abs(parseFloat(inputX.value) - currentPos.x) < tolerance : false;
  const yMatches = inputY ? Math.abs(parseFloat(inputY.value) - currentPos.y) < tolerance : false;
  const zMatches = inputZ ? Math.abs(parseFloat(inputZ.value) - currentPos.z) < tolerance : false;
  
  // Update button states based on matches
  getButtons.forEach(button => {
    const onclick = button.getAttribute('onclick');
    if (!onclick) return;
    
    let isAtCurrentPos = false;
    
    if (onclick.includes("'x'")) {
      isAtCurrentPos = xMatches;
    } else if (onclick.includes("'y'")) {
      isAtCurrentPos = yMatches;
    } else if (onclick.includes("'z'")) {
      isAtCurrentPos = zMatches;
    } else if (onclick.includes("'all'")) {
      isAtCurrentPos = xMatches && yMatches && zMatches;
    }
    
    // Update button appearance
    if (isAtCurrentPos) {
      // Already at position: green background, disabled, tooltip
      button.style.background = 'rgba(34, 197, 94, 0.4)';
      button.style.opacity = '0.7';
      button.style.cursor = 'not-allowed';
      button.disabled = true;
      button.title = 'Déjà à la position actuelle';
    } else {
      // Not at position: no background, clickable
      button.style.background = 'var(--button-bg)';
      button.style.opacity = '1';
      button.style.cursor = 'pointer';
      button.disabled = false;
      
      // Set appropriate tooltip based on button type
      if (onclick.includes("'x'")) {
        button.title = 'Récupérer position X';
      } else if (onclick.includes("'y'")) {
        button.title = 'Récupérer position Y';
      } else if (onclick.includes("'z'")) {
        button.title = 'Récupérer position Z';
      } else if (onclick.includes("'all'")) {
        button.title = 'Récupérer toutes les positions';
      }
    }
  });
}

// Controller mode settings
function initControllerModeSettings() {
  const speedSlider = document.getElementById('speedSlider');
  const speedInput = document.getElementById('speedInput');
  
  // Set logarithmic speed scale 0-100
  if (speedSlider && speedInput) {
    speedSlider.min = 0;
    speedSlider.max = 100;
    speedSlider.value = 50; // Valeur par défaut
    speedInput.min = 0;
    speedInput.max = 100;
    speedInput.value = 50;
    window.continuousSpeedValue = 50;
    
    speedSlider.addEventListener('input', (e) => {
      window.continuousSpeedValue = parseInt(e.target.value);
      speedInput.value = window.continuousSpeedValue;
    });
    
    speedInput.addEventListener('input', (e) => {
      window.continuousSpeedValue = parseInt(e.target.value);
      speedSlider.value = window.continuousSpeedValue;
    });
  }
}

// Set controller mode
function setControllerMode(mode) {
  console.log('[DEBUG] setControllerMode appelé avec mode:', mode);
  window.controllerMode = mode;
  console.log('[DEBUG] window.controllerMode maintenant:', window.controllerMode);
  
  const stepBtn = document.getElementById('stepModeBtn');
  const continuousBtn = document.getElementById('continuousModeBtn');
  const stepControls = document.getElementById('stepControls');
  const continuousControls = document.getElementById('continuousControls');
  
  if (mode === 'step') {
    stepBtn.classList.add('active');
    continuousBtn.classList.remove('active');
    stepControls.style.display = 'block';
    continuousControls.style.display = 'none';
    window.stopContinuousMovement();
    
    // Forcer le rendu des canvas pour afficher les overlays
    if (window.EnderTrack?.Canvas) {
      window.EnderTrack.Canvas.requestRender();
    }
    if (window.EnderTrack?.ZVisualization) {
      window.EnderTrack.ZVisualization.render();
    }
  } else {
    stepBtn.classList.remove('active');
    continuousBtn.classList.add('active');
    stepControls.style.display = 'none';
    continuousControls.style.display = 'block';
    console.log('[DEBUG] Mode continu activé');
    // Test immédiat de la condition
    console.log('[DEBUG] Test condition overlays: inputMode=relative, controllerMode=', window.controllerMode, 'condition result:', (window.controllerMode || 'step') !== 'continuous');
    // Forcer un clear complet et plusieurs rendus
    if (window.EnderTrack?.Canvas) {
      // Clear immédiat
      const canvas = document.getElementById('mapCanvas');
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      // Rendus multiples
      window.EnderTrack.Canvas.requestRender();
      setTimeout(() => window.EnderTrack.Canvas.requestRender(), 10);
      setTimeout(() => window.EnderTrack.Canvas.requestRender(), 50);
      setTimeout(() => window.EnderTrack.Canvas.requestRender(), 100);
    }
    
    // Forcer aussi le rendu du canvas Z
    if (window.EnderTrack?.ZVisualization) {
      window.EnderTrack.ZVisualization.render();
      setTimeout(() => window.EnderTrack.ZVisualization.render(), 10);
      setTimeout(() => window.EnderTrack.ZVisualization.render(), 50);
      setTimeout(() => window.EnderTrack.ZVisualization.render(), 100);
    }
  }
}

// Speed preset functions
function setSpeedPreset(preset) {
  const speedSlider = document.getElementById('speedSlider');
  const speedInput = document.getElementById('speedInput');
  
  let value;
  if (preset === 'slow') value = 20;  // ~1 mm/s
  else if (preset === 'fast') value = 70; // ~20 mm/s
  
  if (speedSlider && speedInput) {
    speedSlider.value = value;
    speedInput.value = value;
    window.continuousSpeedValue = value;
  }
}

// Calculer la vitesse réelle à partir de l'échelle logarithmique
function calculateActualSpeed(sliderValue) {
  if (sliderValue === 0) return 0.1;
  // Échelle logarithmique: 0-100 -> 0.1-100 mm/s (optimiste pour mode live)
  return Math.pow(10, (sliderValue / 100) * Math.log10(1000)) / 10;
}

// Update speed slider range based on zoom
function updateSpeedRange() {
  // L'échelle reste toujours 0-100, pas besoin de modification
  // L'adaptation au zoom se fait dans calculateActualSpeed si nécessaire
}

function startContinuousMovement(direction) {
  if (window.controllerMode !== 'continuous') return;
  
  window.stopContinuousMovement();
  
  // Convertir l'échelle logarithmique 0-100 en vitesse réelle
  const actualSpeed = calculateActualSpeed(window.continuousSpeedValue || 50);
  
  // Pas adaptatifs selon la vitesse pour réduire les micro-stops
  const adaptiveStep = getAdaptiveStep(actualSpeed);
  const moveInterval = getAdaptiveInterval(actualSpeed);
  
  // Calculer dx, dy pour les vecteurs sur canvas
  let dx = 0, dy = 0, dz = 0;
  switch(direction) {
    case 'up': dy = -1; break;
    case 'down': dy = 1; break;
    case 'left': dx = -1; break;
    case 'right': dx = 1; break;
    case 'upLeft': dx = -0.707; dy = -0.707; break;
    case 'upRight': dx = 0.707; dy = -0.707; break;
    case 'downLeft': dx = -0.707; dy = 0.707; break;
    case 'downRight': dx = 0.707; dy = 0.707; break;
    case 'zUp': dz = 1; break;
    case 'zDown': dz = -1; break;
  }
  
  // Afficher les vecteurs jaunes sur les canvas
  if (dx !== 0 || dy !== 0) {
    drawCanvasVector('xy', dx, dy, actualSpeed);
  }
  if (dz !== 0) {
    drawCanvasVector('z', 0, dz, actualSpeed);
  }
  
  window.continuousInterval = setInterval(() => {
    if (window.moveDirection) {
      // Utiliser des pas adaptatifs selon la vitesse
      const state = EnderTrack.State.get();
      const adaptiveStep = getAdaptiveStep(actualSpeed);
      
      let moveX = 0, moveY = 0, moveZ = 0;
      
      // Calculer le déplacement selon la direction (système Y inversé)
      switch(direction) {
        case 'up': moveY = -adaptiveStep; break;    // Haut = -Y (Y inversé)
        case 'down': moveY = adaptiveStep; break;   // Bas = +Y (Y inversé)
        case 'left': moveX = -adaptiveStep; break;  // Gauche = -X
        case 'right': moveX = adaptiveStep; break;  // Droite = +X
        case 'upLeft': moveX = -adaptiveStep * 0.707; moveY = -adaptiveStep * 0.707; break;
        case 'upRight': moveX = adaptiveStep * 0.707; moveY = -adaptiveStep * 0.707; break;
        case 'downLeft': moveX = -adaptiveStep * 0.707; moveY = adaptiveStep * 0.707; break;
        case 'downRight': moveX = adaptiveStep * 0.707; moveY = adaptiveStep * 0.707; break;
        case 'zUp': moveZ = adaptiveStep; break;    // Z+ = monter
        case 'zDown': moveZ = -adaptiveStep; break; // Z- = descendre
      }
      
      // Mouvement direct sans animation pour fluidité
      if (moveX !== 0 || moveY !== 0 || moveZ !== 0) {
        const newPos = {
          x: state.pos.x + moveX,
          y: state.pos.y + moveY,
          z: state.pos.z + moveZ
        };
        
        // Vérifier les limites du plateau
        const dimensions = state.plateauDimensions || { x: 200, y: 200, z: 100 };
        const halfX = dimensions.x / 2;
        const halfY = dimensions.y / 2;
        const halfZ = dimensions.z / 2;
        
        // Limiter la position aux dimensions du plateau
        newPos.x = Math.max(-halfX, Math.min(halfX, newPos.x));
        newPos.y = Math.max(-halfY, Math.min(halfY, newPos.y));
        newPos.z = Math.max(-halfZ, Math.min(halfZ, newPos.z));
        
        // Ajouter au track continu (couleur différente)
        if (EnderTrack.State && EnderTrack.State.addContinuousTrackPoint) {
          EnderTrack.State.addContinuousTrackPoint(newPos.x, newPos.y, newPos.z);
        }
        
        // Mise à jour directe de la position sans animation
        EnderTrack.State.update({ pos: newPos });
        
        // Forcer le rendu du canvas
        if (EnderTrack.Canvas) {
          EnderTrack.Canvas.requestRender();
        }
      }
    }
  }, moveInterval);
}

function stopContinuousMovement() {
  if (window.continuousInterval) {
    clearInterval(window.continuousInterval);
    window.continuousInterval = null;
  }
  
  // Supprimer les vecteurs des canvas
  clearCanvasVectors();
}

// Dessiner des vecteurs jaunes sur les canvas XY et Z
function drawCanvasVector(canvasType, dx, dy, speed) {
  // Stocker les données du vecteur pour le rendu canvas
  if (!window.continuousVector) window.continuousVector = {};
  
  if (canvasType === 'xy') {
    window.continuousVector.xy = { dx, dy, speed };
  } else if (canvasType === 'z') {
    window.continuousVector.z = { dz: dy, speed }; // dy contient dz pour Z
  }
  
  // Forcer le rendu du canvas pour afficher le vecteur
  if (EnderTrack.Canvas) {
    EnderTrack.Canvas.requestRender();
  }
}

function clearCanvasVectors() {
  window.continuousVector = null;
  
  // Forcer le rendu pour effacer les vecteurs
  if (EnderTrack.Canvas) {
    EnderTrack.Canvas.requestRender();
  }
}

// Initialize and register
window.EnderTrack = window.EnderTrack || {};
window.EnderTrack.KeyboardMode = new KeyboardMode();
window.updateLastCommand = updateLastCommand;
window.updateGetButtonStates = updateGetButtonStates;
window.initControllerModeSettings = initControllerModeSettings;
window.startContinuousMovement = startContinuousMovement;
window.stopContinuousMovement = stopContinuousMovement;
window.setSpeedPreset = setSpeedPreset;
window.setControllerMode = setControllerMode;
window.updateSpeedRange = updateSpeedRange;
window.controllerMode = 'step';
window.continuousSpeedValue = 50; // Valeur par défaut sur échelle 0-100
window.continuousInterval = null;
window.continuousVector = null;

// Calculer la taille de pas adaptative selon la vitesse
function getAdaptiveStep(speed) {
  if (speed < 1) return 0.05;      // Très lent: 0.05mm
  else if (speed < 5) return 0.1;  // Lent: 0.1mm  
  else if (speed < 20) return 0.5; // Moyen: 0.5mm
  else if (speed < 50) return 1.0; // Rapide: 1mm
  else return 2.0;                 // Très rapide: 2mm
}

// Calculer l'intervalle adaptatif selon la vitesse
function getAdaptiveInterval(speed) {
  if (speed < 1) return 100;       // Très lent: 100ms
  else if (speed < 5) return 50;   // Lent: 50ms
  else if (speed < 20) return 30;  // Moyen: 30ms
  else if (speed < 50) return 20;  // Rapide: 20ms
  else return 15;                  // Très rapide: 15ms
}