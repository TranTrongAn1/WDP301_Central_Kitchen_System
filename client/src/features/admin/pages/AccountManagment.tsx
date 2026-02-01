import { useEffect, useRef, useState } from 'react';
import { useThemeStore } from '@/shared/zustand/themeStore';
import { userApi } from '../../../api/UserApi';
import type { User, Role, Store, CreateUserPayload } from '../../../api/UserApi';

export const AccountManagement = () => {
    const { darkMode } = useThemeStore();

    // Data States
    const [users, setUsers] = useState<User[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [stores, setStores] = useState<Store[]>([]);

    // UI States
    const [isLoading, setIsLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    // State quản lý Dropdown menu (Lưu _id của user đang mở menu)
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [menuPosition, setMenuPosition] = useState<'up' | 'down'>('down'); // State xác định hướng mở
    const buttonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({}); // Ref để lấy vị trí nút

    // Form State (Create)
    const [newUser, setNewUser] = useState<CreateUserPayload>({
        username: '',
        password: '',
        fullName: '',
        email: '',
        roleId: '',
        storeId: ''
    });

    // --- FETCH DATA ---
    const fetchData = async () => {
        try {
            setIsLoading(true);
            const [usersData, rolesData, storesData] = await Promise.all([
                userApi.getAllUsers(),
                userApi.getAllRoles(),
                userApi.getAllStores()
            ]);

            setUsers(Array.isArray(usersData) ? usersData : []);
            setRoles(Array.isArray(rolesData) ? rolesData : []);
            setStores(Array.isArray(storesData) ? storesData : []);

            if (rolesData && rolesData.length > 0) {
                setNewUser(prev => ({ ...prev, roleId: rolesData[0]._id }));
            }
        } catch (error) {
            console.error("Failed to fetch data", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // --- HANDLERS ---
    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (!newUser.roleId) {
                alert('Please select a role');
                return;
            }

            await userApi.createUser(newUser);
            alert('User created successfully!');
            setShowAddModal(false);
            fetchData();

            setNewUser({
                username: '',
                password: '',
                fullName: '',
                email: '',
                roleId: roles[0]?._id || '',
                storeId: ''
            });
        } catch (error: any) {
            console.error(error);
            alert(error.response?.data?.message || 'Failed to create user');
        }
    };
// Logic mở menu thông minh
    const handleToggleMenu = (e: React.MouseEvent<HTMLButtonElement>, userId: string) => {
        e.stopPropagation();

        if (openMenuId === userId) {
            setOpenMenuId(null); // Đang mở thì đóng lại
        } else {
            // Tính toán vị trí
            const buttonRect = e.currentTarget.getBoundingClientRect();
            const spaceBelow = window.innerHeight - buttonRect.bottom;
            const menuHeightEstimate = 220; // Chiều cao ước lượng của menu (px)

            // Nếu khoảng trống bên dưới < chiều cao menu -> Mở lên trên ('up')
            if (spaceBelow < menuHeightEstimate) {
                setMenuPosition('up');
            } else {
                setMenuPosition('down');
            }
            
            setOpenMenuId(userId);
        }
    };
    const handleToggleStatus = async (user: User) => {
        // Đóng menu sau khi chọn
        setOpenMenuId(null);
        
        if (!window.confirm(`Are you sure you want to ${user.isActive ? 'deactivate' : 'activate'} this user?`)) return;
        
        try {
            await userApi.updateUserStatus(user._id, !user.isActive);
            setUsers(users.map(u => u._id === user._id ? { ...u, isActive: !u.isActive } : u));
        } catch (error) {
            alert('Cannot update status');
        }
    };

    const handleEditUser = (user: User) => {
        setOpenMenuId(null); // Đóng menu
        setSelectedUser(user);
        alert(`Open Edit Modal for user: ${user.username}`); 
    };

    // --- UI HELPERS ---
    const getRoleBadgeColor = (roleName: string | undefined) => {
        const safeRole = roleName || '';
        switch (safeRole) {
            case 'Admin': return 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300';
            case 'Manager': return 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300';
            case 'Coordinator': return 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300';
            case 'KitchenStaff': return 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300';
            case 'StoreStaff': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300';
            default: return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
        }
    };

    return (
        <div className={`space-y-6 ${darkMode ? 'text-foreground' : 'text-gray-900'}`}>

            {/* Invisible Backdrop để đóng menu khi click ra ngoài */}
{openMenuId && (
                <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)}></div>
            )}

            {/* HEADER */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">User Management</h2>
                    <p className="text-sm text-muted-foreground mt-1">Total Users: {users.length}</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg font-medium shadow-lg shadow-amber-600/20 transition-all"
                >
                    <span className="material-symbols-outlined text-[20px]">add</span>
                    Add User
                </button>
            </div>

{/* TABLE CONTAINER */}
            {/* Quan trọng: overflow-visible hoặc min-h đủ lớn để menu không bị cắt */}
            <div className={`rounded-xl border shadow-sm ${darkMode ? 'bg-[#1C1C21] border-gray-800' : 'bg-white border-gray-200'}`}>
                {/* overflow-x-auto để scroll ngang nếu bảng quá rộng, nhưng overflow-y-visible để menu chòi ra ngoài */}
                <div className="overflow-x-auto overflow-y-visible min-h-[400px]"> 
                    <table className="w-full text-sm text-left border-collapse"> 
                        <thead className={`text-xs uppercase font-semibold ${darkMode ? 'bg-gray-800/50 text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
                            <tr>
                                {/* ... Giữ nguyên các thẻ th ... */}
                                <th className="px-6 py-4">User Info</th>
                                <th className="px-6 py-4">Role</th>
                                <th className="px-6 py-4">Store</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {users.map((user) => (
                                <tr key={user._id} className={`group transition-colors border-b last:border-0 ${darkMode ? 'border-gray-800 hover:bg-gray-800/30' : 'border-gray-100 hover:bg-gray-50'}`}>
                                    
                                    {/* User Info */}
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shadow-sm ${darkMode ? 'bg-gray-800 text-amber-500' : 'bg-white text-amber-600 border border-gray-100'}`}>
                                                {user.fullName?.charAt(0) || user.username.charAt(0)}
                                            </div>
                                            <div>
                                                <div className={`font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>{user.fullName}</div>
                                                <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>@{user.username} | {user.email}</div>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Role */}
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm ${getRoleBadgeColor(user.roleId?.roleName)}`}>
                                            {user.roleId?.roleName || 'No Role'}
                                        </span>
                                    </td>

                                    {/* Store */}
                                    <td className={`px-6 py-4 font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                        {user.storeId?.storeName || '-'}
                                    </td>

                                    {/* Status Badge */}
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                                            user.isActive 
                                                ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20' 
                                                : 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
                                        }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${user.isActive ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                                            {user.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>

                                    {/* Actions Dropdown */}
                                    <td className="px-6 py-4 text-right relative">
                                        <button 
                                            // Gán ref vào map (nếu cần dùng sau này)
                                            ref={(el) => {buttonRefs.current[user._id] = el}}
                                            onClick={(e) => handleToggleMenu(e, user._id)}
                                            className={`p-2 rounded-full transition-colors relative z-0 ${darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
                                        >
                                            <span className="material-symbols-outlined text-[20px]">more_vert</span>
                                        </button>

                                        {/* Dropdown Menu */}
                                        {openMenuId === user._id && (
                                            <div 
                                                className={`absolute right-8 z-50 w-40 rounded-lg shadow-xl border overflow-hidden animate-in fade-in zoom-in-95 duration-100 
                                                ${darkMode ? 'bg-[#25252A] border-gray-700' : 'bg-white border-gray-100'}
                                                
                                                /* LOGIC ĐỊNH VỊ CSS */
                                                ${menuPosition === 'up' 
                                                    ? 'bottom-full mb-2 origin-bottom-right' // Mở lên trên + cách ra 1 chút (mb-2)
                                                    : 'top-full mt-2 origin-top-right'       // Mở xuống dưới + cách ra 1 chút (mt-2)
                                                }
                                                `}
                                            >
                                                <div className="flex flex-col py-1">
                                                    <button 
                                                        onClick={() => handleEditUser(user)}
                                                        className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left ${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'}`}
                                                    >
                                                        <span className="material-symbols-outlined text-[18px]">edit</span>
                                                        Update
                                                    </button>
                                                    <button 
                                                        onClick={() => handleToggleStatus(user)}
                                                        className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left ${user.isActive ? (darkMode ? 'text-red-400 hover:bg-red-500/10' : 'text-red-600 hover:bg-red-50') : (darkMode ? 'text-green-400 hover:bg-green-500/10' : 'text-green-600 hover:bg-green-50')}`}
                                                    >
                                                        <span className="material-symbols-outlined text-[18px]">{user.isActive ? 'lock' : 'lock_open'}</span>
                                                        {user.isActive ? 'Inactive' : 'Active'}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     {/* Empty State */}
                     {users.length === 0 && !isLoading && (
                         <div className={`p-8 text-center ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>No users found.</div>
                    )}
                </div>
            </div>

            {/* --- MODAL ADD USER (Giữ nguyên) --- */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className={`w-full max-w-lg rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 ${darkMode ? 'bg-[#1C1C21] border border-gray-800' : 'bg-white'}`}>
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
                            <h3 className="font-bold text-lg">Create New Account</h3>
                            <button onClick={() => setShowAddModal(false)} className="text-gray-500 hover:text-red-500">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <form onSubmit={handleCreateUser} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">Full Name</label>
                                    <input type="text" required
                                        className="w-full px-3 py-2 rounded-lg border bg-transparent outline-none focus:ring-2 focus:ring-amber-500 dark:border-gray-700"
                                        value={newUser.fullName}
                                        onChange={e => setNewUser({ ...newUser, fullName: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">Username</label>
                                    <input type="text" required
                                        className="w-full px-3 py-2 rounded-lg border bg-transparent outline-none focus:ring-2 focus:ring-amber-500 dark:border-gray-700"
                                        value={newUser.username}
                                        onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1.5">Email</label>
                                <input type="email" required
                                    className="w-full px-3 py-2 rounded-lg border bg-transparent outline-none focus:ring-2 focus:ring-amber-500 dark:border-gray-700"
                                    value={newUser.email}
                                    onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1.5">Password</label>
                                <input type="password" required
                                    className="w-full px-3 py-2 rounded-lg border bg-transparent outline-none focus:ring-2 focus:ring-amber-500 dark:border-gray-700"
                                    value={newUser.password}
                                    onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">Role</label>
                                    <select
                                        className="w-full px-3 py-2 rounded-lg border bg-transparent outline-none focus:ring-2 focus:ring-amber-500 dark:border-gray-700 dark:bg-[#1C1C21]"
                                        value={newUser.roleId}
                                        onChange={e => setNewUser({ ...newUser, roleId: e.target.value })}
                                        required
                                    >
                                        <option value="" disabled>Select Role</option>
                                        {roles.map(role => (
                                            <option key={role._id} value={role._id}>{role.roleName}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">Store (Optional)</label>
                                    <select
                                        className="w-full px-3 py-2 rounded-lg border bg-transparent outline-none focus:ring-2 focus:ring-amber-500 dark:border-gray-700 dark:bg-[#1C1C21]"
                                        value={newUser.storeId}
                                        onChange={e => setNewUser({ ...newUser, storeId: e.target.value })}
                                    >
                                        <option value="">No Store</option>
                                        {stores.map(store => (
                                            <option key={store._id} value={store._id}>{store.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <button type="button" onClick={() => setShowAddModal(false)}
                                    className="px-4 py-2 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">
                                    Cancel
                                </button>
                                <button type="submit"
                                    className="px-6 py-2 rounded-lg text-sm font-medium bg-amber-600 text-white hover:bg-amber-700 shadow-lg shadow-amber-600/20">
                                    Create Account
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};