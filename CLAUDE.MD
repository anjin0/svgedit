# SVG Editor Project

## Project Overview
A web-based SVG editor built with Svelte 5, TypeScript, and Tailwind CSS.

## Technology Stack
- **Framework**: Svelte 5
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn-svelte (for additional components as needed)

## Project Goals
Create a fully functional web-based SVG editor that allows users to:
- Create and edit SVG graphics
- Manipulate shapes, paths, and other SVG elements
- Export and save SVG files

## Development Guidelines
- Use TypeScript for type safety
- Follow Svelte 5 best practices and conventions
- Style components using Tailwind CSS utility classes
- Use shadcn-svelte components when additional UI components are needed
- Maintain clean, readable, and maintainable code

## Architecture Notes
- Component-based architecture following Svelte 5 patterns
- Modular design for different editor features
- Reactive state management using Svelte 5 runes ($state, $derived, $effect)

## Getting Started

### Prerequisites
- Node.js (installed)
- npm (installed)

### Installation
The project has been set up with the following steps:

1. **Svelte 5 Project Creation**
   - Created using `npx sv create` with TypeScript template
   - Minimal template with TypeScript support

2. **Tailwind CSS Setup**
   - Installed tailwindcss, postcss, and autoprefixer
   - Configured `tailwind.config.js` with shadcn-svelte theme colors
   - Created `postcss.config.js` for processing
   - Added Tailwind directives to `src/app.css`

3. **shadcn-svelte Configuration**
   - Installed required dependencies: `clsx`, `tailwind-merge`, `tailwind-variants`
   - Created utility function `src/lib/utils.ts` for className merging
   - Configured CSS variables for theming (light/dark mode support)
   - Set up component directory structure at `src/lib/components/ui/`

### Running the Development Server
```bash
npm run dev
```

The application will be available at `http://localhost:5173` (or another port if 5173 is in use).

### Building for Production
```bash
npm run build
```

### Adding shadcn-svelte Components
When you need to add UI components, you can use:
```bash
npx shadcn-svelte@latest add [component-name]
```

Example:
```bash
npx shadcn-svelte@latest add button
npx shadcn-svelte@latest add card
```

## Project Structure

```
src/
├── lib/
│   ├── components/
│   │   ├── ui/                    # shadcn-svelte UI components
│   │   ├── editor/
│   │   │   ├── Canvas.svelte      # Main SVG canvas with pan/zoom
│   │   │   ├── Toolbar.svelte     # Top toolbar with tools
│   │   │   ├── PropertiesPanel.svelte  # Right properties panel
│   │   │   ├── LayersPanel.svelte      # Left layers panel
│   │   │   └── elements/          # SVG element components
│   │   └── shared/                # Shared components
│   ├── stores/
│   │   ├── editor.svelte.ts       # Editor state (tools, elements)
│   │   ├── canvas.svelte.ts       # Canvas state (viewbox, zoom, grid)
│   │   └── selection.svelte.ts    # Selection state
│   ├── types/
│   │   ├── svg.ts                 # SVG element types
│   │   └── editor.ts              # Editor state types
│   └── utils/                     # Utility functions
└── routes/
    └── +page.svelte               # Main editor page
```

## Development Plan

### Phase 1: Basic Structure ✅ COMPLETED
- [x] TypeScript type definitions for SVG elements and editor state
- [x] Svelte 5 state management using runes ($state, $derived)
- [x] Basic layout structure (Toolbar, Canvas, Panels)
- [x] Pan and zoom functionality
- [x] Grid display

### Phase 2: Canvas Implementation (NEXT)
- [ ] SVG element rendering system
- [ ] Drawing tools (rectangle, circle, ellipse, line)
- [ ] Mouse event handling for drawing
- [ ] Real-time preview while drawing

### Phase 3: Editing Features
- [ ] Element selection system
- [ ] Transform handles (move, resize, rotate)
- [ ] Multi-selection support
- [ ] Delete elements

### Phase 4: Properties Editing
- [ ] Color picker for fill and stroke
- [ ] Gradient editor
- [ ] Stroke width and style
- [ ] Opacity controls
- [ ] Transform properties (position, rotation, scale)

### Phase 5: Layers Management
- [ ] Layer visibility toggle
- [ ] Layer locking
- [ ] Layer reordering
- [ ] Layer naming

### Phase 6: File Operations
- [ ] Export as SVG
- [ ] Import SVG files
- [ ] Download functionality

## Coding Standards

- All functions use arrow function syntax
- Svelte 5 runes for reactivity ($state, $derived, $effect)
- TypeScript strict mode
- Figma-inspired light theme UI
- No undo/redo history (simplified version)

## Current Features

### Implemented
- ✅ Basic editor layout with toolbar, canvas, and panels
- ✅ Tool selection system
- ✅ Canvas pan (middle mouse or pan tool)
- ✅ Canvas zoom (mouse wheel)
- ✅ Grid display with toggle
- ✅ Layers panel structure
- ✅ Properties panel structure
- ✅ State management with Svelte 5 stores

### In Progress
- 🚧 SVG element rendering
- 🚧 Drawing tools implementation

### Planned
- 📋 Element selection and transformation
- 📋 Color and gradient editing
- 📋 SVG export/import
