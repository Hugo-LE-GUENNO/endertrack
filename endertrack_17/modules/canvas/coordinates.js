// modules/canvas/coordinates.js - Coordinate transformation system
// Pure coordinate math with no dependencies on canvas or state

class CoordinateSystem {
  constructor() {
    this.canvasWidth = 600;
    this.canvasHeight = 600;
    this.mapSizeMm = 200; // Kept for backward compatibility
    this.plateauDimensions = { x: 200, y: 200, z: 100 };
    this.zoom = 1;
    this.panX = 0;
    this.panY = 0;
  }

  // Update coordinate system parameters
  updateParameters(params) {
    if (params.canvasWidth) this.canvasWidth = params.canvasWidth;
    if (params.canvasHeight) this.canvasHeight = params.canvasHeight;
    if (params.mapSizeMm) this.mapSizeMm = params.mapSizeMm;
    if (params.plateauDimensions) this.plateauDimensions = params.plateauDimensions;
    if (params.zoom !== undefined) this.zoom = params.zoom;
    if (params.panX !== undefined) this.panX = params.panX;
    if (params.panY !== undefined) this.panY = params.panY;
  }

  // Calculate pixels per millimeter
  pxPerMm() {
    // Use the larger of X or Y dimensions for canvas scaling
    const maxDimension = Math.max(this.plateauDimensions.x, this.plateauDimensions.y);
    return Math.min(this.canvasWidth, this.canvasHeight) / maxDimension;
  }

  // Convert map coordinates (mm) to canvas coordinates (pixels)
  mapToCanvas(mapX, mapY) {
    const centerX = this.canvasWidth / 2;
    const centerY = this.canvasHeight / 2;
    const scale = this.pxPerMm() * this.zoom;
    
    return {
      cx: centerX + (mapX * scale) + this.panX,
      cy: centerY - (mapY * scale) + this.panY  // Invert Y axis
    };
  }

  // Convert canvas coordinates (pixels) to map coordinates (mm)
  canvasToMap(canvasX, canvasY) {
    const centerX = this.canvasWidth / 2;
    const centerY = this.canvasHeight / 2;
    const scale = this.pxPerMm() * this.zoom;
    
    return {
      x: (canvasX - centerX - this.panX) / scale,
      y: -((canvasY - centerY - this.panY) / scale)  // Invert Y axis
    };
  }

  // Convert screen coordinates to canvas coordinates
  screenToCanvas(screenX, screenY, canvasElement) {
    const rect = canvasElement.getBoundingClientRect();
    const scaleX = this.canvasWidth / rect.width;
    const scaleY = this.canvasHeight / rect.height;
    
    return {
      cx: (screenX - rect.left) * scaleX,
      cy: (screenY - rect.top) * scaleY
    };
  }

  // Convert canvas coordinates to screen coordinates
  canvasToScreen(canvasX, canvasY, canvasElement) {
    const rect = canvasElement.getBoundingClientRect();
    const scaleX = rect.width / this.canvasWidth;
    const scaleY = rect.height / this.canvasHeight;
    
    return {
      sx: rect.left + (canvasX * scaleX),
      sy: rect.top + (canvasY * scaleY)
    };
  }

  // Get visible map bounds in mm
  getVisibleBounds() {
    const topLeft = this.canvasToMap(0, 0);
    const bottomRight = this.canvasToMap(this.canvasWidth, this.canvasHeight);
    
    return {
      minX: topLeft.x,
      maxX: bottomRight.x,
      minY: bottomRight.y,  // Remember Y is inverted
      maxY: topLeft.y
    };
  }

  // Check if a point is visible on canvas
  isPointVisible(mapX, mapY) {
    const bounds = this.getVisibleBounds();
    return mapX >= bounds.minX && mapX <= bounds.maxX &&
           mapY >= bounds.minY && mapY <= bounds.maxY;
  }

  // Get grid parameters for drawing
  getGridParameters() {
    const bounds = this.getVisibleBounds();
    const pxPerMm = this.pxPerMm() * this.zoom;
    
    // Determine appropriate grid spacing
    let gridSpacing = 1; // Start with 1mm
    
    if (pxPerMm < 2) {
      gridSpacing = 50; // 50mm grid when zoomed out
    } else if (pxPerMm < 5) {
      gridSpacing = 20; // 20mm grid
    } else if (pxPerMm < 10) {
      gridSpacing = 10; // 10mm grid
    } else if (pxPerMm < 20) {
      gridSpacing = 5; // 5mm grid
    } else if (pxPerMm < 50) {
      gridSpacing = 2; // 2mm grid
    } // else 1mm grid
    
    // Calculate grid lines
    const startX = Math.floor(bounds.minX / gridSpacing) * gridSpacing;
    const endX = Math.ceil(bounds.maxX / gridSpacing) * gridSpacing;
    const startY = Math.floor(bounds.minY / gridSpacing) * gridSpacing;
    const endY = Math.ceil(bounds.maxY / gridSpacing) * gridSpacing;
    
    return {
      spacing: gridSpacing,
      startX,
      endX,
      startY,
      endY,
      pixelSpacing: gridSpacing * pxPerMm
    };
  }

  // Calculate optimal zoom level to fit bounds
  calculateZoomToFit(bounds, padding = 0.1) {
    const boundsWidth = bounds.maxX - bounds.minX;
    const boundsHeight = bounds.maxY - bounds.minY;
    
    if (boundsWidth === 0 || boundsHeight === 0) return 1;
    
    const availableWidth = this.canvasWidth * (1 - padding * 2);
    const availableHeight = this.canvasHeight * (1 - padding * 2);
    
    const scaleX = availableWidth / (boundsWidth * this.pxPerMm());
    const scaleY = availableHeight / (boundsHeight * this.pxPerMm());
    
    return Math.min(scaleX, scaleY);
  }

  // Calculate pan offset to center bounds
  calculatePanToCenter(bounds) {
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;
    
    const canvasCenter = this.mapToCanvas(0, 0);
    const boundsCenter = this.mapToCanvas(centerX, centerY);
    
    return {
      panX: canvasCenter.cx - boundsCenter.cx,
      panY: canvasCenter.cy - boundsCenter.cy
    };
  }

  // Zoom and pan to fit specific bounds
  fitToBounds(bounds, padding = 0.1) {
    const zoom = this.calculateZoomToFit(bounds, padding);
    const pan = this.calculatePanToCenter(bounds);
    
    return {
      zoom: EnderTrack.Math.clamp(zoom, 0.1, 10),
      panX: pan.panX,
      panY: pan.panY
    };
  }

  // Distance calculations in different coordinate systems
  distanceInMm(mapX1, mapY1, mapX2, mapY2) {
    return EnderTrack.Math.distance2D(mapX1, mapY1, mapX2, mapY2);
  }

  distanceInPixels(canvasX1, canvasY1, canvasX2, canvasY2) {
    return EnderTrack.Math.distance2D(canvasX1, canvasY1, canvasX2, canvasY2);
  }

  // Convert distance from mm to pixels
  mmToPixels(distanceMm) {
    return distanceMm * this.pxPerMm() * this.zoom;
  }

  // Convert distance from pixels to mm
  pixelsToMm(distancePixels) {
    return distancePixels / (this.pxPerMm() * this.zoom);
  }

  // Snap coordinates to grid
  snapToGrid(mapX, mapY, gridSize = 1) {
    return {
      x: EnderTrack.Math.snapToGrid(mapX, gridSize),
      y: EnderTrack.Math.snapToGrid(mapY, gridSize)
    };
  }

  // Get scale information for display
  getScaleInfo() {
    const pxPerMm = this.pxPerMm() * this.zoom;
    
    let scaleText;
    if (pxPerMm >= 10) {
      scaleText = `${pxPerMm.toFixed(1)} px/mm`;
    } else if (pxPerMm >= 1) {
      scaleText = `${pxPerMm.toFixed(2)} px/mm`;
    } else {
      const mmPerPx = 1 / pxPerMm;
      scaleText = `${mmPerPx.toFixed(1)} mm/px`;
    }
    
    return {
      pixelsPerMm: pxPerMm,
      mmPerPixel: 1 / pxPerMm,
      zoomLevel: this.zoom,
      scaleText
    };
  }

  // Validate coordinates
  isValidMapCoordinate(x, y) {
    return EnderTrack.Math.isValidNumber(x) && EnderTrack.Math.isValidNumber(y);
  }

  isValidCanvasCoordinate(x, y) {
    return EnderTrack.Math.isValidNumber(x) && EnderTrack.Math.isValidNumber(y) &&
           x >= 0 && x <= this.canvasWidth &&
           y >= 0 && y <= this.canvasHeight;
  }

  // Clamp coordinates to valid ranges
  clampMapCoordinate(x, y, bounds) {
    if (!bounds) {
      // Default bounds based on plateau dimensions
      bounds = {
        minX: -this.plateauDimensions.x / 2,
        maxX: this.plateauDimensions.x / 2,
        minY: -this.plateauDimensions.y / 2,
        maxY: this.plateauDimensions.y / 2
      };
    }
    
    return {
      x: EnderTrack.Math.clamp(x, bounds.minX, bounds.maxX),
      y: EnderTrack.Math.clamp(y, bounds.minY, bounds.maxY)
    };
  }

  clampCanvasCoordinate(x, y) {
    return {
      x: EnderTrack.Math.clamp(x, 0, this.canvasWidth),
      y: EnderTrack.Math.clamp(y, 0, this.canvasHeight)
    };
  }

  // Debug information
  getDebugInfo() {
    return {
      canvasSize: `${this.canvasWidth}x${this.canvasHeight}`,
      mapSize: `${this.mapSizeMm}mm`,
      zoom: this.zoom,
      pan: `${this.panX.toFixed(1)}, ${this.panY.toFixed(1)}`,
      pixelsPerMm: this.pxPerMm().toFixed(2),
      visibleBounds: this.getVisibleBounds()
    };
  }
}

// Global instance
window.EnderTrack = window.EnderTrack || {};
window.EnderTrack.Coordinates = new CoordinateSystem();