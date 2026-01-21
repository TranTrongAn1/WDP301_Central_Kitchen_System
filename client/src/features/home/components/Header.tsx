import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useThemeStore } from '@/shared/store/themeStore';

export const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { darkMode, toggleDarkMode } = useThemeStore();

  return (
    <nav
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        darkMode
          ? 'bg-background border-b border-border'
          : 'bg-background border-b border-border'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {}
          <Link to="/" className="flex items-center gap-3 cursor-pointer group">
            <div
              className={`p-2.5 rounded-xl transition-all duration-300 ${
                darkMode
                  ? 'bg-primary/20 group-hover:bg-primary/30'
                  : 'bg-primary/10 group-hover:bg-primary/20'
              }`}
            >
              <span className="material-symbols-outlined text-primary text-[28px]">
                bakery_dining
              </span>
            </div>
            <div>
              <h1
                className={`text-xl font-bold tracking-tight ${
                  darkMode ? 'text-foreground' : 'text-foreground'
                }`}
              >
                Kendo<span className="text-primary">Bakery</span>
              </h1>
              <p
                className={`text-[10px] uppercase tracking-[0.2em] font-semibold ${
                  darkMode ? 'text-muted-foreground' : 'text-muted-foreground'
                }`}
              >
                Premium Bakes
              </p>
            </div>
          </Link>

          {}
          <div className="hidden md:flex items-center gap-8">
            <Link
              to="#"
              className={`text-sm font-medium transition-colors duration-200 hover:text-primary ${
                darkMode
                  ? 'text-muted-foreground hover:text-white'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Menu
            </Link>
            <Link
              to="#"
              className={`text-sm font-medium transition-colors duration-200 hover:text-primary ${
                darkMode
                  ? 'text-muted-foreground hover:text-white'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Locations
            </Link>
            <Link
              to="#"
              className={`text-sm font-medium transition-colors duration-200 hover:text-primary ${
                darkMode
                  ? 'text-muted-foreground hover:text-white'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Our Story
            </Link>
          </div>

          {}
          <div className="flex items-center gap-3">
            {}
            <button
              onClick={toggleDarkMode}
              className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                darkMode
                  ? 'bg-secondary hover:bg-secondary/80 text-amber-400'
                  : 'bg-secondary hover:bg-secondary/80 text-amber-600'
              }`}
              aria-label="Toggle theme"
            >
              <span className="material-symbols-outlined text-[22px]">
                {darkMode ? 'light_mode' : 'dark_mode'}
              </span>
            </button>

            <Link
              to="/login"
              className={`hidden md:flex items-center justify-center h-10 px-6 rounded-full font-semibold text-sm transition-all duration-300 ${
                darkMode
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90'
              }`}
            >
              Login
            </Link>

            <button
              className={`md:hidden p-2.5 rounded-full transition-all duration-200 ${
                darkMode
                  ? 'bg-secondary text-muted-foreground'
                  : 'bg-secondary text-muted-foreground'
              }`}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
            >
              <span className="material-symbols-outlined">
                {isMenuOpen ? 'close' : 'menu'}
              </span>
            </button>
          </div>
        </div>

        {}
        {isMenuOpen && (
          <div
            className={`md:hidden py-5 border-t ${
              darkMode ? 'border-border' : 'border-border'
            }`}
          >
            <div className="flex flex-col gap-4">
              <Link
                to="#"
                className={`text-sm font-medium transition-colors ${
                  darkMode
                    ? 'text-muted-foreground hover:text-white'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Menu
              </Link>
              <Link
                to="#"
                className={`text-sm font-medium transition-colors ${
                  darkMode
                    ? 'text-muted-foreground hover:text-white'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Locations
              </Link>
              <Link
                to="#"
                className={`text-sm font-medium transition-colors ${
                  darkMode
                    ? 'text-muted-foreground hover:text-white'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Our Story
              </Link>
              <Link
                to="/login"
                className={`flex items-center justify-center h-10 px-6 rounded-full font-semibold text-sm transition-all duration-300 ${
                  darkMode
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                }`}
              >
                Login
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};
