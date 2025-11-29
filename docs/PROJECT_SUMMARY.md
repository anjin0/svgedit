# SVG Editor Project - Complete Summary

## Project Overview
A web-based SVG editor built with Svelte 5, TypeScript, and Tailwind CSS. This is a Figma-inspired vector graphics editor that allows users to create and manipulate SVG shapes.

## Technology Stack
- **Framework**: Svelte 5 (with runes: $state, $derived, $effect)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **UI Components**: shadcn-svelte
- **Build Tool**: Vite

## Project Structure

```
svgedit/
├── src/
│   ├── lib/
│   │   ├── components/
│   │   │   ├── ui/                        # shadcn-svelte UI components
│   │   │   ├── editor/
│   │   │   │   ├── Canvas.svelte          # Main SVG canvas with pan/zoom
│   │   │   │   ├── Toolbar.svelte         # Top toolbar with drawing tools
│   │   │   │   ├── PropertiesPanel.svelte # Right panel for element properties
│   │   │   │   ├── LayersPanel.svelte     # Left panel for layer management
│   │   │   │   ├── TransformControls.svelte # Selection box, resize handles, rotation
│   │   │   │   └── elements/
│   │   │   │       ├── Rectangle.svelte   # Rectangle element component
│   │   │   │       ├── Circle.svelte      # Circle element component
│   │   │   │       ├── Ellipse.svelte     # Ellipse element component
│   │   │   │       └── Line.svelte        # Line element component
│   │   │   └── shared/                    # Shared components
│   │   ├── stores/
│   │   │   ├── editor.svelte.ts          # Editor state (tools, elements)
│   │   │   ├── canvas.svelte.ts          # Canvas state (viewbox, zoom, grid)
│   │   │   ├── selection.svelte.ts       # Selection state
│   │   │   └── drawing.svelte.ts         # Drawing state
│   │   ├── types/
│   │   │   └── index.ts                  # TypeScript type definitions
│   │   └── utils/
│   │       └── svg.ts                    # SVG utility functions
│   └── routes/
│       └── +page.svelte                  # Main editor page
├── CLAUDE.md                             # Project instructions and guidelines
└── package.json
```

## Core Features Implemented

### 1. Canvas System
- **Pan**: Middle mouse button or Pan tool
- **Zoom**: Mouse wheel (zoom in/out)
- **Grid**: Toggleable grid display with customizable size
- **ViewBox Management**: SVG viewBox for proper coordinate transformation

### 2. Drawing Tools
- **Select Tool**: Default selection and manipulation
- **Pan Tool**: Canvas panning
- **Rectangle**: Draw rectangles with click-and-drag
- **Circle**: Draw circles with click-and-drag
- **Ellipse**: Draw ellipses with click-and-drag
- **Line**: Draw lines with click-and-drag

### 3. Transform Controls
- **Selection Box**: Visual indicator for selected elements
- **Resize Handles**: 8 handles (4 corners + 4 edges) for resizing
- **Rotation Handle**: Circular handle above selection for rotation
- **Different Behavior by Shape Type**:
  - **Rectangle & Line**: Handles rotate with the element
  - **Circle & Ellipse**: Handles remain horizontal/vertical (non-rotated)

### 4. Element Properties
Editable properties in the Properties Panel:
- **Transform**: X, Y position, Rotation angle
- **Size**: Width, Height (for applicable shapes)
- **Fill**:
  - Type (Solid or Gradient)
  - Color picker for solid fills
  - Gradient stops editor for gradients
  - Opacity slider
- **Stroke**:
  - Color picker
  - Width adjustment
- **Overall Opacity**: Global opacity slider

### 5. Layers Panel
- Element list with names
- Visibility toggle per element
- Layer locking (planned)
- Reordering (planned)

## State Management Architecture

### Editor Store (`editor.svelte.ts`)
```typescript
{
  currentTool: 'select' | 'pan' | 'rectangle' | 'circle' | 'ellipse' | 'line',
  elements: SVGElement[],
  // Methods: addElement, updateElement, removeElement, getElementById
}
```

### Canvas Store (`canvas.svelte.ts`)
```typescript
{
  zoom: number,
  viewBox: { x, y, width, height },
  gridSize: number,
  gridVisible: boolean,
  // Methods: pan, zoomIn, zoomOut, resetZoom, toggleGrid
}
```

### Selection Store (`selection.svelte.ts`)
```typescript
{
  selectedIds: string[],
  // Methods: select, clearSelection, isSelected
}
```

### Drawing Store (`drawing.svelte.ts`)
```typescript
{
  isDrawing: boolean,
  startPoint: Point | null,
  currentPoint: Point | null,
  previewElement: SVGElement | null,
  // Methods: startDrawing, updateDrawing, endDrawing, setPreviewElement
}
```

## Type Definitions

### SVGElement Types
```typescript
type SVGElement = RectangleElement | CircleElement | EllipseElement | LineElement;

interface Transform {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
}

interface RectangleElement {
  id: string;
  type: 'rectangle';
  name: string;
  width: number;
  height: number;
  transform: Transform;
  fill: Fill;
  stroke: Stroke;
  visible: boolean;
  locked: boolean;
  opacity: number;
}

interface CircleElement {
  id: string;
  type: 'circle';
  name: string;
  radius: number;
  transform: Transform;
  fill: Fill;
  stroke: Stroke;
  visible: boolean;
  locked: boolean;
  opacity: number;
}

// Similar for EllipseElement and LineElement
```

## Key Technical Implementations

### 1. Coordinate System Transformation
- **Screen Coordinates**: Mouse position in pixels
- **SVG Coordinates**: Position in SVG viewBox units
- **Conversion**: Using `getScreenCTM()` matrix transformation

```typescript
const getMousePosition = (event: MouseEvent, svg: SVGSVGElement): Point => {
  const CTM = svg.getScreenCTM();
  if (CTM) {
    return {
      x: (event.clientX - CTM.e) / CTM.a,
      y: (event.clientY - CTM.f) / CTM.d
    };
  }
  return { x: 0, y: 0 };
};
```

### 2. Resize Handle Logic (Anchor Point Principle)
**Core Principle**: When dragging a handle, the opposite handle stays fixed, and the element's center is the midpoint between them.

**Implementation for Circle** (lines 218-305 in TransformControls.svelte):
```typescript
// Convert circle to bounding box representation
let topLeftX = initialCenterX - initialRadius;
let topLeftY = initialCenterY - initialRadius;
let newWidth = initialRadius * 2;
let newHeight = initialRadius * 2;

// Apply resize logic (same as rectangle)
switch (dragHandle) {
  case 'bottom-right':
    newWidth += dx;
    newHeight += dy;
    break;
  // ... other cases
}

// Convert back to circle
const newX = topLeftX + newWidth / 2;
const newY = topLeftY + newHeight / 2;
const newRadius = (newWidth + newHeight) / 4; // Average for circular shape
```

### 3. Rotation Handling
**For Rectangles and Lines**: Handles rotate with the element (inside rotated `<g>`)
```svelte
<g transform="rotate({rotation} {centerX} {centerY})">
  <!-- Selection box and handles -->
</g>
```

**For Circles and Ellipses**: Handles remain axis-aligned (outside rotation)
```svelte
<g transform="rotate({rotation} {centerX} {centerY})">
  <!-- Only the selection box rotates -->
</g>
<!-- Handles outside, non-rotated -->
```

### 4. Real-time Handle Position Update
**Problem**: During drag, handles were moving because they were calculated from current element state.

**Solution**: Use `initialBounds` during drag operation (line 321-334):
```typescript
const handles = $derived(() => {
  // Use bounds() to update handles in real-time during drag
  const b = bounds();
  return [
    { type: 'top-left', x: b.x, y: b.y },
    { type: 'bottom-right', x: b.x + b.width, y: b.y + b.height },
    // ... other handles
  ];
});
```

## Design Decisions

### 1. No Undo/Redo
- Simplified version to focus on core editing features
- Can be added later with a command pattern

### 2. Figma-inspired UI
- Light theme with clean, minimal design
- Properties panel on the right
- Layers panel on the left
- Toolbar at the top

### 3. Svelte 5 Runes
- `$state`: Reactive state variables
- `$derived`: Computed values
- `$effect`: Side effects and lifecycle

### 4. Arrow Functions Only
- Consistent coding style
- Modern JavaScript syntax

### 5. Transform Model
- All elements have a transform property (x, y, rotation, scale)
- Shapes use different coordinate systems:
  - **Rectangle**: (x, y) = top-left corner
  - **Circle/Ellipse**: (x, y) = center point
  - **Line**: (x, y) = transform origin, with relative endpoints

## Known Issues and Debugging

### Latest Debugging Session
**Issue**: Circle resize handles not working correctly - opposite handle moving when it should be fixed.

**Root Causes Identified**:
1. Mixing screen coordinates with SVG coordinates
2. Using diagonal distance for radius calculation (should use width/height)
3. Handles using current `bounds()` instead of `initialBounds` during drag
4. Circle/Ellipse handles incorrectly placed inside rotated `<g>` group

**Solutions Applied**:
1. Convert all coordinates to SVG space using `getMousePosition()`
2. Use bounding box width/height for radius: `radius = width / 2`
3. Use `bounds()` for real-time handle updates during drag
4. Separate rendering: rotated `<g>` for Rectangle/Line, non-rotated for Circle/Ellipse
5. Treat circle as a bounding box rectangle during resize, then convert back to center + radius

### Current Status
The resize system now works correctly with:
- Opposite handles staying fixed ✓
- Dragging handle following mouse cursor ✓
- Proper anchor point principle implementation ✓
- Different handling for rotated vs non-rotated shapes ✓

## Future Enhancements (Planned)

### Phase 1: Current Implementation
- ✅ Basic editor layout
- ✅ Pan and zoom
- ✅ Grid display
- ✅ Drawing tools (rectangle, circle, ellipse, line)
- ✅ Element selection
- ✅ Transform handles (resize, rotate)
- ✅ Properties editing

### Phase 2: Next Steps
- [ ] Multi-selection support
- [ ] Keyboard shortcuts
- [ ] Delete elements (Delete/Backspace key)
- [ ] Layer reordering (drag and drop)
- [ ] Layer locking functionality
- [ ] Copy/paste elements

### Phase 3: Advanced Features
- [ ] Path tool for custom shapes
- [ ] Text elements
- [ ] Image import
- [ ] Group/ungroup elements
- [ ] Alignment tools
- [ ] Distribution tools

### Phase 4: File Operations
- [ ] Export as SVG file
- [ ] Import SVG files
- [ ] Save/load project state
- [ ] Export as PNG/JPEG

### Phase 5: Professional Features
- [ ] Undo/Redo history
- [ ] Snapping to grid
- [ ] Snapping to other elements
- [ ] Guides and rulers
- [ ] Boolean operations (union, subtract, intersect)

## Development Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type checking
npm run check

# Add shadcn-svelte component
npx shadcn-svelte@latest add [component-name]
```

## Code Style Guidelines

1. **Functions**: Use arrow functions exclusively
2. **Reactivity**: Use Svelte 5 runes ($state, $derived, $effect)
3. **TypeScript**: Strict mode enabled, explicit types
4. **Formatting**: Consistent indentation and naming
5. **Comments**: Explain "why" rather than "what"
6. **File Organization**: Components grouped by feature/domain

## Performance Considerations

1. **Derived Values**: Use `$derived` for computed values to avoid recalculation
2. **Event Handling**: Use event delegation where possible
3. **SVG Rendering**: Minimize DOM updates during drag operations
4. **State Updates**: Batch updates to avoid multiple re-renders

## Browser Compatibility

- Modern browsers with SVG 2.0 support
- Chrome/Edge: ✓
- Firefox: ✓
- Safari: ✓
- IE11: ✗ (Not supported due to Svelte 5)

## License

Not specified - this is a learning/demo project.

---

**Last Updated**: December 2024
**Version**: 0.1.0 (Alpha)
**Status**: Active Development
