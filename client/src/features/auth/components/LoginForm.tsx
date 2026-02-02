import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';

// 1. Import API Service
import { authApi } from '../../../api/AuthApi';

import { useAuthStore } from '@/shared/zustand/authStore';
import { useThemeStore } from '@/shared/zustand/themeStore';

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

const LoginForm = () => {
  const navigate = useNavigate();
  const { setAuth, getRedirectRoute } = useAuthStore();
  const { darkMode } = useThemeStore(); // Biến này chưa dùng, có thể giữ hoặc bỏ

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    const toastId = toast.loading('Signing in...');

    try {

      const response = await authApi.login(data);
      // cần check token trong if để chắc chắn có token mới cho đăng nhập
      if (response.success && response.token) {
        const { user, token } = response;
        setAuth(user, token);
        
        toast.success(response.message || 'Login successful!', { id: toastId });
        
        const redirectRoute = getRedirectRoute();
        navigate(redirectRoute, { replace: true });
      } else {
        toast.error(response.message || 'Login failed', { id: toastId });
      }
    } catch (error: any) {
      const errorMessage =
        error.message ||
        'An error occurred during login';
      
      toast.error(errorMessage, { id: toastId });
      console.error('Login Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // ... Phần giao diện (JSX) giữ nguyên không đổi ...
    <div className="relative z-10 w-full p-4 flex justify-center">
      <div className="glass-card w-full max-w-[480px] rounded-2xl p-8 sm:p-10 flex flex-col gap-6">
        {/* ... Giữ nguyên nội dung bên trong ... */}
        {/* Mình lược bớt phần JSX để tiết kiệm chỗ vì nó không thay đổi */}
        <Link
          to="/"
          className="absolute top-4 left-4 p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-secondary transition-colors"
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

        <form className="flex flex-col gap-5" onSubmit={handleSubmit(onSubmit)}>
           {/* ... Các input giữ nguyên ... */}
           <div className="flex flex-col gap-1.5">
            <label className="text-foreground text-sm font-medium leading-normal pl-1" htmlFor="username">Username</label>
            <input
              id="username"
              className={`flex w-full rounded-lg border bg-white/60 dark:bg-white/5 backdrop-blur-sm h-12 px-4 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-200 shadow-sm ${errors.username ? 'border-red-500 focus:ring-red-500/50' : 'border-border focus:border-primary'}`}
              placeholder="Enter your username"
              type="text"
              {...register('username')}
              disabled={isLoading}
            />
            {errors.username && <p className="text-red-500 text-xs pl-1 mt-1">{errors.username.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-foreground text-sm font-medium leading-normal pl-1" htmlFor="password">Password</label>
            <div className="relative flex w-full items-center">
              <input
                id="password"
                className={`flex w-full rounded-lg border bg-white/60 dark:bg-white/5 backdrop-blur-sm h-12 pl-4 pr-12 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-200 shadow-sm ${errors.password ? 'border-red-500 focus:ring-red-500/50' : 'border-border focus:border-primary'}`}
                placeholder="Enter your password"
                type={showPassword ? 'text' : 'password'}
                {...register('password')}
                disabled={isLoading}
              />
              <button
                className="absolute right-0 top-0 h-full px-4 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors cursor-pointer focus:outline-none"
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                <span className="material-symbols-outlined text-[20px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
              </button>
            </div>
            {errors.password && <p className="text-red-500 text-xs pl-1 mt-1">{errors.password.message}</p>}
          </div>

          <div className="flex justify-end">
            <a className="text-primary text-sm font-medium hover:text-orange-600 transition-colors hover:underline cursor-pointer" href="#">Forgot Password?</a>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 bg-primary text-primary-foreground text-base font-semibold rounded-lg shadow-[0_4px_14px_0_rgba(231,126,35,0.39)] hover:bg-primary/90 hover:shadow-[0_6px_20px_rgba(231,126,35,0.23)] hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:shadow-none"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Signing in...
              </span>
            ) : (
              <>
                <span>Sign In</span>
                <span className="material-symbols-outlined text-[20px] transition-transform group-hover:translate-x-1">arrow_forward</span>
              </>
            )}
          </button>
        </form>

        <div className="flex items-center justify-center gap-2 pt-2">
          <p className="text-muted-foreground text-sm">Not a staff member?</p>
          <a className="text-foreground text-sm font-semibold hover:text-primary transition-colors cursor-pointer" href="#">Contact Admin</a>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;