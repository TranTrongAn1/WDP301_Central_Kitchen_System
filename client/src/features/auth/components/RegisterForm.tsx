import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import axios from 'axios';
import { useAuthStore } from '@/shared/zustand/authStore';
import type { Role, Store, UserRole } from '@/shared/types/auth';

const registerSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  fullName: z.string().min(1, 'Full name is required'),
  email: z.string().email('Invalid email address'),
  roleId: z.string().min(1, 'Please select a role'),
  storeId: z.string().optional().nullable(),
});

type RegisterFormData = z.infer<typeof registerSchema>;

const ROLES_WITHOUT_STORE: UserRole[] = ['Admin', 'Manager', 'KitchenStaff', 'Coordinator'];

const RegisterForm = () => {
  const navigate = useNavigate();
  const { token } = useAuthStore();

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [isGettingStores, setIsGettingStores] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      storeId: null,
    },
  });

  useEffect(() => {
    const fetchRoles = async () => {
      setIsLoading(true);
      try {
        const response = await axios.get('/auth/roles', {
          baseURL: import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000',
        });
        if (response.data.success) {
          setRoles(response.data.data || []);
        }
      } catch (error) {
        console.error('Failed to fetch roles:', error);
        toast.error('Failed to load roles');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoles();
  }, []);

  useEffect(() => {
    if (ROLES_WITHOUT_STORE.includes(selectedRole as UserRole)) {
      setStores([]);
      setValue('storeId', null);
      return;
    }

    setIsGettingStores(true);
    const fetchStores = async () => {
      try {
        const response = await axios.get('/stores', {
          baseURL: import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000',
        });
        if (response.data.success) {
          setStores(response.data.data || []);
        }
      } catch (error) {
        console.error('Failed to fetch stores:', error);
        toast.error('Failed to load stores');
      } finally {
        setIsGettingStores(false);
      }
    };

    fetchStores();
  }, [selectedRole, setValue]);

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const roleId = e.target.value;
    setSelectedRole(roleId);
    setValue('roleId', roleId);

    const role = roles.find(r => r._id === roleId);
    if (role && ROLES_WITHOUT_STORE.includes(role.roleName)) {
      setValue('storeId', null);
    } else {
      setValue('storeId', '');
    }
  };

  const onSubmit = async (data: RegisterFormData) => {
    const selectedRoleObj = roles.find(r => r._id === data.roleId);
    if (selectedRoleObj?.roleName === 'StoreStaff' && !data.storeId) {
      toast.error('StoreStaff must be assigned to a store');
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading('Creating account...');

    try {
      const response = await axios.post<{ success: boolean; message?: string }>(
        '/auth/register',
        {
          username: data.username,
          password: data.password,
          fullName: data.fullName,
          email: data.email,
          roleId: data.roleId,
          storeId: data.storeId || null,
        },
        {
          baseURL: import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        toast.success(response.data.message || 'User created successfully!', { id: toastId });
        navigate('/dashboard', { replace: true });
      } else {
        toast.error(response.data.message || 'Registration failed', { id: toastId });
      }
    } catch (error: unknown) {
      const axiosError = error as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      const errorMessage =
        axiosError.response?.data?.message ||
        axiosError.message ||
        'An error occurred during registration';

      toast.error(errorMessage, { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleName = (roleId: string): string => {
    const role = roles.find(r => r._id === roleId);
    return role?.roleName || '';
  };

  const showStoreField = selectedRole && !ROLES_WITHOUT_STORE.includes(getRoleName(selectedRole) as UserRole);

  return (
    <div className="relative z-10 w-full p-4 flex justify-center">
      <div className="glass-card w-full max-w-[520px] rounded-2xl p-8 sm:p-10 flex flex-col gap-5">
        <Link
          to="/"
          className="absolute top-4 left-4 p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-secondary transition-colors"
          aria-label="Go back to homepage"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>

        <div className="flex flex-col items-center gap-4 pt-4">
          <div className="bg-primary/90 text-white p-3 rounded-xl shadow-lg shadow-primary/30 flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl">person_add</span>
          </div>
          <div className="text-center">
            <h1 className="text-foreground tracking-tight text-3xl font-bold leading-tight">
              Create <span className="text-primary">Account</span>
            </h1>
            <p className="text-muted-foreground text-sm font-medium mt-1">Add new staff member</p>
          </div>
        </div>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-1.5">
            <label className="text-foreground text-sm font-medium leading-normal pl-1" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              className={`flex w-full rounded-lg border bg-white/60 dark:bg-white/5 backdrop-blur-sm h-11 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-200 shadow-sm ${errors.username ? 'border-red-500 focus:ring-red-500/50' : 'border-border focus:border-primary'
                }`}
              placeholder="Enter username (min 3 characters)"
              type="text"
              {...register('username')}
              disabled={isLoading || isSubmitting}
            />
            {errors.username && (
              <p className="text-red-500 text-xs pl-1 mt-1">{errors.username.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-foreground text-sm font-medium leading-normal pl-1" htmlFor="fullName">
              Full Name
            </label>
            <input
              id="fullName"
              className={`flex w-full rounded-lg border bg-white/60 dark:bg-white/5 backdrop-blur-sm h-11 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-200 shadow-sm ${errors.fullName ? 'border-red-500 focus:ring-red-500/50' : 'border-border focus:border-primary'
                }`}
              placeholder="Enter full name"
              type="text"
              {...register('fullName')}
              disabled={isLoading || isSubmitting}
            />
            {errors.fullName && (
              <p className="text-red-500 text-xs pl-1 mt-1">{errors.fullName.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-foreground text-sm font-medium leading-normal pl-1" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              className={`flex w-full rounded-lg border bg-white/60 dark:bg-white/5 backdrop-blur-sm h-11 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-200 shadow-sm ${errors.email ? 'border-red-500 focus:ring-red-500/50' : 'border-border focus:border-primary'
                }`}
              placeholder="name@kendobakery.com"
              type="email"
              {...register('email')}
              disabled={isLoading || isSubmitting}
            />
            {errors.email && (
              <p className="text-red-500 text-xs pl-1 mt-1">{errors.email.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-foreground text-sm font-medium leading-normal pl-1" htmlFor="roleId">
              Role
            </label>
            <select
              id="roleId"
              className={`flex w-full rounded-lg border bg-white/60 dark:bg-white/5 backdrop-blur-sm h-11 px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-200 shadow-sm appearance-none cursor-pointer ${errors.roleId ? 'border-red-500 focus:ring-red-500/50' : 'border-border focus:border-primary'
                }`}
              {...register('roleId')}
              onChange={handleRoleChange}
              disabled={isLoading || isSubmitting}
              defaultValue=""
            >
              <option value="" disabled>
                {isLoading ? 'Loading roles...' : 'Select a role'}
              </option>
              {roles.map((role) => (
                <option key={role._id} value={role._id}>
                  {role.roleName}
                </option>
              ))}
            </select>
            {errors.roleId && (
              <p className="text-red-500 text-xs pl-1 mt-1">{errors.roleId.message}</p>
            )}
          </div>

          {showStoreField && (
            <div className="flex flex-col gap-1.5 animate-fade-in">
              <label className="text-foreground text-sm font-medium leading-normal pl-1" htmlFor="storeId">
                Assigned Store <span className="text-primary">*</span>
              </label>
              <select
                id="storeId"
                className={`flex w-full rounded-lg border bg-white/60 dark:bg-white/5 backdrop-blur-sm h-11 px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-200 shadow-sm appearance-none cursor-pointer ${errors.storeId ? 'border-red-500 focus:ring-red-500/50' : 'border-border focus:border-primary'
                  }`}
                {...register('storeId')}
                disabled={isGettingStores || isSubmitting}
                defaultValue=""
              >
                <option value="" disabled>
                  {isGettingStores ? 'Loading stores...' : 'Select a store'}
                </option>
                {stores.map((store) => (
                  <option key={store._id} value={store._id}>
                    {store.storeName}
                  </option>
                ))}
              </select>
              {errors.storeId && (
                <p className="text-red-500 text-xs pl-1 mt-1">{errors.storeId.message}</p>
              )}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-foreground text-sm font-medium leading-normal pl-1" htmlFor="password">
              Password
            </label>
            <div className="relative flex w-full items-center">
              <input
                id="password"
                className={`flex w-full rounded-lg border bg-white/60 dark:bg-white/5 backdrop-blur-sm h-11 pl-4 pr-12 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-200 shadow-sm ${errors.password ? 'border-red-500 focus:ring-red-500/50' : 'border-border focus:border-primary'
                  }`}
                placeholder="Min 6 characters"
                type={showPassword ? 'text' : 'password'}
                {...register('password')}
                disabled={isLoading || isSubmitting}
              />
              <button
                className="absolute right-0 top-0 h-full px-4 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors cursor-pointer focus:outline-none"
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Toggle password visibility"
                disabled={isLoading || isSubmitting}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
            {errors.password && (
              <p className="text-red-500 text-xs pl-1 mt-1">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || isSubmitting}
            className="w-full h-11 mt-2 bg-primary text-primary-foreground text-base font-semibold rounded-lg shadow-[0_4px_14px_0_rgba(231,126,35,0.39)] hover:bg-primary/90 hover:shadow-[0_6px_20px_rgba(231,126,35,0.23)] hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:shadow-none"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <svg
                  className="animate-spin h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Creating...
              </span>
            ) : (
              <>
                <span>Create Account</span>
                <span className="material-symbols-outlined text-[20px] transition-transform group-hover:translate-x-1">
                  arrow_forward
                </span>
              </>
            )}
          </button>
        </form>

        <div className="flex items-center justify-center gap-2 pt-2">
          <p className="text-muted-foreground text-sm">Already have an account?</p>
          <Link
            to="/login"
            className="text-foreground text-sm font-semibold hover:text-primary transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterForm;
