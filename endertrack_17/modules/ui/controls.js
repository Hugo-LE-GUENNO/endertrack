// modules/ui/controls.js - UI controls and components

class UIControls {
  constructor() {
    this.isInitialized = false;
    this.controls = new Map();
  }

  init() {
    console.log('🎛️ Initializing UI Controls...');
    
    // Initialize all UI controls
    this.initializeControls();
    
    this.isInitialized = true;
    console.log('✅ UI Controls initialized');
    
    return true;
  }

  initializeControls() {
    // Initialize existing controls
    this.initializeSensitivityControls();
    this.initializeSpeedControl();
    this.initializeSettingsControls();
    this.initializePositionInputs();
  }

  initializeSensitivityControls() {
    const axes = ['X', 'Y', 'Z'];
    
    axes.forEach(axis => {
      const slider = document.getElementById(`sensitivity${axis}`);
      const input = document.getElementById(`sensitivity${axis}Input`);
      
      if (slider && input) {
        this.createLinkedControls(`sensitivity${axis}`, slider, input, {
          min: 0.01,
          max: 50,
          step: 0.01,
          decimals: 2,
          onChange: (value) => {
            EnderTrack.State.update({ [`sensitivity${axis}`]: value });
          }
        });
      }
    });
  }

  initializeSpeedControl() {
    const speedSlider = document.getElementById('moveSpeed');
    const speedValue = document.getElementById('speedValue');
    
    if (speedSlider && speedValue) {
      this.createSliderWithDisplay('moveSpeed', speedSlider, speedValue, {
        min: 1,
        max: 100,
        step: 1,
        onChange: (value) => {
          EnderTrack.State.update({ moveSpeed: value });
          if (EnderTrack.Movement) {
            EnderTrack.Movement.setSpeed(value);
          }
        }
      });
    }
  }

  initializeSettingsControls() {
    // Plateau dimensions controls
    const plateauInputs = [
      { id: 'plateauX', axis: 'x' },
      { id: 'plateauY', axis: 'y' },
      { id: 'plateauZ', axis: 'z' }
    ];
    
    plateauInputs.forEach(({ id, axis }) => {
      const input = document.getElementById(id);
      if (input) {
        this.createNumberInput(id, input, {
          min: 10,
          max: axis === 'z' ? 500 : 1000,
          step: 1,
          onChange: (value) => {
            const state = EnderTrack.State.get();
            const newDimensions = { ...state.plateauDimensions };
            newDimensions[axis] = value;
            
            EnderTrack.State.update({ 
              plateauDimensions: newDimensions,
              // Update mapSizeMm for backward compatibility (use larger of X/Y)
              mapSizeMm: Math.max(newDimensions.x, newDimensions.y)
            });
            
            // Update coordinate system
            if (EnderTrack.Coordinates) {
              EnderTrack.Coordinates.updateParameters({ 
                plateauDimensions: newDimensions,
                mapSizeMm: Math.max(newDimensions.x, newDimensions.y)
              });
            }
            
            // Update position input limits
            if (EnderTrack.UI?.Controls) {
              EnderTrack.UI.Controls.updatePositionInputLimits();
            }
          }
        });
      }
    });
    
    // Checkbox controls
    const checkboxes = [
      { id: 'showGrid', stateKey: 'showGrid' },
      { id: 'showTrack', stateKey: 'showNavigationTrack' },
      { id: 'lockXY', stateKey: 'lockXY' }
    ];
    
    checkboxes.forEach(({ id, stateKey }) => {
      const checkbox = document.getElementById(id);
      if (checkbox) {
        this.createCheckbox(id, checkbox, {
          onChange: (checked) => {
            EnderTrack.State.update({ [stateKey]: checked });
          }
        });
      }
    });
  }

  initializePositionInputs() {
    const inputs = [
      { id: 'inputX', axis: 'x' },
      { id: 'inputY', axis: 'y' },
      { id: 'inputZ', axis: 'z' },
      { id: 'inputXSep', axis: 'x' },
      { id: 'inputYSep', axis: 'y' }
    ];
    
    inputs.forEach(({ id, axis }) => {
      const input = document.getElementById(id);
      if (input) {
        // Get plateau dimensions for limits
        const state = EnderTrack.State?.get?.() || {};
        const dimensions = state.plateauDimensions || { x: 200, y: 200, z: 100 };
        const axisSize = dimensions[axis];
        
        this.createNumberInput(id, input, {
          min: -axisSize / 2,
          max: axisSize / 2,
          step: 0.1,
          decimals: 1,
          onChange: (value) => {
            // Update input value and force canvas render for overlay
            this.updatePositionPreview();
            if (EnderTrack.Canvas) {
              EnderTrack.Canvas.requestRender();
            }
            // Update get button states using same function as position changes
            if (window.updateGetButtonStates) {
              window.updateGetButtonStates();
            }
          }
        });
      }
    });
    

  }

  // Control creation methods
  createLinkedControls(id, slider, input, options = {}) {
    const {
      min = 0,
      max = 100,
      step = 1,
      decimals = 0,
      onChange = null
    } = options;

    const control = {
      type: 'linked',
      slider,
      input,
      options,
      getValue: () => parseFloat(slider.value),
      setValue: (value) => {
        const clampedValue = this.clampValue(value, min, max);
        slider.value = clampedValue;
        input.value = decimals > 0 ? clampedValue.toFixed(decimals) : clampedValue;
      }
    };

    // Sync slider to input
    slider.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      input.value = decimals > 0 ? value.toFixed(decimals) : value;
      
      if (onChange) onChange(value);
    });

    // Sync input to slider
    input.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      if (!isNaN(value)) {
        const clampedValue = this.clampValue(value, min, max);
        slider.value = clampedValue;
        
        if (onChange) onChange(clampedValue);
      }
    });

    // Validate input on blur
    input.addEventListener('blur', (e) => {
      const value = parseFloat(e.target.value);
      if (isNaN(value) || value < min || value > max) {
        const clampedValue = this.clampValue(value || min, min, max);
        e.target.value = decimals > 0 ? clampedValue.toFixed(decimals) : clampedValue;
        slider.value = clampedValue;
        
        if (onChange) onChange(clampedValue);
      }
    });

    this.controls.set(id, control);
    return control;
  }

  createSliderWithDisplay(id, slider, display, options = {}) {
    const {
      min = 0,
      max = 100,
      step = 1,
      suffix = '',
      onChange = null
    } = options;

    const control = {
      type: 'slider-display',
      slider,
      display,
      options,
      getValue: () => parseFloat(slider.value),
      setValue: (value) => {
        const clampedValue = this.clampValue(value, min, max);
        slider.value = clampedValue;
        display.textContent = clampedValue + suffix;
      }
    };

    slider.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      display.textContent = value + suffix;
      
      if (onChange) onChange(value);
    });

    this.controls.set(id, control);
    return control;
  }

  createNumberInput(id, input, options = {}) {
    const {
      min = -Infinity,
      max = Infinity,
      step = 1,
      decimals = 0,
      onChange = null
    } = options;

    const control = {
      type: 'number',
      input,
      options,
      getValue: () => parseFloat(input.value),
      setValue: (value) => {
        const clampedValue = this.clampValue(value, min, max);
        input.value = decimals > 0 ? clampedValue.toFixed(decimals) : clampedValue;
      }
    };

    input.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      if (!isNaN(value) && onChange) {
        onChange(value);
      }
    });

    input.addEventListener('blur', (e) => {
      const value = parseFloat(e.target.value);
      if (isNaN(value) || value < min || value > max) {
        const clampedValue = this.clampValue(value || 0, min, max);
        e.target.value = decimals > 0 ? clampedValue.toFixed(decimals) : clampedValue;
        
        if (onChange) onChange(clampedValue);
      }
    });

    // Handle Enter key
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        input.blur(); // Trigger validation
      }
    });

    this.controls.set(id, control);
    return control;
  }

  createCheckbox(id, checkbox, options = {}) {
    const { onChange = null } = options;

    const control = {
      type: 'checkbox',
      checkbox,
      options,
      getValue: () => checkbox.checked,
      setValue: (value) => {
        checkbox.checked = Boolean(value);
      }
    };

    checkbox.addEventListener('change', (e) => {
      if (onChange) onChange(e.target.checked);
    });

    this.controls.set(id, control);
    return control;
  }

  createButton(id, button, options = {}) {
    const { onClick = null, disabled = false } = options;

    const control = {
      type: 'button',
      button,
      options,
      getValue: () => !button.disabled,
      setValue: (enabled) => {
        button.disabled = !enabled;
      }
    };

    if (onClick) {
      button.addEventListener('click', onClick);
    }

    button.disabled = disabled;

    this.controls.set(id, control);
    return control;
  }

  // Control management
  getControl(id) {
    return this.controls.get(id);
  }

  setValue(id, value) {
    const control = this.getControl(id);
    if (control && control.setValue) {
      control.setValue(value);
    }
  }

  getValue(id) {
    const control = this.getControl(id);
    if (control && control.getValue) {
      return control.getValue();
    }
    return null;
  }

  setEnabled(id, enabled) {
    const control = this.getControl(id);
    if (!control) return;

    switch (control.type) {
      case 'linked':
        control.slider.disabled = !enabled;
        control.input.disabled = !enabled;
        break;
      case 'slider-display':
        control.slider.disabled = !enabled;
        break;
      case 'number':
        control.input.disabled = !enabled;
        break;
      case 'checkbox':
        control.checkbox.disabled = !enabled;
        break;
      case 'button':
        control.button.disabled = !enabled;
        break;
    }
  }

  // Utility methods
  clampValue(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  updatePositionPreview() {
    // Get values from both coupled and separate inputs
    let x = this.getValue('inputX') || this.getValue('inputXSep');
    let y = this.getValue('inputY') || this.getValue('inputYSep');
    let z = this.getValue('inputZ');
    
    // Fallback to current position if inputs are null
    const state = EnderTrack.State.get();
    if (x === null) x = state.pos.x;
    if (y === null) y = state.pos.y;
    if (z === null) z = state.pos.z;
    
    if (x !== null && y !== null && z !== null) {
      // Update state for overlay rendering
      EnderTrack.State.update({
        targetPosition: { x, y, z }
      });
      
      // Emit preview event
      EnderTrack.Events?.emit?.('position:preview', { x, y, z });
    }
  }

  // Update position input limits based on plateau dimensions
  updatePositionInputLimits() {
    const state = EnderTrack.State?.get?.() || {};
    const dimensions = state.plateauDimensions || { x: 200, y: 200, z: 100 };
    
    const inputs = [
      { id: 'inputX', axis: 'x' },
      { id: 'inputY', axis: 'y' },
      { id: 'inputZ', axis: 'z' },
      { id: 'inputXSep', axis: 'x' },
      { id: 'inputYSep', axis: 'y' }
    ];
    
    inputs.forEach(({ id, axis }) => {
      const input = document.getElementById(id);
      if (input) {
        const axisSize = dimensions[axis];
        input.min = -axisSize / 2;
        input.max = axisSize / 2;
      }
    });
  }

  // State synchronization
  syncWithState() {
    const state = EnderTrack.State.get();
    
    // Sync sensitivity controls
    this.setValue('sensitivityX', state.sensitivityX);
    this.setValue('sensitivityY', state.sensitivityY);
    this.setValue('sensitivityZ', state.sensitivityZ);
    
    // Sync speed control
    this.setValue('moveSpeed', state.moveSpeed);
    
    // Sync settings
    this.setValue('plateauX', state.plateauDimensions?.x || 200);
    this.setValue('plateauY', state.plateauDimensions?.y || 200);
    this.setValue('plateauZ', state.plateauDimensions?.z || 100);
    
    // Update position input limits
    this.updatePositionInputLimits();
    this.setValue('showGrid', state.showGrid);
    this.setValue('showTrack', state.showNavigationTrack);
    this.setValue('lockXY', state.lockXY);
    
    // Sync position inputs (both coupled and separate)
    this.setValue('inputX', state.pos.x);
    this.setValue('inputY', state.pos.y);
    this.setValue('inputZ', state.pos.z);
    this.setValue('inputXSep', state.pos.x);
    this.setValue('inputYSep', state.pos.y);
  }

  // Dynamic control creation
  createDynamicSlider(container, options = {}) {
    const {
      id,
      label,
      min = 0,
      max = 100,
      value = 50,
      step = 1,
      onChange = null
    } = options;

    const wrapper = document.createElement('div');
    wrapper.className = 'control-group';
    wrapper.style.cssText = `
      margin-bottom: 12px;
    `;

    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    labelEl.style.cssText = `
      display: block;
      margin-bottom: 4px;
      font-size: 12px;
      font-weight: 500;
      color: #374151;
    `;

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.id = id;
    slider.min = min;
    slider.max = max;
    slider.value = value;
    slider.step = step;
    slider.style.cssText = `
      width: 100%;
      height: 4px;
      background: #e5e7eb;
      border-radius: 2px;
      outline: none;
    `;

    const valueDisplay = document.createElement('span');
    valueDisplay.textContent = value;
    valueDisplay.style.cssText = `
      font-size: 11px;
      color: #6b7280;
      float: right;
    `;

    wrapper.appendChild(labelEl);
    wrapper.appendChild(slider);
    wrapper.appendChild(valueDisplay);
    container.appendChild(wrapper);

    // Create control
    this.createSliderWithDisplay(id, slider, valueDisplay, {
      min, max, step, onChange
    });

    return wrapper;
  }

  createDynamicCheckbox(container, options = {}) {
    const {
      id,
      label,
      checked = false,
      onChange = null
    } = options;

    const wrapper = document.createElement('div');
    wrapper.className = 'control-group';
    wrapper.style.cssText = `
      margin-bottom: 12px;
    `;

    const labelEl = document.createElement('label');
    labelEl.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: #374151;
      cursor: pointer;
    `;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = id;
    checkbox.checked = checked;

    const labelText = document.createElement('span');
    labelText.textContent = label;

    labelEl.appendChild(checkbox);
    labelEl.appendChild(labelText);
    wrapper.appendChild(labelEl);
    container.appendChild(wrapper);

    // Create control
    this.createCheckbox(id, checkbox, { onChange });

    return wrapper;
  }

  createDynamicButton(container, options = {}) {
    const {
      id,
      text,
      type = 'default', // primary, secondary, danger
      onClick = null
    } = options;

    const button = document.createElement('button');
    button.id = id;
    button.textContent = text;
    button.className = `btn btn-${type}`;
    
    const typeStyles = {
      primary: `
        background: #3b82f6;
        color: white;
        border: 1px solid #3b82f6;
      `,
      secondary: `
        background: white;
        color: #374151;
        border: 1px solid #d1d5db;
      `,
      danger: `
        background: #ef4444;
        color: white;
        border: 1px solid #ef4444;
      `,
      default: `
        background: #f3f4f6;
        color: #374151;
        border: 1px solid #d1d5db;
      `
    };
    
    button.style.cssText = `
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      margin-bottom: 8px;
      width: 100%;
      ${typeStyles[type]}
    `;

    container.appendChild(button);

    // Create control
    this.createButton(id, button, { onClick });

    return button;
  }

  // Validation helpers
  validateNumberInput(value, min, max) {
    const num = parseFloat(value);
    if (isNaN(num)) return { valid: false, error: 'Invalid number' };
    if (num < min) return { valid: false, error: `Value must be >= ${min}` };
    if (num > max) return { valid: false, error: `Value must be <= ${max}` };
    return { valid: true, value: num };
  }

  showValidationError(element, message) {
    // Remove existing error
    this.clearValidationError(element);
    
    // Add error styling
    element.style.borderColor = '#ef4444';
    element.style.boxShadow = '0 0 0 1px #ef4444';
    
    // Create error message
    const errorEl = document.createElement('div');
    errorEl.className = 'validation-error';
    errorEl.textContent = message;
    errorEl.style.cssText = `
      color: #ef4444;
      font-size: 11px;
      margin-top: 2px;
    `;
    
    element.parentNode.insertBefore(errorEl, element.nextSibling);
  }

  clearValidationError(element) {
    // Reset styling
    element.style.borderColor = '';
    element.style.boxShadow = '';
    
    // Remove error message
    const errorEl = element.parentNode.querySelector('.validation-error');
    if (errorEl) {
      errorEl.remove();
    }
  }

  // Debug information
  getDebugInfo() {
    return {
      isInitialized: this.isInitialized,
      controlCount: this.controls.size,
      controls: Array.from(this.controls.keys())
    };
  }
}

// Update slider ranges based on zoom (called from controls.js)
function updateSliderRanges(zoom, zZoom) {
  console.log('updateSliderRanges called with zoom:', zoom, 'zZoom:', zZoom);
  
  // Update speed range if controller mode is active
  if (window.updateSpeedRange) {
    window.updateSpeedRange();
  }
}

// Global instance
window.EnderTrack = window.EnderTrack || {};
window.EnderTrack.UI = window.EnderTrack.UI || {};
window.EnderTrack.UI.Controls = new UIControls();
window.updateSliderRanges = updateSliderRanges;