import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { useThemeStore } from './shared/zustand/themeStore'


const initializeTheme = () => {
  const { initializeTheme } = useThemeStore.getState();
  initializeTheme();
};

initializeTheme();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
