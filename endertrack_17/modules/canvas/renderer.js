// modules/canvas/renderer.js - Canvas rendering functions
// Pure rendering functions with no state dependencies

class CanvasRenderer {
  static render(ctx, state) {
    // Clear canvas
    this.clear(ctx);
    
    // Render in layers (order matters)
    this.renderBackground(ctx, state);
    this.renderGrid(ctx, state);
    this.renderTemplates(ctx, state);
    this.renderTrack(ctx, state);
    this.renderVisitedPositions(ctx, state);
    this.renderFuturePosition(ctx, state);
    this.renderPositions(ctx, state);
    this.renderCurrentPosition(ctx, state);
    this.renderUI(ctx, state);
  }

  static clear(ctx) {
    EnderTrack.Graphics.clearCanvas(ctx);
  }

  static renderBackground(ctx, state) {
    // Fill background with solid color
    EnderTrack.Graphics.drawRectangle(ctx, 0, 0, ctx.canvas.width, ctx.canvas.height, {
      fillColor: state.colors.mapBackground
    });
    
    // Add subtle radial gradient for depth
    const centerX = ctx.canvas.width / 2;
    const centerY = ctx.canvas.height / 2;
    const radius = Math.max(ctx.canvas.width, ctx.canvas.height) / 2;
    
    const gradient = EnderTrack.Graphics.createRadialGradient(
      ctx, centerX, centerY, 0, centerX, centerY, radius,
      [
        { position: 0, color: 'rgba(255,255,255,0.02)' },
        { position: 1, color: 'rgba(0,0,0,0.05)' }
      ]
    );
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  }

  static renderGrid(ctx, state) {
    if (!state.showGrid) return;
    
    const grid = EnderTrack.Coordinates.getGridParameters();
    const bounds = EnderTrack.Coordinates.getVisibleBounds();
    
    // Convert grid bounds to canvas coordinates
    const canvasBounds = {
      minX: 0,
      maxX: ctx.canvas.width,
      minY: 0,
      maxY: ctx.canvas.height
    };
    
    // Draw minor grid
    ctx.save();
    ctx.strokeStyle = state.colors.gridColor;
    ctx.lineWidth = 0.5;
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    
    // Vertical lines
    for (let x = grid.startX; x <= grid.endX; x += grid.spacing) {
      const canvasPos = EnderTrack.Coordinates.mapToCanvas(x, 0);
      if (canvasPos.cx >= 0 && canvasPos.cx <= ctx.canvas.width) {
        ctx.moveTo(canvasPos.cx, 0);
        ctx.lineTo(canvasPos.cx, ctx.canvas.height);
      }
    }
    
    // Horizontal lines
    for (let y = grid.startY; y <= grid.endY; y += grid.spacing) {
      const canvasPos = EnderTrack.Coordinates.mapToCanvas(0, y);
      if (canvasPos.cy >= 0 && canvasPos.cy <= ctx.canvas.height) {
        ctx.moveTo(0, canvasPos.cy);
        ctx.lineTo(ctx.canvas.width, canvasPos.cy);
      }
    }
    
    ctx.stroke();
    ctx.restore();
    
    // Draw major grid (every 5th line)
    if (grid.spacing <= 5) {
      const majorSpacing = grid.spacing * 5;
      
      ctx.save();
      ctx.strokeStyle = state.colors.gridColor;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      
      // Major vertical lines
      for (let x = Math.floor(grid.startX / majorSpacing) * majorSpacing; x <= grid.endX; x += majorSpacing) {
        const canvasPos = EnderTrack.Coordinates.mapToCanvas(x, 0);
        if (canvasPos.cx >= 0 && canvasPos.cx <= ctx.canvas.width) {
          ctx.moveTo(canvasPos.cx, 0);
          ctx.lineTo(canvasPos.cx, ctx.canvas.height);
        }
      }
      
      // Major horizontal lines
      for (let y = Math.floor(grid.startY / majorSpacing) * majorSpacing; y <= grid.endY; y += majorSpacing) {
        const canvasPos = EnderTrack.Coordinates.mapToCanvas(0, y);
        if (canvasPos.cy >= 0 && canvasPos.cy <= ctx.canvas.height) {
          ctx.moveTo(0, canvasPos.cy);
          ctx.lineTo(ctx.canvas.width, canvasPos.cy);
        }
      }
      
      ctx.stroke();
      ctx.restore();
    }
    
    // Draw origin axes
    this.renderOriginAxes(ctx, state);
    
    // Draw grid labels
    this.renderGridLabels(ctx, grid, state);
  }

  static renderOriginAxes(ctx, state) {
    const origin = EnderTrack.Coordinates.mapToCanvas(0, 0);
    
    // Only draw if origin is visible
    if (origin.cx < 0 || origin.cx > ctx.canvas.width || 
        origin.cy < 0 || origin.cy > ctx.canvas.height) {
      return;
    }
    
    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.8;
    
    ctx.beginPath();
    
    // X axis (horizontal)
    ctx.moveTo(0, origin.cy);
    ctx.lineTo(ctx.canvas.width, origin.cy);
    
    // Y axis (vertical)
    ctx.moveTo(origin.cx, 0);
    ctx.lineTo(origin.cx, ctx.canvas.height);
    
    ctx.stroke();
    ctx.restore();
    
    // Origin marker
    EnderTrack.Graphics.drawCircle(ctx, origin.cx, origin.cy, 4, {
      fillColor: '#ffffff',
      strokeColor: '#000000',
      lineWidth: 1,
      alpha: 0.9
    });
    
    // Axis labels
    EnderTrack.Graphics.drawText(ctx, 'X', origin.cx + 10, origin.cy - 10, {
      font: '12px Arial',
      color: '#ffffff',
      background: 'rgba(0,0,0,0.5)',
      padding: 2
    });
    
    EnderTrack.Graphics.drawText(ctx, 'Y', origin.cx - 20, origin.cy - 20, {
      font: '12px Arial',
      color: '#ffffff',
      background: 'rgba(0,0,0,0.5)',
      padding: 2
    });
  }

  static renderGridLabels(ctx, grid, state) {
    // Only show labels if grid spacing is large enough
    const pixelSpacing = EnderTrack.Coordinates.mmToPixels(grid.spacing);
    if (pixelSpacing < 30) return;
    
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = '10px monospace';
    ctx.globalAlpha = 0.7;
    
    // X axis labels
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    
    for (let x = grid.startX; x <= grid.endX; x += grid.spacing) {
      if (x === 0) continue; // Skip origin
      
      const canvasPos = EnderTrack.Coordinates.mapToCanvas(x, 0);
      if (canvasPos.cx > 20 && canvasPos.cx < ctx.canvas.width - 20) {
        // Background for better readability
        const text = x.toString();
        const metrics = ctx.measureText(text);
        
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(canvasPos.cx - metrics.width/2 - 2, 5, metrics.width + 4, 12);
        
        ctx.fillStyle = '#ffffff';
        ctx.fillText(text, canvasPos.cx, 7);
      }
    }
    
    // Y axis labels
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    
    for (let y = grid.startY; y <= grid.endY; y += grid.spacing) {
      if (y === 0) continue; // Skip origin
      
      const canvasPos = EnderTrack.Coordinates.mapToCanvas(0, y);
      if (canvasPos.cy > 15 && canvasPos.cy < ctx.canvas.height - 15) {
        // Background for better readability
        const text = y.toString();
        const metrics = ctx.measureText(text);
        
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(5, canvasPos.cy - 6, metrics.width + 4, 12);
        
        ctx.fillStyle = '#ffffff';
        ctx.fillText(text, 7, canvasPos.cy);
      }
    }
    
    ctx.restore();
  }

  static renderTemplates(ctx, state) {
    // This will be implemented when template system is ready
    // Templates would be rendered here as SVG overlays or shapes
  }

  static renderTrack(ctx, state) {
    if (!state.showNavigationTrack || !state.track || state.track.length < 2) return;
    
    // Convert track points to canvas coordinates
    const canvasPoints = state.track.map(point => 
      EnderTrack.Coordinates.mapToCanvas(point.x, point.y)
    ).filter(point => 
      point.cx >= -50 && point.cx <= ctx.canvas.width + 50 &&
      point.cy >= -50 && point.cy <= ctx.canvas.height + 50
    );
    
    if (canvasPoints.length < 2) return;
    
    // Draw track path
    EnderTrack.Graphics.drawPath(ctx, canvasPoints, {
      color: state.colors.trackColor,
      width: 2,
      alpha: 0.7,
      smooth: true
    });
    
    // Draw track points
    canvasPoints.forEach((point, index) => {
      const alpha = 0.3 + (index / canvasPoints.length) * 0.4; // Fade older points
      
      EnderTrack.Graphics.drawCircle(ctx, point.cx, point.cy, 2, {
        fillColor: state.colors.trackColor,
        alpha: alpha
      });
    });
  }

  static renderVisitedPositions(ctx, state) {
    if (!state.positionHistory || state.positionHistory.length === 0) return;
    if (state.showHistoryXY === false) return;
    
    // Render only final positions (not intermediate movement points)
    const visitedPositions = state.positionHistory.filter(pos => pos.isFinalPosition);
    
    visitedPositions.forEach((pos, index) => {
      const canvasPos = EnderTrack.Coordinates.mapToCanvas(pos.x, pos.y);
      
      // Check if position is visible
      if (canvasPos.cx < -20 || canvasPos.cx > ctx.canvas.width + 20 || 
          canvasPos.cy < -20 || canvasPos.cy > ctx.canvas.height + 20) {
        return;
      }
      
      // Fade older positions
      const alpha = 0.3 + (index / visitedPositions.length) * 0.4;
      
      // Visited position marker (square)
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#10b981';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.fillRect(canvasPos.cx - 4, canvasPos.cy - 4, 8, 8);
      ctx.strokeRect(canvasPos.cx - 4, canvasPos.cy - 4, 8, 8);
      
      // Position number
      ctx.fillStyle = '#ffffff';
      ctx.font = '8px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText((index + 1).toString(), canvasPos.cx, canvasPos.cy);
      ctx.restore();
    });
  }

  static renderFuturePosition(ctx, state) {
    let futurePos = null;
    
    if (state.inputMode === 'absolute') {
      // Show future position from absolute inputs
      const inputX = document.getElementById('inputX');
      const inputY = document.getElementById('inputY');
      const inputZ = document.getElementById('inputZ');
      
      if (inputX && inputY && inputZ) {
        const x = parseFloat(inputX.value) || 0;
        const y = parseFloat(inputY.value) || 0;
        const z = parseFloat(inputZ.value) || 0;
        
        // Only show if different from current position
        if (Math.abs(x - state.pos.x) > 0.1 || Math.abs(y - state.pos.y) > 0.1 || Math.abs(z - state.pos.z) > 0.1) {
          futurePos = { x, y, z };
        }
      }
    } else if (state.inputMode === 'relative') {
      // Ne pas afficher les overlays en mode contrôleur continu
      console.log('[DEBUG] renderFuturePosition - controllerMode:', window.controllerMode, 'KeyboardMode.isActive:', window.EnderTrack?.KeyboardMode?.isActive);
      if (window.EnderTrack?.KeyboardMode?.isActive && (window.controllerMode || 'step') === 'continuous') {
        console.log('[DEBUG] Overlays de sensibilité masqués');
        return;
      }
      console.log('[DEBUG] Affichage des overlays de sensibilité');
      
      // Show 4 possible relative positions
      const sensitivity = {
        x: state.sensitivityX || 1,
        y: state.sensitivityY || 1,
        z: state.sensitivityZ || 0.5
      };
      
      const directions = [
        { x: state.pos.x, y: state.pos.y + sensitivity.y, label: '▲' }, // up
        { x: state.pos.x, y: state.pos.y - sensitivity.y, label: '▼' }, // down
        { x: state.pos.x - sensitivity.x, y: state.pos.y, label: '◄' }, // left
        { x: state.pos.x + sensitivity.x, y: state.pos.y, label: '►' }  // right
      ];
      
      directions.forEach(dir => {
        const canvasPos = EnderTrack.Coordinates.mapToCanvas(dir.x, dir.y);
        
        // Check if position is visible
        if (canvasPos.cx < -20 || canvasPos.cx > ctx.canvas.width + 20 || 
            canvasPos.cy < -20 || canvasPos.cy > ctx.canvas.height + 20) {
          return;
        }
        
        // Check axis locks
        const isLocked = (dir.label === '▲' || dir.label === '▼') ? state.lockY : state.lockX;
        
        if (!isLocked) {
          // Future position marker (diamond)
          ctx.save();
          ctx.translate(canvasPos.cx, canvasPos.cy);
          ctx.rotate(Math.PI / 4);
          ctx.fillStyle = 'rgba(255, 193, 7, 0.6)';
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.fillRect(-4, -4, 8, 8);
          ctx.strokeRect(-4, -4, 8, 8);
          ctx.restore();
          
          // Direction arrow
          ctx.save();
          ctx.fillStyle = 'rgba(0,0,0,0.7)';
          ctx.fillRect(canvasPos.cx - 8, canvasPos.cy - 25, 16, 12);
          ctx.fillStyle = '#ffc107';
          ctx.font = '12px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(dir.label, canvasPos.cx, canvasPos.cy - 19);
          ctx.restore();
        }
      });
      
      return; // Don't render single future position for relative mode
    }
    
    // Render single future position for absolute mode
    if (futurePos) {
      const canvasPos = EnderTrack.Coordinates.mapToCanvas(futurePos.x, futurePos.y);
      
      // Check if position is visible
      if (canvasPos.cx >= -20 && canvasPos.cx <= ctx.canvas.width + 20 && 
          canvasPos.cy >= -20 && canvasPos.cy <= ctx.canvas.height + 20) {
        
        // Future position marker (diamond)
        ctx.save();
        ctx.translate(canvasPos.cx, canvasPos.cy);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = 'rgba(255, 193, 7, 0.8)';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.fillRect(-6, -6, 12, 12);
        ctx.strokeRect(-6, -6, 12, 12);
        ctx.restore();
        
        // Connection line to current position
        const currentPos = EnderTrack.Coordinates.mapToCanvas(state.pos.x, state.pos.y);
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 193, 7, 0.5)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(currentPos.cx, currentPos.cy);
        ctx.lineTo(canvasPos.cx, canvasPos.cy);
        ctx.stroke();
        ctx.restore();
        
        // Future position label
        const text = `(${futurePos.x.toFixed(1)}, ${futurePos.y.toFixed(1)})`;
        ctx.save();
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        const metrics = ctx.measureText(text);
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.fillRect(canvasPos.cx - metrics.width/2 - 3, canvasPos.cy - 32, metrics.width + 6, 12);
        ctx.fillStyle = '#ffc107';
        ctx.fillText(text, canvasPos.cx, canvasPos.cy - 20);
        ctx.restore();
      }
    }
  }

  static renderPositions(ctx, state) {
    // This will render saved positions from lists/planning system
    // For now, just a placeholder
  }

  static renderCurrentPosition(ctx, state) {
    const pos = EnderTrack.Coordinates.mapToCanvas(state.pos.x, state.pos.y);
    
    // TEST: Simple overlay - masquer en mode contrôleur continu
    const shouldShow = state.inputMode === 'relative' && !(window.EnderTrack?.KeyboardMode?.isActive && (window.controllerMode || 'step') === 'continuous');
    console.log('[DEBUG] renderCurrentPosition - inputMode:', state.inputMode, 'controllerMode:', window.controllerMode, 'KeyboardMode.isActive:', window.EnderTrack?.KeyboardMode?.isActive, 'shouldShow:', shouldShow);
    
    if (shouldShow) {
      console.log('[DEBUG] Affichage des carrés jaunes');
      ctx.fillStyle = 'yellow';
      ctx.fillRect(pos.cx + 20, pos.cy - 20, 10, 10);
      ctx.fillRect(pos.cx - 30, pos.cy - 20, 10, 10);
      ctx.fillRect(pos.cx - 5, pos.cy - 40, 10, 10);
      ctx.fillRect(pos.cx - 5, pos.cy + 10, 10, 10);
    } else {
      console.log('[DEBUG] Carrés jaunes masqués');
    }
    
    // Check if position is visible
    if (pos.cx < -20 || pos.cx > ctx.canvas.width + 20 || 
        pos.cy < -20 || pos.cy > ctx.canvas.height + 20) {
      return;
    }
    
    // Outer glow effect
    const glowRadius = state.isMoving ? 20 : 15;
    const glowAlpha = state.isMoving ? 0.3 : 0.15;
    
    EnderTrack.Graphics.drawCircle(ctx, pos.cx, pos.cy, glowRadius, {
      fillColor: state.colors.positionColor,
      alpha: glowAlpha
    });
    
    // Main position circle
    const mainRadius = state.isMoving ? 10 : 8;
    
    EnderTrack.Graphics.drawCircle(ctx, pos.cx, pos.cy, mainRadius, {
      fillColor: state.colors.positionColor,
      strokeColor: '#ffffff',
      lineWidth: 2,
      alpha: 0.9
    });
    
    // Center dot
    EnderTrack.Graphics.drawCircle(ctx, pos.cx, pos.cy, 3, {
      fillColor: '#ffffff',
      alpha: 1
    });
    
    // Movement indicator
    if (state.isMoving) {
      // Animated ring
      const time = Date.now() / 1000;
      const animatedRadius = 12 + Math.sin(time * 4) * 3;
      
      EnderTrack.Graphics.drawCircle(ctx, pos.cx, pos.cy, animatedRadius, {
        strokeColor: state.colors.positionColor,
        lineWidth: 1,
        alpha: 0.6
      });
    }
    
    // Position label
    this.renderPositionLabel(ctx, pos, state);
  }

  static renderPositionLabel(ctx, canvasPos, state) {
    const text = `(${state.pos.x.toFixed(1)}, ${state.pos.y.toFixed(1)}, ${state.pos.z.toFixed(1)})`;
    
    // Position label above the position marker
    const labelY = canvasPos.cy - 30;
    
    // Only show if there's space
    if (labelY < 20) return;
    
    EnderTrack.Graphics.drawText(ctx, text, canvasPos.cx, labelY, {
      font: '11px monospace',
      color: '#ffffff',
      align: 'center',
      baseline: 'bottom',
      background: 'rgba(0,0,0,0.8)',
      padding: 4
    });
  }

  static renderUI(ctx, state) {
    // Render UI elements that are drawn on canvas
    this.renderScaleIndicator(ctx, state);
    this.renderCompass(ctx, state);
    this.renderZoomIndicator(ctx, state);
  }

  static renderScaleIndicator(ctx, state) {
    // Scale bar in bottom right
    const barLength = 50; // pixels
    const barLengthMm = EnderTrack.Coordinates.pixelsToMm(barLength);
    
    const x = ctx.canvas.width - 80;
    const y = ctx.canvas.height - 30;
    
    // Background
    EnderTrack.Graphics.drawRectangle(ctx, x - 10, y - 15, 70, 25, {
      fillColor: 'rgba(0,0,0,0.7)',
      cornerRadius: 4
    });
    
    // Scale bar
    EnderTrack.Graphics.drawLine(ctx, x, y, x + barLength, y, {
      color: '#ffffff',
      width: 2
    });
    
    // End markers
    EnderTrack.Graphics.drawLine(ctx, x, y - 5, x, y + 5, {
      color: '#ffffff',
      width: 2
    });
    
    EnderTrack.Graphics.drawLine(ctx, x + barLength, y - 5, x + barLength, y + 5, {
      color: '#ffffff',
      width: 2
    });
    
    // Scale text
    let scaleText;
    if (barLengthMm >= 1) {
      scaleText = `${barLengthMm.toFixed(1)}mm`;
    } else {
      scaleText = `${(barLengthMm * 1000).toFixed(0)}μm`;
    }
    
    EnderTrack.Graphics.drawText(ctx, scaleText, x + barLength / 2, y - 10, {
      font: '10px monospace',
      color: '#ffffff',
      align: 'center',
      baseline: 'bottom'
    });
  }

  static renderCompass(ctx, state) {
    // Simple compass in top right
    const centerX = ctx.canvas.width - 40;
    const centerY = 40;
    const radius = 18;
    
    // Background circle
    EnderTrack.Graphics.drawCircle(ctx, centerX, centerY, radius, {
      fillColor: 'rgba(0,0,0,0.7)',
      strokeColor: '#ffffff',
      lineWidth: 1
    });
    
    // North arrow
    EnderTrack.Graphics.drawArrow(ctx, centerX, centerY, centerX, centerY - radius + 5, {
      color: '#ff4444',
      width: 2,
      headSize: 6
    });
    
    // N label
    EnderTrack.Graphics.drawText(ctx, 'N', centerX, centerY - radius - 8, {
      font: '10px Arial',
      color: '#ffffff',
      align: 'center',
      baseline: 'bottom'
    });
    
    // Cardinal directions
    EnderTrack.Graphics.drawText(ctx, 'E', centerX + radius + 5, centerY, {
      font: '8px Arial',
      color: '#cccccc',
      align: 'left',
      baseline: 'middle'
    });
    
    EnderTrack.Graphics.drawText(ctx, 'W', centerX - radius - 5, centerY, {
      font: '8px Arial',
      color: '#cccccc',
      align: 'right',
      baseline: 'middle'
    });
    
    EnderTrack.Graphics.drawText(ctx, 'S', centerX, centerY + radius + 8, {
      font: '8px Arial',
      color: '#cccccc',
      align: 'center',
      baseline: 'top'
    });
  }

  static renderZoomIndicator(ctx, state) {
    if (!state.zoom || state.zoom === 1) return;
    
    // Zoom indicator in top left
    const x = 20;
    const y = 20;
    
    // Background
    EnderTrack.Graphics.drawRectangle(ctx, x - 5, y - 5, 60, 20, {
      fillColor: 'rgba(0,0,0,0.7)',
      cornerRadius: 4
    });
    
    // Zoom text
    const zoomText = `${(state.zoom * 100).toFixed(0)}%`;
    
    EnderTrack.Graphics.drawText(ctx, zoomText, x, y, {
      font: '12px monospace',
      color: '#ffffff',
      align: 'left',
      baseline: 'top'
    });
  }

  // Utility methods for external rendering
  static drawCustomElement(ctx, element, state) {
    // This allows plugins to draw custom elements
    switch (element.type) {
      case 'circle':
        this.drawCustomCircle(ctx, element, state);
        break;
      case 'rectangle':
        this.drawCustomRectangle(ctx, element, state);
        break;
      case 'line':
        this.drawCustomLine(ctx, element, state);
        break;
      case 'text':
        this.drawCustomText(ctx, element, state);
        break;
      default:
        console.warn('Unknown custom element type:', element.type);
    }
  }

  static drawCustomCircle(ctx, element, state) {
    const pos = EnderTrack.Coordinates.mapToCanvas(element.x, element.y);
    const radius = EnderTrack.Coordinates.mmToPixels(element.radius);
    
    EnderTrack.Graphics.drawCircle(ctx, pos.cx, pos.cy, radius, {
      fillColor: element.fillColor,
      strokeColor: element.strokeColor,
      lineWidth: element.lineWidth || 1,
      alpha: element.alpha || 1
    });
  }

  static drawCustomRectangle(ctx, element, state) {
    const pos = EnderTrack.Coordinates.mapToCanvas(element.x, element.y);
    const width = EnderTrack.Coordinates.mmToPixels(element.width);
    const height = EnderTrack.Coordinates.mmToPixels(element.height);
    
    EnderTrack.Graphics.drawRectangle(ctx, pos.cx, pos.cy, width, height, {
      fillColor: element.fillColor,
      strokeColor: element.strokeColor,
      lineWidth: element.lineWidth || 1,
      alpha: element.alpha || 1
    });
  }

  static drawCustomLine(ctx, element, state) {
    const start = EnderTrack.Coordinates.mapToCanvas(element.x1, element.y1);
    const end = EnderTrack.Coordinates.mapToCanvas(element.x2, element.y2);
    
    EnderTrack.Graphics.drawLine(ctx, start.cx, start.cy, end.cx, end.cy, {
      color: element.color,
      width: element.width || 1,
      alpha: element.alpha || 1
    });
  }

  static drawCustomText(ctx, element, state) {
    const pos = EnderTrack.Coordinates.mapToCanvas(element.x, element.y);
    
    EnderTrack.Graphics.drawText(ctx, element.text, pos.cx, pos.cy, {
      font: element.font || '12px Arial',
      color: element.color || '#ffffff',
      align: element.align || 'center',
      baseline: element.baseline || 'middle',
      alpha: element.alpha || 1,
      background: element.background,
      padding: element.padding
    });
  }

  // Performance monitoring
  static renderWithProfiling(ctx, state) {
    const startTime = performance.now();
    
    this.render(ctx, state);
    
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    // Show render time in debug mode
    if (state.debug) {
      EnderTrack.Graphics.drawText(ctx, `Render: ${renderTime.toFixed(1)}ms`, 10, ctx.canvas.height - 20, {
        font: '10px monospace',
        color: '#ffff00',
        background: 'rgba(0,0,0,0.7)',
        padding: 2
      });
    }
    
    return renderTime;
  }
}

// Global registration
window.EnderTrack = window.EnderTrack || {};
window.EnderTrack.CanvasRenderer = CanvasRenderer;