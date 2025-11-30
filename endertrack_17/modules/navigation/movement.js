// modules/navigation/movement.js - Movement calculations and execution
// Pure movement logic with smooth animations

class MovementEngine {
  constructor() {
    this.isMoving = false;
    this.currentAnimation = null;
    this.moveQueue = [];
    this.emergencyStop = false;
  }

  // Move to absolute position with smooth animation
  async moveAbsolute(targetX, targetY, targetZ) {
    const state = EnderTrack.State.get();
    
    if (state.isMoving && !this.emergencyStop) {
      console.warn('Movement already in progress');
      return false;
    }
    
    // Validate coordinates
    const target = this.validateCoordinates(targetX, targetY, targetZ);
    if (!target) return false;
    
    // Calculate movement parameters
    const movement = this.calculateMovement(state.pos, target, state.moveSpeed);
    
    // Execute movement
    return await this.executeMovement(movement);
  }

  // Move relative to current position
  async moveRelative(dx, dy, dz) {
    const state = EnderTrack.State.get();
    
    const targetX = state.pos.x + Number(dx);
    const targetY = state.pos.y + Number(dy);
    const targetZ = state.pos.z + Number(dz);
    
    return await this.moveAbsolute(targetX, targetY, targetZ);
  }

  // Move in a specific direction with sensitivity
  async moveDirection(direction, customDistance = null) {
    const state = EnderTrack.State.get();
    
    // Vérification stricte : ignorer si mouvement en cours
    if (state.isMoving || this.isMoving) {
      return false;
    }
    
    let dx = 0, dy = 0, dz = 0;
    
    // Calculate movement based on direction and sensitivity
    switch (direction) {
      case 'up':
      case 'north':
        dy = -(customDistance || state.sensitivityY);
        break;
      case 'down':
      case 'south':
        dy = customDistance || state.sensitivityY;
        break;
      case 'left':
      case 'west':
        dx = -(customDistance || state.sensitivityX);
        break;
      case 'right':
      case 'east':
        dx = customDistance || state.sensitivityX;
        break;
      case 'upLeft':
        dx = -(customDistance || state.sensitivityX) / Math.sqrt(2);
        dy = -(customDistance || state.sensitivityY) / Math.sqrt(2);
        break;
      case 'upRight':
        dx = (customDistance || state.sensitivityX) / Math.sqrt(2);
        dy = -(customDistance || state.sensitivityY) / Math.sqrt(2);
        break;
      case 'downLeft':
        dx = -(customDistance || state.sensitivityX) / Math.sqrt(2);
        dy = (customDistance || state.sensitivityY) / Math.sqrt(2);
        break;
      case 'downRight':
        dx = (customDistance || state.sensitivityX) / Math.sqrt(2);
        dy = (customDistance || state.sensitivityY) / Math.sqrt(2);
        break;
      case 'zUp':
        if (!state.lockZ) {
          dz = customDistance || state.sensitivityZ;
        }
        break;
      case 'zDown':
        if (!state.lockZ) {
          dz = -(customDistance || state.sensitivityZ);
        }
        break;
    }
    
    // Apply axis locks
    if (state.lockX) dx = 0;
    if (state.lockY) dy = 0;
    if (state.lockZ) dz = 0;
    
    // Apply XY coupling
    if (state.lockXY && (dx !== 0 || dy !== 0)) {
      const magnitude = Math.sqrt(dx * dx + dy * dy);
      if (magnitude > 0) {
        const sensitivity = Math.max(state.sensitivityX, state.sensitivityY);
        dx = (dx / magnitude) * sensitivity;
        dy = (dy / magnitude) * sensitivity;
      }
    }
    
    if (dx === 0 && dy === 0 && dz === 0) {
      console.warn('Movement blocked by axis locks');
      return false;
    }
    
    return await this.moveRelative(dx, dy, dz);
  }

  // Calculate movement parameters with realistic 3D printer speeds
  calculateMovement(start, target, speed) {
    const distance = EnderTrack.Math.distance3D(
      start.x, start.y, start.z,
      target.x, target.y, target.z
    );
    
    // Realistic Ender 3 speeds (mm/s)
    const printerSpeeds = {
      travel: 80,     // Fast travel moves (Ender 3 max ~120mm/s)
      print: 25,      // Normal printing speed
      precision: 10,  // High precision moves
      z: 5           // Z-axis moves (very slow due to lead screw)
    };
    
    // Calculate XY and Z distances separately
    const xyDistance = Math.sqrt(
      Math.pow(target.x - start.x, 2) + 
      Math.pow(target.y - start.y, 2)
    );
    const zDistance = Math.abs(target.z - start.z);
    
    // Determine movement type and speed
    let effectiveSpeed;
    if (zDistance > 0.1 && xyDistance < 0.1) {
      // Pure Z movement - use Z speed
      effectiveSpeed = printerSpeeds.z;
    } else if (distance < 1) {
      // Small precision moves
      effectiveSpeed = printerSpeeds.precision;
    } else if (distance > 10) {
      // Large travel moves
      effectiveSpeed = printerSpeeds.travel;
    } else {
      // Normal moves
      effectiveSpeed = printerSpeeds.print;
    }
    
    // Calculate duration based on realistic speed
    const duration = Math.max((distance / effectiveSpeed) * 1000, 200); // Minimum 200ms
    
    return {
      start: { ...start },
      target: { ...target },
      distance,
      duration,
      effectiveSpeed,
      movementType: this.getMovementType(xyDistance, zDistance, distance),
      startTime: null // Will be set when animation starts
    };
  }
  
  // Determine movement type for logging/debugging
  getMovementType(xyDistance, zDistance, totalDistance) {
    if (zDistance > 0.1 && xyDistance < 0.1) return 'z-only';
    if (totalDistance < 1) return 'precision';
    if (totalDistance > 10) return 'travel';
    return 'normal';
  }

  // Execute movement with smooth animation
  async executeMovement(movement) {
    return new Promise(async (resolve, reject) => {
      // Stop any current movement
      this.stopMovement();
      
      // Update state
      EnderTrack.State.update({ isMoving: true });
      this.isMoving = true;
      this.emergencyStop = false;
      
      // Check if Enderscope is connected
      const enderscope = window.EnderTrack?.Enderscope;
      if (enderscope?.isConnected) {
        try {
          // Send command to real hardware using dedicated movement handler
          const success = await window.EnderTrack.EnderscopeMovement.moveAbsolute(
            movement.target.x, 
            movement.target.y, 
            movement.target.z
          );
          
          if (success) {
            this.completeMovement(movement.target, true);
            resolve(true);
          } else {
            this.completeMovement(EnderTrack.State.get().pos, false);
            reject(new Error('Hardware movement failed'));
          }
          return;
        } catch (error) {
          console.error('Hardware movement error:', error);
          this.completeMovement(EnderTrack.State.get().pos, false);
          reject(error);
          return;
        }
      }
      
      // Fallback to simulation animation
      movement.startTime = Date.now();
      
      const animate = () => {
        if (this.emergencyStop) {
          this.completeMovement(EnderTrack.State.get().pos, false);
          reject(new Error('Movement stopped by emergency stop'));
          return;
        }
        
        const elapsed = Date.now() - movement.startTime;
        const progress = Math.min(elapsed / movement.duration, 1);
        
        // Apply easing
        const eased = EnderTrack.Math.easeInOutCubic(progress);
        
        // Calculate current position
        const currentPos = EnderTrack.Math.lerpPoint(movement.start, movement.target, eased);
        
        // Update state
        EnderTrack.State.update({ pos: currentPos });
        
        // Emit position changed event
        EnderTrack.Events.notifyListeners('position:changed', currentPos);
        
        // Continue animation or complete
        if (progress < 1) {
          this.currentAnimation = requestAnimationFrame(animate);
        } else {
          this.completeMovement(movement.target, true);
          resolve(true);
        }
      };
      
      // Start animation
      this.currentAnimation = requestAnimationFrame(animate);
      
      // Notify movement started
      EnderTrack.Events.notifyListeners('movement:started', movement);
    });
  }

  // Complete movement
  completeMovement(finalPos, success = true) {
    // Cancel animation
    if (this.currentAnimation) {
      cancelAnimationFrame(this.currentAnimation);
      this.currentAnimation = null;
    }
    
    const roundedPos = EnderTrack.Math.roundPoint(finalPos);
    
    // Update final state
    EnderTrack.State.update({
      pos: roundedPos,
      isMoving: false
    });
    
    // Emit position changed event
    EnderTrack.Events.notifyListeners('position:changed', roundedPos);
    
    // Record as final position if movement was successful
    if (success && EnderTrack.State.recordFinalPosition) {
      EnderTrack.State.recordFinalPosition(roundedPos);
    }
    
    this.isMoving = false;
    
    // Notify completion
    EnderTrack.Events.notifyListeners('movement:completed', {
      position: finalPos,
      success
    });
    
    // Process next movement in queue
    this.processQueue();
  }

  // Stop current movement
  stopMovement() {
    if (this.currentAnimation) {
      cancelAnimationFrame(this.currentAnimation);
      this.currentAnimation = null;
    }
    
    if (this.isMoving) {
      this.completeMovement(EnderTrack.State.get().pos, false);
    }
  }

  // Emergency stop - immediate halt
  emergencyStopMovement() {
    console.warn('🛑 Emergency stop activated');
    this.emergencyStop = true;
    this.stopMovement();
    this.clearQueue();
    
    // Send emergency stop G-code to hardware if connected
    if (window.EnderTrack?.Enderscope?.isConnected) {
      this.sendEmergencyStopGcode();
    }
    
    EnderTrack.Events.notifyListeners('movement:emergency_stop');
  }
  
  // Send emergency stop G-code
  async sendEmergencyStopGcode() {
    try {
      const response = await fetch('http://localhost:5000/api/emergency_stop', {
        method: 'POST'
      });
      
      if (response.ok) {
        console.log('✅ Emergency stop G-code sent to hardware');
      }
    } catch (error) {
      console.error('💥 Failed to send emergency stop G-code:', error);
    }
  }

  // Queue management for sequential movements
  queueMovement(type, ...args) {
    this.moveQueue.push({ type, args });
    
    if (!this.isMoving) {
      this.processQueue();
    }
  }

  processQueue() {
    if (this.moveQueue.length === 0 || this.isMoving) return;
    
    const nextMove = this.moveQueue.shift();
    
    switch (nextMove.type) {
      case 'absolute':
        this.moveAbsolute(...nextMove.args);
        break;
      case 'relative':
        this.moveRelative(...nextMove.args);
        break;
      case 'direction':
        this.moveDirection(...nextMove.args);
        break;
    }
  }

  clearQueue() {
    this.moveQueue = [];
  }

  // Coordinate validation and bounds checking
  validateCoordinates(x, y, z) {
    const state = EnderTrack.State.get();
    
    // Sanitize inputs
    const target = {
      x: EnderTrack.Math.sanitizeNumber(x, 0),
      y: EnderTrack.Math.sanitizeNumber(y, 0),
      z: EnderTrack.Math.sanitizeNumber(z, 0)
    };
    
    // Check bounds (based on map size) - cube logic: Z range matches XY plateau
    const halfSize = state.mapSizeMm / 2;
    const bounds = {
      minX: -halfSize,
      maxX: halfSize,
      minY: -halfSize,
      maxY: halfSize,
      minZ: -halfSize, // Z range matches plateau size for cube workspace
      maxZ: halfSize
    };
    
    // Clamp to bounds
    target.x = EnderTrack.Math.clamp(target.x, bounds.minX, bounds.maxX);
    target.y = EnderTrack.Math.clamp(target.y, bounds.minY, bounds.maxY);
    target.z = EnderTrack.Math.clamp(target.z, bounds.minZ, bounds.maxZ);
    
    // Check if coordinates are valid
    if (!EnderTrack.Math.isValidPoint(target)) {
      console.error('Invalid coordinates:', target);
      return null;
    }
    
    return target;
  }

  // Home movements
  async goHome(mode = 'xy') {
    const state = EnderTrack.State.get();
    
    // Check if specific home function is locked
    if (mode === 'xy' && state.lockHomeXY) {
      console.warn('Home XY is locked');
      return false;
    }
    if (mode === 'xyz' && state.lockHomeXYZ) {
      console.warn('Home XYZ is locked');
      return false;
    }
    
    // Check if Enderscope is connected for hardware homing
    const enderscope = window.EnderTrack?.Enderscope;
    if (enderscope?.isConnected && mode === 'xyz') {
      try {
        await enderscope.home();
        return true;
      } catch (error) {
        console.error('Hardware homing failed:', error);
        return false;
      }
    }
    
    // Software homing to predefined positions
    const homePos = state.homePositions[mode] || { x: 0, y: 0, z: 0 };
    
    switch (mode) {
      case 'xy':
        return await this.moveAbsolute(homePos.x, homePos.y, state.pos.z);
      case 'xyz':
        return await this.moveAbsolute(homePos.x, homePos.y, homePos.z);
      case 'z':
        return await this.moveAbsolute(state.pos.x, state.pos.y, homePos.z);
      default:
        console.warn('Unknown home mode:', mode);
        return false;
    }
  }

  // Set home position
  setHome(mode = 'xy') {
    const state = EnderTrack.State.get();
    const currentPos = state.pos;
    
    const homePositions = { ...state.homePositions };
    
    switch (mode) {
      case 'xy':
        homePositions.xy = { x: currentPos.x, y: currentPos.y };
        break;
      case 'xyz':
        homePositions.xyz = { ...currentPos };
        break;
      case 'z':
        homePositions.z = { z: currentPos.z };
        break;
    }
    
    EnderTrack.State.update({ homePositions });
    
    EnderTrack.Events.notifyListeners('home:set', { mode, position: currentPos });
  }

  // Speed control
  setSpeed(speed) {
    const clampedSpeed = EnderTrack.Math.clamp(speed, 1, 1000);
    EnderTrack.State.update({ moveSpeed: clampedSpeed });
    
    EnderTrack.Events.notifyListeners('speed:changed', clampedSpeed);
  }

  getSpeed() {
    return EnderTrack.State.get().moveSpeed;
  }

  // Movement patterns
  async executePattern(points, options = {}) {
    const {
      pauseBetween = 1000,
      returnToStart = false,
      onPointReached = null
    } = options;
    
    if (!Array.isArray(points) || points.length === 0) {
      console.warn('Invalid points array for pattern execution');
      return false;
    }
    
    const startPos = EnderTrack.State.get().pos;
    
    try {
      for (let i = 0; i < points.length; i++) {
        const point = points[i];
        
        // Move to point
        await this.moveAbsolute(point.x, point.y, point.z || startPos.z);
        
        // Callback when point is reached
        if (onPointReached) {
          await onPointReached(point, i);
        }
        
        // Pause between points
        if (pauseBetween > 0 && i < points.length - 1) {
          await this.wait(pauseBetween);
        }
      }
      
      // Return to start if requested
      if (returnToStart) {
        await this.moveAbsolute(startPos.x, startPos.y, startPos.z);
      }
      
      return true;
      
    } catch (error) {
      console.error('Pattern execution failed:', error);
      return false;
    }
  }

  // Utility methods
  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getCurrentPosition() {
    return { ...EnderTrack.State.get().pos };
  }

  getMovementStatus() {
    return {
      isMoving: this.isMoving,
      queueLength: this.moveQueue.length,
      emergencyStop: this.emergencyStop,
      currentAnimation: this.currentAnimation !== null
    };
  }

  // Calculate estimated time for movement
  estimateMovementTime(targetX, targetY, targetZ) {
    const state = EnderTrack.State.get();
    const distance = EnderTrack.Math.distance3D(
      state.pos.x, state.pos.y, state.pos.z,
      targetX, targetY, targetZ
    );
    
    return (distance / state.moveSpeed) * 1000; // milliseconds
  }

  // Get movement statistics
  getStatistics() {
    const state = EnderTrack.State.get();
    const history = state.positionHistory;
    
    if (history.length < 2) {
      return {
        totalDistance: 0,
        totalTime: 0,
        averageSpeed: 0,
        pointCount: history.length
      };
    }
    
    let totalDistance = 0;
    for (let i = 1; i < history.length; i++) {
      const prev = history[i - 1];
      const curr = history[i];
      totalDistance += EnderTrack.Math.distance3D(
        prev.x, prev.y, prev.z,
        curr.x, curr.y, curr.z
      );
    }
    
    const totalTime = history[history.length - 1].timestamp - history[0].timestamp;
    const averageSpeed = totalTime > 0 ? (totalDistance / totalTime) * 1000 : 0; // mm/s
    
    return {
      totalDistance: EnderTrack.Math.round(totalDistance, 2),
      totalTime,
      averageSpeed: EnderTrack.Math.round(averageSpeed, 2),
      pointCount: history.length
    };
  }
}

// Global instance
window.EnderTrack = window.EnderTrack || {};
window.EnderTrack.Movement = new MovementEngine();