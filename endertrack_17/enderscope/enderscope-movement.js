// enderscope/enderscope-movement.js - Dedicated Enderscope hardware movement system

class EnderscopeMovement {
  constructor() {
    this.serverUrl = 'http://localhost:5000';
  }

  // Check if Enderscope is connected
  isConnected() {
    return window.EnderTrack?.Enderscope?.isConnected || false;
  }

  // Move to absolute position
  async moveAbsolute(x, y, z) {
    if (!this.isConnected()) {
      return false;
    }

    console.log(`🔧 Enderscope Command: moveAbsolute(${x}, ${y}, ${z})`);
    
    try {
      const response = await fetch(`${this.serverUrl}/api/move/absolute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ x, y, z })
      });

      const result = await response.json();
      console.log(`✅ Enderscope Response: moveAbsolute success=${result.success}`);
      
      if (result.success) {
        // Update position in EnderTrack state
        if (window.EnderTrack?.State) {
          window.EnderTrack.State.update({ pos: { x, y, z } });
          window.EnderTrack.State.recordFinalPosition({ x, y, z });
        }
        
        // Update Enderscope position
        if (window.EnderTrack?.Enderscope) {
          await window.EnderTrack.Enderscope.getPosition();
        }
        
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  // Move relative to current position
  async moveRelative(dx, dy, dz) {
    if (!this.isConnected()) {
      return false;
    }

    console.log(`🔧 Enderscope Command: moveRelative(${dx}, ${dy}, ${dz})`);
    
    try {
      const response = await fetch(`${this.serverUrl}/api/move/relative`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dx, dy, dz })
      });

      const result = await response.json();
      console.log(`✅ Enderscope Response: moveRelative success=${result.success}`);
      
      if (result.success) {
        // Calculate new position
        const currentState = window.EnderTrack?.State?.get();
        if (currentState) {
          const newPos = {
            x: currentState.pos.x + dx,
            y: currentState.pos.y + dy,
            z: currentState.pos.z + dz
          };
          
          // Update position in EnderTrack state
          window.EnderTrack.State.update({ pos: newPos });
          window.EnderTrack.State.recordFinalPosition(newPos);
        }
        
        // Update Enderscope position
        if (window.EnderTrack?.Enderscope) {
          await window.EnderTrack.Enderscope.getPosition();
        }
        
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  // Home all axes
  async home() {
    if (!this.isConnected()) {
      return false;
    }

    console.log('🔧 Enderscope Command: home()');
    
    try {
      const response = await fetch(`${this.serverUrl}/api/home`, {
        method: 'POST'
      });

      const result = await response.json();
      console.log(`✅ Enderscope Response: home success=${result.success}`);
      
      if (result.success) {
        // Update position to home (0,0,0)
        const homePos = { x: 0, y: 0, z: 0 };
        
        if (window.EnderTrack?.State) {
          window.EnderTrack.State.update({ pos: homePos });
          window.EnderTrack.State.recordFinalPosition(homePos);
        }
        
        // Update Enderscope position
        if (window.EnderTrack?.Enderscope) {
          await window.EnderTrack.Enderscope.getPosition();
        }
        
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  // Get current position from hardware
  async getPosition() {
    if (!this.isConnected()) {
      return null;
    }

    console.log('🔧 Enderscope Command: getPosition()');
    
    try {
      const response = await fetch(`${this.serverUrl}/api/position`);
      const result = await response.json();
      console.log(`✅ Enderscope Response: getPosition success=${result.success}, pos=${JSON.stringify(result.position)}`);
      
      if (result.success) {
        const pos = result.position;
        
        // Update EnderTrack state with hardware position
        if (window.EnderTrack?.State) {
          window.EnderTrack.State.update({ pos });
        }
        
        return pos;
      }
      return null;
    } catch (error) {
      return null;
    }
  }
}

// Global instance
window.EnderTrack = window.EnderTrack || {};
window.EnderTrack.EnderscopeMovement = new EnderscopeMovement();