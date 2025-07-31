# Technology Stack

## Build System & Package Manager

- **Build Tool**: Vite 7.0+ with React plugin
- **Package Manager**: pnpm (specified in package.json)
- **TypeScript**: ~5.8.3 with strict configuration

## Core Dependencies

### Frontend Framework
- **React**: 19.1.0 with React DOM
- **TypeScript**: Full TypeScript implementation with strict type checking

### UI & Visualization
- **Monaco Editor**: @monaco-editor/react for code editing
- **D3.js**: v7.9.0 for mindmap visualization and SVG manipulation

### State Management
- **Zustand**: v5.0.7 for application state management with devtools and persist middleware

### Data Processing
- **js-yaml**: v4.1.0 for YAML parsing and serialization
- **ajv**: v8.17.1 with ajv-formats for JSON schema validation

## Development Tools

### Testing
- **Vitest**: v3.2.4 as test runner with jsdom environment
- **Testing Library**: React Testing Library v16.3.0 with jest-dom matchers
- **Test Setup**: Global test configuration in `src/test/setup.ts`

### Code Quality
- **ESLint**: v9.30.1 with TypeScript ESLint, React Hooks, and React Refresh plugins
- **Configuration**: Flat config format in `eslint.config.js`

## Common Commands

```bash
# Development
pnpm dev              # Start development server
pnpm build            # Build for production (TypeScript check + Vite build)
pnpm preview          # Preview production build

# Code Quality
pnpm lint             # Run ESLint

# Testing
pnpm test             # Run tests in watch mode
pnpm test:run         # Run tests once
```

## Configuration Files

- `vite.config.ts`: Vite configuration with React plugin and Vitest setup
- `tsconfig.json`: Base TypeScript configuration
- `tsconfig.app.json`: App-specific TypeScript settings
- `tsconfig.node.json`: Node.js TypeScript settings for build tools
- `eslint.config.js`: ESLint flat configuration