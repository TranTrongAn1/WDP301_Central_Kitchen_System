# Central Kitchen System - Frontend

## Tech Stack
- React 19
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- Zustand
- React Router v7
- Axios

## Getting Started

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```

### Build
```bash
npm run build
```

### Lint
```bash
npm run lint
```

### Format
```bash
npm run format
```

## Project Structure

```
src/
├── assets/           # Static assets (images, icons)
├── features/         # Feature-based modules
│   ├── auth/        # Authentication feature
│   ├── dashboard/   # Dashboard feature
│   └── home/        # Home feature
├── routes/          # Route configuration
├── shared/          # Shared resources
│   ├── components/  # Shared components (including shadcn/ui)
│   ├── lib/         # Utilities and API clients
│   ├── store/       # Zustand stores
│   ├── types/       # TypeScript types
│   ├── hooks/       # Custom hooks
│   └── constants/   # Constants
├── App.tsx          # Main app component
└── main.tsx         # Entry point
```

## Environment Variables

Create a `.env.local` file:
```
VITE_API_BASE_URL=http://localhost:5000
```

## Features

- ✅ Feature-based architecture
- ✅ TypeScript strict mode
- ✅ Protected routes with role-based access
- ✅ Theme management (dark/light mode)
- ✅ State management with Zustand
- ✅ API client with Axios interceptors
- ✅ shadcn/ui components
- ✅ Path aliases (@/ imports)
