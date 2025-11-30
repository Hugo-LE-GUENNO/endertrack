// modules/navigation/controls.js - Navigation UI controls
// Handles input modes, sensitivity, and directional controls

class NavigationControls {
  constructor() {
    this.isInitialized = false;
    this.inputMode = 'relative'; // Default to relative mode
    this.locks = {
      x: false,
      y: false,
      z: true, // Z locked by default
      xy: true // XY coupled by default
    };
  }

  init() {
    // Setup input mode handlers
    this.setupInputModeHandlers();
    
    // Setup sensitivity controls
    this.setupSensitivityControls();
    
    // Setup lock controls
    this.setupLockControls();
    
    // Setup directional controls
    this.setupDirectionalControls();
    
    // Setup absolute positioning
    this.setupAbsoluteControls();
    
    // Setup preset controls
    this.setupPresetControls();
    
    // Initialize UI state
    this.updateUIFromState();
    
    this.isInitialized = true;
    
    return true;
  }

  setupInputModeHandlers() {
    const relativeTab = document.getElementById('relativeTab');
    const absoluteTab = document.getElementById('absoluteTab');
    
    if (relativeTab) {
      relativeTab.addEventListener('click', () => {
        this.setInputMode('relative');
      });
    }
    
    if (absoluteTab) {
      absoluteTab.addEventListener('click', () => {
        this.setInputMode('absolute');
      });
    }
  }

  setupSensitivityControls() {
    // Setup XY coupled control
    this.setupXYCoupledControl();
    
    // Setup individual axis controls
    const axes = ['X', 'Y', 'Z'];
    axes.forEach(axis => {
      const slider = document.getElementById(`sensitivity${axis}`);
      const input = document.getElementById(`sensitivity${axis}Input`);
      
      if (slider && input) {
        slider.addEventListener('input', (e) => {
          const value = parseFloat(e.target.value);
          input.value = value.toFixed(2);
          this.setSensitivity(axis.toLowerCase(), value);
        });
        
        input.addEventListener('input', (e) => {
          const value = parseFloat(e.target.value);
          const maxValue = parseFloat(e.target.max) || 50;
          if (!isNaN(value) && value >= 0.01 && value <= maxValue) {
            slider.value = value;
            this.setSensitivity(axis.toLowerCase(), value);
          }
        });
      }
    });
    
    // Listen to zoom changes to update slider ranges
    EnderTrack.Events?.on?.('state:changed', (newState, oldState) => {
      if (newState.zoom !== oldState.zoom || newState.zZoom !== oldState.zZoom) {
        this.updateSliderRanges(newState);
      }
    });
    
    // Also listen for initial load with longer delay
    setTimeout(() => {
      const state = EnderTrack.State.get();
      this.updateSliderRanges(state);
    }, 1000);
    
    // Force update when canvas is ready
    EnderTrack.Events?.on?.('canvas:rendered', () => {
      const state = EnderTrack.State.get();
      this.updateSliderRanges(state);
    });
  }

  setupXYCoupledControl() {
    const xySlider = document.getElementById('sensitivityXY');
    const xyInput = document.getElementById('sensitivityXYInput');
    const couplingBtn = document.getElementById('couplingBtn');
    
    if (xySlider && xyInput) {
      xySlider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        xyInput.value = value.toFixed(2);
        // Set both X and Y when coupled
        this.setSensitivity('x', value);
        this.setSensitivity('y', value);
      });
      
      xyInput.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        const maxValue = parseFloat(e.target.max) || 50;
        if (!isNaN(value) && value >= 0.01 && value <= maxValue) {
          xySlider.value = value;
          this.setSensitivity('x', value);
          this.setSensitivity('y', value);
        }
      });
    }
    
    if (couplingBtn) {
      couplingBtn.addEventListener('click', () => {
        this.toggleCoupling();
      });
    }
  }

  setupLockControls() {
    const axes = ['X', 'Y', 'Z', 'XY'];
    
    axes.forEach(axis => {
      const lockBtn = document.getElementById(`lock${axis}Btn`);
      const lockBtnAbs = document.getElementById(`lock${axis}BtnAbs`);
      
      if (lockBtn) {
        lockBtn.addEventListener('click', () => {
          this.toggleLock(axis);
        });
      }
      if (lockBtnAbs) {
        lockBtnAbs.addEventListener('click', () => {
          this.toggleLock(axis);
        });
      }
    });
    
    // Home lock controls
    const homeLocks = ['HomeXY', 'HomeXYZ'];
    homeLocks.forEach(lockType => {
      const lockBtn = document.getElementById(`lock${lockType}Btn`);
      if (lockBtn) {
        lockBtn.addEventListener('click', () => {
          this.toggleLock(lockType);
        });
      }
    });
    
    // XY coupling indicator
    const xyCoupling = document.getElementById('xyCoupling');
    if (xyCoupling) {
      xyCoupling.addEventListener('click', () => {
        this.toggleCoupling();
      });
    }
  }

  setupDirectionalControls() {
    const directions = ['up', 'down', 'left', 'right', 'upLeft', 'upRight', 'downLeft', 'downRight', 'zUp', 'zDown'];
    
    directions.forEach(direction => {
      const btn = document.getElementById(direction);
      
      if (btn) {
        let isPressed = false;
        
        const handlePress = () => {
          if (isPressed) return; // Déjà pressé, ignorer
          
          // Vérifier si un mouvement est en cours
          const state = EnderTrack.State.get();
          if (state.isMoving) return;
          
          isPressed = true;
          btn.classList.add('active');
          this.moveDirection(direction);
        };
        
        const handleRelease = () => {
          isPressed = false;
          btn.classList.remove('active');
        };
        
        // Mouse events
        btn.addEventListener('mousedown', (e) => {
          e.preventDefault();
          handlePress();
        });
        
        btn.addEventListener('mouseup', handleRelease);
        btn.addEventListener('mouseleave', handleRelease);
        
        // Touch events
        btn.addEventListener('touchstart', (e) => {
          e.preventDefault();
          handlePress();
        });
        
        btn.addEventListener('touchend', (e) => {
          e.preventDefault();
          handleRelease();
        });
        
        btn.addEventListener('touchcancel', (e) => {
          e.preventDefault();
          handleRelease();
        });
      }
    });
  }

  setupAbsoluteControls() {
    const goToPointBtn = document.getElementById('goToPoint');
    const homeXYBtn = document.getElementById('homeXYBtn');
    const homeXYZBtn = document.getElementById('homeXYZBtn');
    
    if (goToPointBtn) {
      goToPointBtn.addEventListener('click', () => {
        this.goToAbsolute();
      });
    }
    
    if (homeXYBtn) {
      homeXYBtn.addEventListener('click', () => {
        this.goHome('xy');
      });
    }
    
    if (homeXYZBtn) {
      homeXYZBtn.addEventListener('click', () => {
        this.goHome('xyz');
      });
    }
    
    // Enter key in absolute inputs
    const inputs = ['inputX', 'inputY', 'inputZ'];
    inputs.forEach(inputId => {
      const input = document.getElementById(inputId);
      if (input) {
        input.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            this.goToAbsolute();
          }
        });
      }
    });
  }

  setupPresetControls() {
    const fineBtn = document.querySelector('.preset-btn[onclick*="fine"]');
    const coarseBtn = document.querySelector('.preset-btn[onclick*="coarse"]');
    
    if (fineBtn) {
      fineBtn.addEventListener('click', () => {
        this.setPreset('fine');
      });
    }
    
    if (coarseBtn) {
      coarseBtn.addEventListener('click', () => {
        this.setPreset('coarse');
      });
    }
  }

  // Input mode management
  setInputMode(mode) {
    if (mode !== 'relative' && mode !== 'absolute') {
      console.warn('Invalid input mode:', mode);
      return;
    }
    
    // Préserver l'état du mode contrôleur
    const wasControllerActive = window.EnderTrack?.KeyboardMode?.isActive || false;
    
    this.inputMode = mode;
    
    // Update state
    EnderTrack.State.update({ inputMode: mode });
    
    // Update UI
    this.updateInputModeUI(mode);
    
    // Restaurer le mode contrôleur s'il était actif
    if (wasControllerActive && !window.EnderTrack?.KeyboardMode?.isActive) {
      setTimeout(() => {
        if (window.EnderTrack?.KeyboardMode?.toggle) {
          window.EnderTrack.KeyboardMode.toggle();
        }
      }, 100);
    }
    
    console.log(`🧭 Input mode changed to: ${mode}`);
  }

  updateInputModeUI(mode) {
    // Update tab buttons
    const relativeTab = document.getElementById('relativeTab');
    const absoluteTab = document.getElementById('absoluteTab');
    
    if (relativeTab && absoluteTab) {
      relativeTab.classList.toggle('active', mode === 'relative');
      absoluteTab.classList.toggle('active', mode === 'absolute');
    }
    
    // Show/hide control panels
    const relativeControls = document.getElementById('relativeControls');
    const absoluteControls = document.getElementById('absoluteControls');
    
    if (relativeControls && absoluteControls) {
      relativeControls.classList.toggle('active', mode === 'relative');
      absoluteControls.classList.toggle('active', mode === 'absolute');
    }
  }

  // Sensitivity management
  setSensitivity(axis, value) {
    const clampedValue = EnderTrack.Math.clamp(value, 0.01, 50);
    const property = `sensitivity${axis.toUpperCase()}`;
    
    EnderTrack.State.update({ [property]: clampedValue });
    
    // Update UI if needed
    this.updateSensitivityUI(axis, clampedValue);
  }

  updateSensitivityUI(axis, value) {
    const slider = document.getElementById(`sensitivity${axis.toUpperCase()}`);
    const input = document.getElementById(`sensitivity${axis.toUpperCase()}Input`);
    
    if (slider && parseFloat(slider.value) !== value) {
      slider.value = value;
    }
    
    if (input && parseFloat(input.value) !== value) {
      input.value = value.toFixed(2);
    }
  }

  // Lock management
  toggleLock(axis) {
    const currentState = EnderTrack.State.get();
    
    if (axis === 'XY' && currentState.lockXY) {
      // When XY is coupled, toggle both X and Y locks together
      const newLockState = !(currentState.lockX && currentState.lockY); // Lock if either is unlocked
      EnderTrack.State.update({ 
        lockX: newLockState,
        lockY: newLockState 
      });
      
      this.updateLockUI('X', newLockState);
      this.updateLockUI('Y', newLockState);
      this.updateLockUI('XY', newLockState);
      console.log(`🔒 XY axes ${newLockState ? 'locked' : 'unlocked'}`);
    } else if (axis === 'X' || axis === 'Y') {
      // Individual X or Y axis lock
      const lockKey = `lock${axis}`;
      const newLockState = !currentState[lockKey];
      
      EnderTrack.State.update({ [lockKey]: newLockState });
      this.updateLockUI(axis, newLockState);
      
      // If XY is coupled, also update the other axis and XY display
      if (currentState.lockXY) {
        const otherAxis = axis === 'X' ? 'Y' : 'X';
        EnderTrack.State.update({ [`lock${otherAxis}`]: newLockState });
        this.updateLockUI(otherAxis, newLockState);
        this.updateLockUI('XY', newLockState);
        console.log(`🔒 XY axes ${newLockState ? 'locked' : 'unlocked'} (via ${axis})`);
      } else {
        console.log(`🔒 ${axis} axis ${newLockState ? 'locked' : 'unlocked'}`);
      }
    } else if (axis === 'HomeXY' || axis === 'HomeXYZ') {
      // Home button locks
      const lockKey = `lock${axis}`;
      const newLockState = !currentState[lockKey];
      
      EnderTrack.State.update({ [lockKey]: newLockState });
      this.updateLockUI(axis, newLockState);
      console.log(`🔒 ${axis} ${newLockState ? 'locked' : 'unlocked'}`);
    } else {
      // Z axis or other locks
      const lockKey = `lock${axis}`;
      const newLockState = !currentState[lockKey];
      
      EnderTrack.State.update({ [lockKey]: newLockState });
      this.updateLockUI(axis, newLockState);
      console.log(`🔒 ${axis} axis ${newLockState ? 'locked' : 'unlocked'}`);
    }
    
    this.updateButtonStates();
  }

  // Toggle XY coupling
  toggleCoupling() {
    const state = EnderTrack.State.get();
    const newCouplingState = !state.lockXY;
    
    if (newCouplingState) {
      // When coupling XY, synchronize lock states
      // If both X and Y are locked, keep them locked
      // If both are unlocked, keep them unlocked
      // If mixed, unlock both for consistency
      if (state.lockX !== state.lockY) {
        EnderTrack.State.update({ 
          lockXY: newCouplingState,
          lockX: false,
          lockY: false
        });
        this.updateLockUI('X', false);
        this.updateLockUI('Y', false);
        this.updateLockUI('XY', false);
      } else {
        EnderTrack.State.update({ lockXY: newCouplingState });
        this.updateLockUI('XY', state.lockX);
      }
    } else {
      // When decoupling, just update coupling state
      EnderTrack.State.update({ lockXY: newCouplingState });
    }
    
    this.updateCouplingUI(newCouplingState);
    this.updateCouplingButton(newCouplingState);
    
    console.log(`🔗 XY coupling ${newCouplingState ? 'enabled' : 'disabled'}`);
  }

  updateCouplingUI(coupled) {
    const xyControl = document.getElementById('xyControl');
    const xControl = document.getElementById('xControl');
    const yControl = document.getElementById('yControl');
    
    if (xyControl && xControl && yControl) {
      xyControl.style.display = coupled ? 'grid' : 'none';
      xControl.style.display = coupled ? 'none' : 'grid';
      yControl.style.display = coupled ? 'none' : 'grid';
    }
  }
  
  updateCouplingButton(coupled) {
    const xyCoupling = document.getElementById('xyCoupling');
    const xyCouplingAbs = document.getElementById('xyCouplingAbs');
    
    [xyCoupling, xyCouplingAbs].forEach(element => {
      if (element) {
        element.textContent = 'XY 🔗';
        element.classList.toggle('active', coupled);
      }
    });
    
    // Switch between coupled and separate layouts
    const coupledGroup = document.getElementById('xyCoupledGroup');
    const separateGroup = document.getElementById('xySeparateGroup');
    
    if (coupledGroup && separateGroup) {
      coupledGroup.classList.toggle('active', coupled);
      separateGroup.classList.toggle('hidden', coupled);
    }
    
    // Sync input values between layouts
    this.syncXYInputs();
  }

  updateLockUI(axis, isLocked) {
    if (axis === 'XY') {
      // Update XY coupled lock button
      const lockBtn = document.getElementById('lockXYBtn');
      if (lockBtn) {
        lockBtn.textContent = isLocked ? '🔒' : '🔓';
        lockBtn.classList.toggle('locked', isLocked);
        lockBtn.title = `XY axes ${isLocked ? 'locked' : 'unlocked'}`;
      }
      
      // Update XY lock button in absolute mode
      const lockBtnAbs = document.getElementById('lockXYBtnAbs');
      if (lockBtnAbs) {
        lockBtnAbs.textContent = isLocked ? '🔒' : '🔓';
        lockBtnAbs.classList.toggle('locked', isLocked);
        lockBtnAbs.title = `XY axes ${isLocked ? 'locked' : 'unlocked'}`;
      }
      
      // Update XY control disabled state
      const xyControl = document.getElementById('xyControl');
      const xySlider = document.getElementById('sensitivityXY');
      const xyInput = document.getElementById('sensitivityXYInput');
      
      if (xyControl) xyControl.classList.toggle('locked', isLocked);
      if (xySlider) xySlider.disabled = isLocked;
      if (xyInput) xyInput.disabled = isLocked;
      
      // Update absolute mode XY inputs
      const inputX = document.getElementById('inputX');
      const inputY = document.getElementById('inputY');
      const inputXSep = document.getElementById('inputXSep');
      const inputYSep = document.getElementById('inputYSep');
      
      if (inputX) inputX.disabled = isLocked;
      if (inputY) inputY.disabled = isLocked;
      if (inputXSep) inputXSep.disabled = isLocked;
      if (inputYSep) inputYSep.disabled = isLocked;
    } else {
      // Update individual axis lock button (relative mode)
      const lockBtn = document.getElementById(`lock${axis}Btn`);
      if (lockBtn) {
        lockBtn.textContent = isLocked ? '🔒' : '🔓';
        lockBtn.classList.toggle('locked', isLocked);
        lockBtn.title = `${axis} axis ${isLocked ? 'locked' : 'unlocked'}`;
      }
      
      // Update absolute mode lock button
      const lockBtnAbs = document.getElementById(`lock${axis}BtnAbs`);
      if (lockBtnAbs) {
        lockBtnAbs.textContent = isLocked ? '🔒' : '🔓';
        lockBtnAbs.classList.toggle('locked', isLocked);
        lockBtnAbs.title = `${axis} axis ${isLocked ? 'locked' : 'unlocked'}`;
      }
      
      // Update axis control disabled state
      const axisControl = document.getElementById(`${axis.toLowerCase()}Control`);
      const slider = document.getElementById(`sensitivity${axis}`);
      const input = document.getElementById(`sensitivity${axis}Input`);
      
      if (axisControl) axisControl.classList.toggle('locked', isLocked);
      if (slider) slider.disabled = isLocked;
      if (input) input.disabled = isLocked;
      
      // Update absolute mode input
      const absoluteInput = document.getElementById(`input${axis}`);
      const absoluteInputSep = document.getElementById(`input${axis}Sep`);
      
      if (absoluteInput) {
        const absoluteInputGroup = absoluteInput.parentElement;
        if (absoluteInputGroup) {
          absoluteInputGroup.classList.toggle('locked', isLocked);
        }
        absoluteInput.disabled = isLocked;
      }
      
      if (absoluteInputSep) {
        const absoluteInputGroup = absoluteInputSep.parentElement;
        if (absoluteInputGroup) {
          absoluteInputGroup.classList.toggle('locked', isLocked);
        }
        absoluteInputSep.disabled = isLocked;
      }
    }
    
    // Handle Home button locks
    if (axis === 'HomeXY' || axis === 'HomeXYZ') {
      const lockBtn = document.getElementById(`lock${axis}Btn`);
      const homeBtn = document.getElementById(axis === 'HomeXY' ? 'homeXYBtn' : 'homeXYZBtn');
      
      if (lockBtn) {
        lockBtn.textContent = isLocked ? '🔒' : '🔓';
        lockBtn.classList.toggle('locked', isLocked);
        lockBtn.title = `${axis} ${isLocked ? 'locked' : 'unlocked'}`;
      }
      
      if (homeBtn) {
        homeBtn.disabled = isLocked;
        homeBtn.classList.toggle('disabled', isLocked);
      }
    }
  }

  // Update button states based on locks
  updateButtonStates() {
    const state = EnderTrack.State.get();
    
    // Direction buttons
    const buttons = {
      up: document.getElementById('up'),
      down: document.getElementById('down'),
      left: document.getElementById('left'),
      right: document.getElementById('right'),
      upLeft: document.getElementById('upLeft'),
      upRight: document.getElementById('upRight'),
      downLeft: document.getElementById('downLeft'),
      downRight: document.getElementById('downRight'),
      zUp: document.getElementById('zUp'),
      zDown: document.getElementById('zDown')
    };
    
    // Calculate effective locks
    const effectiveLockX = state.lockX;
    const effectiveLockY = state.lockY;
    const effectiveLockZ = state.lockZ;
    
    // Disable/enable based on locks
    if (buttons.up) buttons.up.disabled = effectiveLockY;
    if (buttons.down) buttons.down.disabled = effectiveLockY;
    if (buttons.left) buttons.left.disabled = effectiveLockX;
    if (buttons.right) buttons.right.disabled = effectiveLockX;
    
    // Diagonal buttons - disabled if either axis is locked
    if (buttons.upLeft) buttons.upLeft.disabled = effectiveLockX || effectiveLockY;
    if (buttons.upRight) buttons.upRight.disabled = effectiveLockX || effectiveLockY;
    if (buttons.downLeft) buttons.downLeft.disabled = effectiveLockX || effectiveLockY;
    if (buttons.downRight) buttons.downRight.disabled = effectiveLockX || effectiveLockY;
    
    if (buttons.zUp) buttons.zUp.disabled = effectiveLockZ;
    if (buttons.zDown) buttons.zDown.disabled = effectiveLockZ;
    
    // Home buttons - ensure they're enabled by default
    const homeXYBtn = document.getElementById('homeXYBtn');
    const homeXYZBtn = document.getElementById('homeXYZBtn');
    
    if (homeXYBtn) {
      homeXYBtn.disabled = state.lockHomeXY || false;
      homeXYBtn.classList.toggle('disabled', state.lockHomeXY || false);
    }
    
    if (homeXYZBtn) {
      homeXYZBtn.disabled = state.lockHomeXYZ || false;
      homeXYZBtn.classList.toggle('disabled', state.lockHomeXYZ || false);
    }
  }



  setXYCoupling(coupled) {
    const state = EnderTrack.State.get();
    
    if (coupled) {
      // When coupling XY, synchronize lock states
      if (state.lockX !== state.lockY) {
        // If X and Y have different lock states, unlock both for consistency
        EnderTrack.State.update({ 
          lockXY: coupled,
          lockX: false,
          lockY: false
        });
        this.updateLockUI('X', false);
        this.updateLockUI('Y', false);
        this.updateLockUI('XY', false);
      } else {
        EnderTrack.State.update({ lockXY: coupled });
        this.updateLockUI('XY', state.lockX);
      }
    } else {
      EnderTrack.State.update({ lockXY: coupled });
    }
    
    // Update UI immediately
    this.updateCouplingUI(coupled);
    this.updateCouplingButton(coupled);
    
    console.log(`🔗 XY coupling ${coupled ? 'enabled' : 'disabled'}`);
  }

  // Movement controls
  async moveDirection(direction) {
    if (!EnderTrack.Movement) {
      console.error('Movement engine not available');
      return;
    }
    
    try {
      await EnderTrack.Movement.moveDirection(direction);
    } catch (error) {
      console.error('Movement failed:', error);
      EnderTrack.UI?.showNotification?.('Erreur de mouvement', 'error');
    }
  }

  async goToAbsolute() {
    const state = EnderTrack.State.get();
    let inputX, inputY;
    const inputZ = document.getElementById('inputZ');
    
    // Get inputs based on coupling state
    if (state.lockXY) {
      inputX = document.getElementById('inputX');
      inputY = document.getElementById('inputY');
    } else {
      inputX = document.getElementById('inputXSep');
      inputY = document.getElementById('inputYSep');
    }
    
    if (!inputX || !inputY || !inputZ) {
      console.error('Absolute input elements not found');
      return;
    }
    
    const x = parseFloat(inputX.value) || 0;
    const y = parseFloat(inputY.value) || 0;
    const z = parseFloat(inputZ.value) || 0;
    
    if (!EnderTrack.Movement) {
      console.error('Movement engine not available');
      return;
    }
    
    try {
      await EnderTrack.Movement.moveAbsolute(x, y, z);
    } catch (error) {
      console.error('Absolute movement failed:', error);
      EnderTrack.UI?.showNotification?.('Erreur de positionnement absolu', 'error');
    }
  }

  async goHome(mode = 'xy') {
    const state = EnderTrack.State.get();
    
    // Check if home function is locked
    if (mode === 'xy' && state.lockHomeXY) {
      console.log('Home XY is locked');
      return;
    }
    if (mode === 'xyz' && state.lockHomeXYZ) {
      console.log('Home XYZ is locked');
      return;
    }
    
    if (!EnderTrack.Movement) {
      console.error('Movement engine not available');
      return;
    }
    
    try {
      // Home XY: moveAbsolute(0, 0, current_z)
      // Home XYZ: moveAbsolute(0, 0, 0)
      if (mode === 'xy') {
        await EnderTrack.Movement.moveAbsolute(0, 0, state.pos.z);
      } else {
        await EnderTrack.Movement.moveAbsolute(0, 0, 0);
      }
      EnderTrack.UI?.showNotification?.(`Retour à l'origine ${mode.toUpperCase()}`, 'success');
    } catch (error) {
      console.error('Home movement failed:', error);
      EnderTrack.UI?.showNotification?.('Erreur de retour origine', 'error');
    }
  }

  // Preset controls
  setPreset(preset) {
    const state = EnderTrack.State.get();
    const presetValue = state.stepPresets[preset];
    
    if (!presetValue) {
      console.warn('Unknown preset:', preset);
      return;
    }
    
    // Clamp preset values to current slider max
    const xyZoom = state.zoom || 1;
    const zZoom = state.zZoom || 1;
    const maxXY = Math.max(0.5, 50 / xyZoom);
    const maxZ = Math.max(0.5, 50 / zZoom);
    
    const clampedXY = Math.min(presetValue, maxXY);
    const clampedZ = Math.min(presetValue, maxZ);
    
    // Apply preset to all unlocked axes
    const updates = {};
    
    if (!state.lockX) updates.sensitivityX = clampedXY;
    if (!state.lockY) updates.sensitivityY = clampedXY;
    if (!state.lockZ) updates.sensitivityZ = clampedZ;
    
    EnderTrack.State.update(updates);
    
    // Update UI for all axes
    this.updateSensitivityUI('x', clampedXY);
    this.updateSensitivityUI('y', clampedXY);
    this.updateSensitivityUI('z', clampedZ);
    
    // Update XY slider if coupled
    if (state.lockXY) {
      const xySlider = document.getElementById('sensitivityXY');
      const xyInput = document.getElementById('sensitivityXYInput');
      if (xySlider) xySlider.value = presetValue;
      if (xyInput) xyInput.value = presetValue.toFixed(2);
    }
    
    EnderTrack.UI?.showNotification?.(`Preset ${preset} appliqué`, 'info');
  }

  // Axis-specific preset controls
  setAxisPreset(axis, preset) {
    const state = EnderTrack.State.get();
    const presetValue = state.stepPresets[preset];
    
    if (!presetValue) {
      console.warn('Unknown preset:', preset);
      return;
    }
    
    if (axis === 'xy' && state.lockXY) {
      // Apply to both X and Y when coupled
      EnderTrack.State.update({ 
        sensitivityX: presetValue,
        sensitivityY: presetValue 
      });
      this.updateSensitivityUI('x', presetValue);
      this.updateSensitivityUI('y', presetValue);
      // Update XY slider
      const xySlider = document.getElementById('sensitivityXY');
      const xyInput = document.getElementById('sensitivityXYInput');
      if (xySlider) xySlider.value = presetValue;
      if (xyInput) xyInput.value = presetValue.toFixed(2);
    } else {
      // Apply to individual axis
      const updates = {};
      updates[`sensitivity${axis.toUpperCase()}`] = presetValue;
      EnderTrack.State.update(updates);
      this.updateSensitivityUI(axis, presetValue);
    }
    
    EnderTrack.UI?.showNotification?.(`${axis.toUpperCase()}: ${preset} (${presetValue}mm)`, 'info');
  }

  // Update slider ranges based on zoom levels
  updateSliderRanges(state) {
    // Calculate adaptive max values based on zoom
    const xyZoom = state.zoom || 1;
    const zZoom = state.zZoom || 1;
    
    // Base max values
    const baseMaxXY = 50;
    const baseMaxZ = 50;
    
    // Calculate adaptive max (inverse relationship with zoom)
    // At zoom 1x: max = 200mm
    // At zoom 400x: max = 0.5mm
    const adaptiveMaxXY = Math.max(0.5, baseMaxXY / (xyZoom / 4));
    const adaptiveMaxZ = Math.max(0.5, baseMaxZ / (zZoom / 4));
    
    // Update XY sliders
    const xySlider = document.getElementById('sensitivityXY');
    const xyInput = document.getElementById('sensitivityXYInput');
    const xSlider = document.getElementById('sensitivityX');
    const xInput = document.getElementById('sensitivityXInput');
    const ySlider = document.getElementById('sensitivityY');
    const yInput = document.getElementById('sensitivityYInput');
    
    [xySlider, xSlider, ySlider].forEach(slider => {
      if (slider) {
        slider.max = adaptiveMaxXY.toFixed(2);
        // Clamp current value to new max
        if (parseFloat(slider.value) > adaptiveMaxXY) {
          slider.value = adaptiveMaxXY.toFixed(2);
        }
      }
    });
    
    [xyInput, xInput, yInput].forEach(input => {
      if (input) {
        input.max = adaptiveMaxXY.toFixed(2);
        // Clamp current value to new max
        if (parseFloat(input.value) > adaptiveMaxXY) {
          input.value = adaptiveMaxXY.toFixed(2);
        }
      }
    });
    
    // Update Z slider
    const zSlider = document.getElementById('sensitivityZ');
    const zInput = document.getElementById('sensitivityZInput');
    
    if (zSlider) {
      zSlider.max = adaptiveMaxZ.toFixed(2);
      if (parseFloat(zSlider.value) > adaptiveMaxZ) {
        zSlider.value = adaptiveMaxZ.toFixed(2);
      }
    }
    
    if (zInput) {
      zInput.max = adaptiveMaxZ.toFixed(2);
      if (parseFloat(zInput.value) > adaptiveMaxZ) {
        zInput.value = adaptiveMaxZ.toFixed(2);
      }
    }
    
    // Update state if values were clamped
    const updates = {};
    if (state.sensitivityX > adaptiveMaxXY) updates.sensitivityX = adaptiveMaxXY;
    if (state.sensitivityY > adaptiveMaxXY) updates.sensitivityY = adaptiveMaxXY;
    if (state.sensitivityZ > adaptiveMaxZ) updates.sensitivityZ = adaptiveMaxZ;
    
    if (Object.keys(updates).length > 0) {
      EnderTrack.State.update(updates);
    }
  }
  
  // Sync XY input values between coupled and separate layouts
  syncXYInputs() {
    const inputX = document.getElementById('inputX');
    const inputY = document.getElementById('inputY');
    const inputXSep = document.getElementById('inputXSep');
    const inputYSep = document.getElementById('inputYSep');
    
    if (inputX && inputXSep) {
      inputXSep.value = inputX.value;
    }
    if (inputY && inputYSep) {
      inputYSep.value = inputY.value;
    }
  }

  // Update UI from current state
  updateUIFromState() {
    const state = EnderTrack.State.get();
    
    // Update input mode
    this.updateInputModeUI(state.inputMode);
    
    // Update sensitivity values
    this.updateSensitivityUI('x', state.sensitivityX);
    this.updateSensitivityUI('y', state.sensitivityY);
    this.updateSensitivityUI('z', state.sensitivityZ);
    
    // Update XY coupled slider
    const xySlider = document.getElementById('sensitivityXY');
    const xyInput = document.getElementById('sensitivityXYInput');
    if (xySlider && xyInput && state.lockXY) {
      const avgSensitivity = (state.sensitivityX + state.sensitivityY) / 2;
      xySlider.value = avgSensitivity;
      xyInput.value = avgSensitivity.toFixed(2);
    }
    
    // Update lock states
    this.updateLockUI('X', state.lockX);
    this.updateLockUI('Y', state.lockY);
    this.updateLockUI('Z', state.lockZ);
    
    // Update XY lock state when coupled
    if (state.lockXY) {
      // XY button shows locked if both X and Y are locked
      this.updateLockUI('XY', state.lockX && state.lockY);
    }
    
    // Update XY lock in absolute mode
    const lockXYBtnAbs = document.getElementById('lockXYBtnAbs');
    if (lockXYBtnAbs && state.lockXY) {
      const isLocked = state.lockX && state.lockY;
      lockXYBtnAbs.textContent = isLocked ? '🔒' : '🔓';
      lockXYBtnAbs.classList.toggle('locked', isLocked);
    }
    
    // Update coupling UI
    this.updateCouplingUI(state.lockXY);
    this.updateCouplingButton(state.lockXY);
    
    // Update button states
    this.updateButtonStates();
    
    // Update absolute mode lock indicators
    this.updateAbsoluteLockIndicators(state);
    
    // Update home lock states - ensure they start unlocked
    this.updateLockUI('HomeXY', state.lockHomeXY || false);
    this.updateLockUI('HomeXYZ', state.lockHomeXYZ || false);
    
    // Force update button states to ensure Home buttons are enabled
    setTimeout(() => this.updateButtonStates(), 100);
    
    // Update absolute inputs with current position
    const inputX = document.getElementById('inputX');
    const inputY = document.getElementById('inputY');
    const inputXSep = document.getElementById('inputXSep');
    const inputYSep = document.getElementById('inputYSep');
    const inputZ = document.getElementById('inputZ');
    
    if (inputX) inputX.value = state.pos.x.toFixed(2);
    if (inputY) inputY.value = state.pos.y.toFixed(2);
    if (inputXSep) inputXSep.value = state.pos.x.toFixed(2);
    if (inputYSep) inputYSep.value = state.pos.y.toFixed(2);
    if (inputZ) inputZ.value = state.pos.z.toFixed(2);
  }

  updateAbsoluteLockIndicators(state) {
    // Update absolute mode inputs based on lock states
    const axes = ['X', 'Y', 'Z'];
    
    axes.forEach(axis => {
      const input = document.getElementById(`input${axis}`);
      const inputSep = document.getElementById(`input${axis}Sep`);
      const isLocked = state[`lock${axis}`] || (axis !== 'Z' && state.lockXY && (state.lockX || state.lockY));
      
      if (input) {
        const inputGroup = input.parentElement;
        if (inputGroup) {
          inputGroup.classList.toggle('locked', isLocked);
        }
        input.disabled = isLocked;
      }
      
      if (inputSep) {
        const inputGroup = inputSep.parentElement;
        if (inputGroup) {
          inputGroup.classList.toggle('locked', isLocked);
        }
        inputSep.disabled = isLocked;
      }
    });
  }

  // Get current navigation state
  getNavigationState() {
    const state = EnderTrack.State.get();
    
    return {
      inputMode: state.inputMode,
      sensitivity: {
        x: state.sensitivityX,
        y: state.sensitivityY,
        z: state.sensitivityZ
      },
      locks: {
        x: state.lockX,
        y: state.lockY,
        z: state.lockZ,
        xy: state.lockXY
      },
      position: { ...state.pos },
      isMoving: state.isMoving
    };
  }

  // Validate movement before execution
  validateMovement(direction, distance) {
    const state = EnderTrack.State.get();
    
    // Check if movement is allowed
    if (state.isMoving) {
      return { valid: false, reason: 'Movement already in progress' };
    }
    
    // Check axis locks
    const axisLocks = {
      up: state.lockY,
      down: state.lockY,
      left: state.lockX,
      right: state.lockX,
      zUp: state.lockZ,
      zDown: state.lockZ
    };
    
    if (axisLocks[direction]) {
      return { valid: false, reason: `${direction} axis is locked` };
    }
    
    return { valid: true };
  }

  // Debug information
  getDebugInfo() {
    return {
      isInitialized: this.isInitialized,
      inputMode: this.inputMode,
      locks: { ...this.locks },
      navigationState: this.getNavigationState()
    };
  }
}

// Global instance
window.EnderTrack = window.EnderTrack || {};
window.EnderTrack.Navigation = new NavigationControls();

// Expose functions globally for HTML onclick handlers
window.setInputMode = (mode) => EnderTrack.Navigation.setInputMode(mode);
window.toggleLock = (axis) => EnderTrack.Navigation.toggleLock(axis);
window.toggleCoupling = () => EnderTrack.Navigation.toggleCoupling();
window.moveDirection = (direction) => EnderTrack.Navigation.moveDirection(direction);
window.goToAbsolute = () => EnderTrack.Navigation.goToAbsolute();
window.goHome = (mode) => EnderTrack.Navigation.goHome(mode);
window.setPreset = (preset) => EnderTrack.Navigation.setPreset(preset);
window.setAxisPreset = (axis, preset) => EnderTrack.Navigation.setAxisPreset(axis, preset);

// Canvas interaction functions
window.clearHistory = () => EnderTrack.State.clearHistory();
window.saveTrack = () => EnderTrack.State.saveTrack();
window.loadTrack = () => EnderTrack.State.loadTrack();
window.emergencyStop = () => {
  EnderTrack.State.update({ isMoving: false });
  console.log('🛑 Emergency stop activated');
};

// Settings functions
window.switchTab = (tabName) => {
  EnderTrack.State.update({ activeTab: tabName });
  // Update tab UI
  document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById(tabName + 'Tab')?.classList.add('active');
  document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
  document.getElementById(tabName + 'TabContent')?.classList.add('active');
};

window.showPluginSelector = () => {
  console.log('Plugin selector requested');
};

// AI functions
window.toggleVoiceRecording = () => {
  console.log('Voice recording toggle requested');
};

window.sendAICommand = () => {
  const input = document.getElementById('aiPrompt');
  if (input && input.value.trim()) {
    console.log('AI command:', input.value);
    input.value = '';
  }
};