# Project Structure

## Root Directory

- **Configuration**: `package.json`, `vite.config.ts`, `tsconfig.*.json`, `eslint.config.js`
- **Entry Points**: `index.html` (Vite entry), `src/main.tsx` (React entry)
- **Static Assets**: `public/` directory for static files

## Source Code Organization (`src/`)

### Components (`src/components/`)
- **Layout.tsx**: Main application layout with header, footer, and content areas
- **EditorPane.tsx**: Monaco editor component with language switching and error display
- **MindmapPane.tsx**: D3.js mindmap visualization with zoom and layout controls
- **index.ts**: Barrel export for all components
- **Styling**: Co-located CSS files (e.g., `Layout.css`, `EditorPane.css`)

### State Management (`src/stores/`)
- **appStore.ts**: Main Zustand store with file, parse, and UI state
- **selectors.ts**: Reusable state selectors
- **index.ts**: Store exports
- **Tests**: `__tests__/` directory with store unit tests

### Custom Hooks (`src/hooks/`)
- **useStoreSync.ts**: Debounced state synchronization hooks
- **useLocalStorage.ts**: Local storage persistence hook
- **useDebounce.ts**: Generic debounce utility hook
- **index.ts**: Hook exports
- **Tests**: `__tests__/` directory with hook tests

### Services (`src/services/`)
- **parserService.ts**: JSON/YAML parsing and validation logic
- **fileService.ts**: File I/O operations
- **index.ts**: Service exports
- **Tests**: `__tests__/` directory with service tests

### Type Definitions (`src/types/`)
- **mindmap.ts**: Core mindmap data structures and interfaces
- **store.ts**: Zustand store type definitions
- **services.ts**: Service interface definitions
- **json.d.ts**: JSON module declarations
- **index.ts**: Type exports

### Utilities (`src/utils/`)
- **constants.ts**: Application constants and configuration
- **helpers.ts**: Pure utility functions
- **schemaValidator.ts**: JSON schema validation utilities
- **index.ts**: Utility exports

### Schemas (`src/schemas/`)
- **mindmap-data.schema.json**: JSON schema for mindmap data validation
- **custom-schema.schema.json**: Schema for custom field definitions

### Testing (`src/test/`)
- **setup.ts**: Global test configuration and mocks

## Architecture Patterns

### Component Structure
- Functional components with TypeScript
- Props interfaces defined inline or in separate types
- Co-located CSS files for component-specific styles
- Barrel exports from index files

### State Management
- Single Zustand store with sliced state (file, parse, ui)
- Persistent state for user preferences
- Debounced updates for performance
- Custom hooks for state synchronization

### Service Layer
- Interface-based service definitions
- Async operations with proper error handling
- Comprehensive unit test coverage
- Separation of concerns (parsing, validation, file I/O)

### Testing Strategy
- Unit tests for hooks, stores, and services
- Vitest with jsdom environment
- Testing Library for React components
- Mock implementations for external dependencies

## Naming Conventions

- **Files**: PascalCase for components, camelCase for utilities
- **Directories**: camelCase (e.g., `components`, `hooks`)
- **Types**: PascalCase interfaces and types
- **Constants**: UPPER_SNAKE_CASE
- **Functions**: camelCase with descriptive names

## Import/Export Patterns

- Barrel exports from index files
- Relative imports within modules
- Absolute imports from src root
- Type-only imports where appropriate