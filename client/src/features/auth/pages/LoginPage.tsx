import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useThemeStore } from '@/shared/store/themeStore';

const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const { darkMode } = useThemeStore();

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden bg-background">
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-primary/20 via-background to-amber-500/10" />

      <div className="particle w-32 h-32 top-1/4 left-1/4 animate-float-slow z-0 bg-white/20" />
      <div className="particle w-20 h-20 bottom-1/3 right-1/4 animate-float-medium z-0 bg-white/20" />
      <div className="particle w-16 h-16 top-1/3 right-1/3 animate-float-fast z-0 bg-white/20" />
      <div
        className="particle w-24 h-24 bottom-10 left-10 animate-float-slow z-0"
        style={{ background: 'rgba(231, 126, 35, 0.15)' }}
      />

      <div className="relative z-10 w-full p-4 flex justify-center">
        <div className="glass-card w-full max-w-[480px] rounded-2xl p-8 sm:p-10 flex flex-col gap-6">
          <Link
            to="/"
            className="absolute top-4 left-4 p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-secondary transition-colors"
            aria-label="Go back to homepage"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>

          <div className="flex flex-col items-center gap-4 pt-4">
            <div className="bg-primary/90 text-white p-3 rounded-xl shadow-lg shadow-primary/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl">bakery_dining</span>
            </div>
            <div className="text-center">
              <h1 className="text-foreground tracking-tight text-3xl font-bold leading-tight">
                Kendo<span className="text-primary">Bakery</span>
              </h1>
              <p className="text-muted-foreground text-sm font-medium mt-1">Management System</p>
            </div>
          </div>

          <form className="flex flex-col gap-5" onSubmit={(e) => e.preventDefault()}>
            <div className="flex flex-col gap-1.5">
              <label className="text-foreground text-sm font-medium leading-normal pl-1">
                Email Address
              </label>
              <input
                className="flex w-full rounded-lg border border-border bg-white/60 dark:bg-white/5 backdrop-blur-sm h-12 px-4 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200 shadow-sm"
                placeholder="name@kendobakery.com"
                type="email"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-foreground text-sm font-medium leading-normal pl-1">
                Password
              </label>
              <div className="relative flex w-full items-center">
                <input
                  className="flex w-full rounded-lg border border-border bg-white/60 dark:bg-white/5 backdrop-blur-sm h-12 pl-4 pr-12 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200 shadow-sm"
                  placeholder="Enter your password"
                  type={showPassword ? 'text' : 'password'}
                />
                <button
                  className="absolute right-0 top-0 h-full px-4 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors cursor-pointer focus:outline-none"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <a
                className="text-primary text-sm font-medium hover:text-orange-600 transition-colors hover:underline cursor-pointer"
                href="#"
              >
                Forgot Password?
              </a>
            </div>

            <button
              type="submit"
              className="w-full h-12 bg-primary text-primary-foreground text-base font-semibold rounded-lg shadow-[0_4px_14px_0_rgba(231,126,35,0.39)] hover:bg-primary/90 hover:shadow-[0_6px_20px_rgba(231,126,35,0.23)] hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2 group"
            >
              <span>Sign In</span>
              <span className="material-symbols-outlined text-[20px] transition-transform group-hover:translate-x-1">
                arrow_forward
              </span>
            </button>
          </form>

          <div className="flex items-center justify-center gap-2 pt-2">
            <p className="text-muted-foreground text-sm">Not a staff member?</p>
            <a
              className="text-foreground text-sm font-semibold hover:text-primary transition-colors cursor-pointer"
              href="#"
            >
              Contact Admin
            </a>
          </div>
        </div>
      </div>

      <div className="relative z-10 mt-8 mb-4">
        <p className="text-white/60 text-xs text-center drop-shadow-md">
          © 2024 Kendo Bakery Inc. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
