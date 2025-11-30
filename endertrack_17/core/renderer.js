// core/renderer.js - Main rendering engine coordinator
// Coordinates all rendering operations across the application

class RenderEngine {
  constructor() {
    this.isInitialized = false;
    this.renderQueue = [];
    this.isRendering = false;
    this.lastRenderTime = 0;
    this.targetFPS = 60;
    this.frameInterval = 1000 / this.targetFPS;
    this.renderStats = {
      frameCount: 0,
      totalRenderTime: 0,
      averageRenderTime: 0,
      lastFrameTime: 0
    };
  }

  static init() {
    console.log('🎨 Initializing Render Engine...');
    
    // Setup render coordination
    this.setupRenderCoordination();
    
    // Setup performance monitoring
    this.setupPerformanceMonitoring();
    
    // Start render loop
    this.startRenderLoop();
    
    this.isInitialized = true;
    console.log('✅ Render Engine initialized');
    
    return true;
  }

  static setupRenderCoordination() {
    // Listen to events that require rendering
    const renderTriggerEvents = [
      'state:changed',
      'movement:started',
      'movement:completed',
      'canvas:clicked',
      'canvas:dragged',
      'position:changed'
    ];
    
    renderTriggerEvents.forEach(event => {
      EnderTrack.Events?.on?.(event, () => {
        this.requestRender('event', event);
      });
    });
    
    // Listen to window resize
    window.addEventListener('resize', () => {
      this.requestRender('resize');
    });
    
    // Listen to visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.requestRender('visibility');
      }
    });
  }

  static setupPerformanceMonitoring() {
    // Monitor render performance
    EnderTrack.Events?.on?.(event => {
      if (event === 'render:completed') {
        this.updateRenderStats();
      }
    });
  }

  static startRenderLoop() {
    const renderLoop = (timestamp) => {
      // Check if we should render based on frame rate limiting
      if (timestamp - this.lastRenderTime >= this.frameInterval) {
        this.processRenderQueue(timestamp);
        this.lastRenderTime = timestamp;
      }
      
      // Continue the loop
      requestAnimationFrame(renderLoop);
    };
    
    requestAnimationFrame(renderLoop);
  }

  static requestRender(source = 'unknown', details = null) {
    // Add render request to queue
    this.renderQueue.push({
      source,
      details,
      timestamp: performance.now(),
      id: this.generateRenderId()
    });
  }

  static processRenderQueue(timestamp) {
    if (this.renderQueue.length === 0 || this.isRendering) {
      return;
    }
    
    this.isRendering = true;
    const startTime = performance.now();
    
    try {
      // Get current state
      const state = EnderTrack.State?.get?.() || {};
      
      // Render all components
      this.renderComponents(state, timestamp);
      
      // Clear render queue
      this.renderQueue = [];
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Update stats
      this.renderStats.frameCount++;
      this.renderStats.totalRenderTime += renderTime;
      this.renderStats.averageRenderTime = this.renderStats.totalRenderTime / this.renderStats.frameCount;
      this.renderStats.lastFrameTime = renderTime;
      
      // Emit render completed event
      EnderTrack.Events?.emit?.('render:completed', {
        renderTime,
        frameCount: this.renderStats.frameCount,
        timestamp
      });
      
    } catch (error) {
      console.error('Render error:', error);
      
      // Emit render error event
      EnderTrack.Events?.emit?.('render:error', {
        error: error.message,
        timestamp
      });
      
    } finally {
      this.isRendering = false;
    }
  }

  static renderComponents(state, timestamp) {
    // Render in priority order
    this.renderCanvas(state, timestamp);
    this.renderUI(state, timestamp);
    this.renderOverlays(state, timestamp);
  }

  static renderCanvas(state, timestamp) {
    if (!EnderTrack.Canvas || !EnderTrack.CanvasRenderer) {
      return;
    }
    
    try {
      const canvas = EnderTrack.Canvas.getCanvas();
      const ctx = EnderTrack.Canvas.getContext();
      
      if (!canvas || !ctx) {
        return;
      }
      
      // Update coordinate system
      if (EnderTrack.Coordinates) {
        EnderTrack.Coordinates.updateParameters({
          canvasWidth: canvas.width,
          canvasHeight: canvas.height,
          mapSizeMm: state.mapSizeMm || 200,
          zoom: state.zoom || 1,
          panX: state.panX || 0,
          panY: state.panY || 0
        });
      }
      
      // Render canvas content
      EnderTrack.CanvasRenderer.render(ctx, state);
      
    } catch (error) {
      console.error('Canvas render error:', error);
    }
  }

  static renderUI(state, timestamp) {
    try {
      // Update position displays
      this.updatePositionDisplays(state);
      
      // Update status indicators
      this.updateStatusIndicators(state);
      

      
      // Update history
      this.updateHistory(state);
      
    } catch (error) {
      console.error('UI render error:', error);
    }
  }

  static renderOverlays(state, timestamp) {
    try {
      // Render any overlay elements
      this.renderDebugOverlay(state, timestamp);
      
    } catch (error) {
      console.error('Overlay render error:', error);
    }
  }

  static updatePositionDisplays(state) {
    // Update main position label
    const posLabel = document.getElementById('posLabel');
    if (posLabel && state.pos) {
      posLabel.textContent = `X:${state.pos.x.toFixed(1)} Y:${state.pos.y.toFixed(1)} Z:${state.pos.z.toFixed(1)}`;
    }
    
    // Update individual position displays
    const displays = [
      { id: 'posX', value: state.pos?.x },
      { id: 'posY', value: state.pos?.y },
      { id: 'posZ', value: state.pos?.z }
    ];
    
    displays.forEach(({ id, value }) => {
      const element = document.getElementById(id);
      if (element && value !== undefined) {
        element.textContent = value.toFixed(1);
      }
    });
    
    // Update absolute input fields if in absolute mode
    if (state.inputMode === 'absolute') {
      const inputs = [
        { id: 'inputX', value: state.pos?.x },
        { id: 'inputY', value: state.pos?.y },
        { id: 'inputZ', value: state.pos?.z }
      ];
      
      inputs.forEach(({ id, value }) => {
        const input = document.getElementById(id);
        if (input && value !== undefined && !input.matches(':focus')) {
          input.value = value.toFixed(1);
        }
      });
    }
  }

  static updateStatusIndicators(state) {
    // Update status light
    const statusLight = document.getElementById('statusLight');
    if (statusLight) {
      statusLight.className = 'status-light';
      
      if (state.isMoving) {
        statusLight.classList.add('moving');
      } else {
        statusLight.classList.add('ready');
      }
    }
    
    // Update scale info
    const scaleInfo = document.getElementById('scaleInfo');
    if (scaleInfo && EnderTrack.Coordinates) {
      const info = EnderTrack.Coordinates.getScaleInfo();
      scaleInfo.textContent = info.scaleText;
    }
    
    // Update point count
    const pointCount = document.getElementById('pointCount');
    if (pointCount && state.positionHistory) {
      pointCount.textContent = state.positionHistory.length.toString();
    }
  }



  static updateHistory(state) {
    if (!state.positionHistory || state.positionHistory.length === 0) {
      return;
    }
    
    // Update history table
    this.updateHistoryTable(state.positionHistory);
    
    // Update mini graphs
    this.updateMiniGraphs(state.positionHistory);
  }

  static updateHistoryTable(history) {
    const tbody = document.getElementById('historyTableBody');
    if (!tbody) return;
    
    // Only update if history changed
    const currentCount = tbody.children.length;
    const historyCount = history.length;
    
    if (currentCount === historyCount) return;
    
    // Clear and rebuild (for simplicity)
    tbody.innerHTML = '';
    
    // Show last 10 entries
    const recentHistory = history.slice(-10);
    
    recentHistory.forEach(entry => {
      const row = document.createElement('tr');
      const time = new Date(entry.timestamp).toLocaleTimeString();
      
      row.innerHTML = `
        <td>${time}</td>
        <td>${entry.x.toFixed(1)}</td>
        <td>${entry.y.toFixed(1)}</td>
        <td>${entry.z.toFixed(1)}</td>
      `;
      
      tbody.appendChild(row);
    });
  }

  static updateMiniGraphs(history) {
    const graphs = ['gX', 'gY'];
    const axes = ['x', 'y'];
    
    graphs.forEach((graphId, index) => {
      const canvas = document.getElementById(graphId);
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d');
      const axis = axes[index];
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      if (history.length < 2) return;
      
      // Get data for this axis
      const data = history.slice(-50).map(entry => entry[axis]); // Last 50 points
      
      // Calculate bounds
      const minValue = Math.min(...data);
      const maxValue = Math.max(...data);
      const range = maxValue - minValue || 1;
      
      // Draw graph
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1;
      ctx.beginPath();
      
      data.forEach((value, i) => {
        const x = (i / (data.length - 1)) * canvas.width;
        const y = canvas.height - ((value - minValue) / range) * canvas.height;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      
      ctx.stroke();
      
      // Draw current value indicator
      const currentValue = data[data.length - 1];
      const currentY = canvas.height - ((currentValue - minValue) / range) * canvas.height;
      
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(canvas.width - 2, currentY, 2, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  static renderDebugOverlay(state, timestamp) {
    if (!state.debug) return;
    
    // Create or update debug overlay
    let overlay = document.getElementById('debug-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'debug-overlay';
      overlay.style.cssText = `
        position: fixed;
        top: 10px;
        left: 10px;
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 8px;
        border-radius: 4px;
        font-family: monospace;
        font-size: 11px;
        z-index: 10000;
        pointer-events: none;
      `;
      document.body.appendChild(overlay);
    }
    
    // Update debug info
    const debugInfo = [
      `FPS: ${(1000 / this.renderStats.lastFrameTime).toFixed(1)}`,
      `Render: ${this.renderStats.lastFrameTime.toFixed(1)}ms`,
      `Frames: ${this.renderStats.frameCount}`,
      `Queue: ${this.renderQueue.length}`,
      `Pos: ${state.pos?.x.toFixed(1)}, ${state.pos?.y.toFixed(1)}, ${state.pos?.z.toFixed(1)}`,
      `Zoom: ${(state.zoom || 1).toFixed(2)}`,
      `Pan: ${(state.panX || 0).toFixed(0)}, ${(state.panY || 0).toFixed(0)}`
    ];
    
    overlay.innerHTML = debugInfo.join('<br>');
  }

  // Utility methods
  static generateRenderId() {
    return `render_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static setTargetFPS(fps) {
    this.targetFPS = Math.max(1, Math.min(120, fps));
    this.frameInterval = 1000 / this.targetFPS;
  }

  static getRenderStats() {
    return {
      ...this.renderStats,
      targetFPS: this.targetFPS,
      actualFPS: this.renderStats.lastFrameTime > 0 ? 1000 / this.renderStats.lastFrameTime : 0,
      queueLength: this.renderQueue.length,
      isRendering: this.isRendering
    };
  }

  static resetStats() {
    this.renderStats = {
      frameCount: 0,
      totalRenderTime: 0,
      averageRenderTime: 0,
      lastFrameTime: 0
    };
  }

  // Performance optimization
  static optimizeRendering(enable = true) {
    if (enable) {
      // Reduce render frequency for better performance
      this.setTargetFPS(30);
      
      // Enable render batching
      this.batchRenders = true;
      
    } else {
      // Restore normal rendering
      this.setTargetFPS(60);
      this.batchRenders = false;
    }
  }

  // Debug methods
  static getDebugInfo() {
    return {
      isInitialized: this.isInitialized,
      renderStats: this.getRenderStats(),
      queueLength: this.renderQueue.length,
      isRendering: this.isRendering,
      targetFPS: this.targetFPS
    };
  }

  static printStats() {
    const stats = this.getRenderStats();
    console.log('🎨 Render Engine Stats:');
    console.log(`  FPS: ${stats.actualFPS.toFixed(1)} (target: ${stats.targetFPS})`);
    console.log(`  Frame time: ${stats.lastFrameTime.toFixed(1)}ms (avg: ${stats.averageRenderTime.toFixed(1)}ms)`);
    console.log(`  Total frames: ${stats.frameCount}`);
    console.log(`  Queue length: ${stats.queueLength}`);
    console.log(`  Is rendering: ${stats.isRendering}`);
  }
}

// Global registration
window.EnderTrack = window.EnderTrack || {};
window.EnderTrack.Renderer = RenderEngine;