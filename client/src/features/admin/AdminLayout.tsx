import { Outlet } from 'react-router-dom';
import { AdminSidebar } from './components/AdminSidebar';
import { useThemeStore } from '@/shared/zustand/themeStore';

export const AdminLayout = () => {
  const { darkMode, toggleDarkMode } = useThemeStore();

  return (
    // Container chính: Flex row để chia đôi màn hình
    <div className={`flex h-screen w-full transition-colors duration-300 ${
        darkMode ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'
    }`}>
      
      {/* Sidebar cố định bên trái */}
      <AdminSidebar />

      {/* Khu vực Content bên phải */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Admin Header (Optional: Chứa thanh search + nút DarkMode) */}
        <header className={`h-16 flex items-center justify-between px-6 border-b ${
            darkMode ? 'bg-background border-border' : 'bg-white border-gray-200'
        }`}>
            <h2 className="font-semibold text-lg">Dashboard</h2>
            
            <div className="flex items-center gap-4">
                {/* Nút Toggle Dark Mode của teammate */}
                <button
                    onClick={toggleDarkMode}
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                    darkMode
                        ? 'bg-secondary hover:bg-secondary/80 text-amber-400'
                        : 'bg-gray-100 hover:bg-gray-200 text-amber-600'
                    }`}
                >
                    <span className="material-symbols-outlined text-[20px]">
                        {darkMode ? 'light_mode' : 'dark_mode'}
                    </span>
                </button>
                
                <span className="material-symbols-outlined text-gray-500 cursor-pointer">notifications</span>
            </div>
        </header>

        {/* Nội dung thay đổi (Dashboard, Users, v.v.) sẽ hiện ở đây */}
        <div className="flex-1 overflow-auto p-6">
            <Outlet /> 
        </div>

      </main>
    </div>
  );
};