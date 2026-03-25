import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useThemeStore } from '@/shared/zustand/themeStore';
import { userApi } from '../../../api/UserApi';
import { storeApi } from '../../../api/StoreApi';
import type { User, Role, CreateUserPayload } from '../../../api/UserApi';
import type { Store } from '../../../api/StoreApi';
import UpdateUserModal from '../components/UpdateUserModal';
import { ConfirmModal } from '../../manager/components/ui/Modal';

export const AccountManagement = () => {
    const { darkMode } = useThemeStore();

    // Data States
    const [users, setUsers] = useState<User[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [stores, setStores] = useState<Store[]>([]);

    // UI States
    const [isLoading, setIsLoading] = useState(true);
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    // Dropdown menu state
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [menuPosition, setMenuPosition] = useState<'up' | 'down'>('down');
    const buttonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

    // Form State
    const [newUser, setNewUser] = useState<CreateUserPayload>({
        username: '',
        password: '',
        fullName: '',
        email: '',
        roleId: '',
        storeId: ''
    });
    const ITEMS_PER_PAGE = 10;
    const [currentPage, setCurrentPage] = useState(1);
    const [confirmConfig, setConfirmConfig] = useState<{
        type: 'toggleStatus' | 'deleteUser';
        user: User | null;
    } | null>(null);
    const [confirmLoading, setConfirmLoading] = useState(false);

    const getRoleName = (roleId: any) => {
    if (typeof roleId === 'object' && roleId !== null) {
        return roleId.roleName || 'No Role';
    }
    return 'No Role';
    };

const fetchData = async () => {
    try {
        setIsLoading(true);
        const [usersData, rolesData, storesData] = await Promise.all([
            userApi.getAllUsers(),
            userApi.getAllRoles(),
            storeApi.getAllStores()
        ]);

        const allUsers = Array.isArray(usersData) ? usersData : [];
        
        // Lọc Admin ra để hiển thị table
        const filteredUsers = allUsers.filter((user) => user.roleId?.roleName !== 'Admin');
        setUsers(filteredUsers);

        // --- SỬA TẠI ĐÂY: Chỉ tính những user ĐANG HOẠT ĐỘNG ---
        const activeManager = allUsers.find(u => 
            u.roleId?.roleName === 'Manager' && u.isActive === true
        );
        const activeCoordinator = allUsers.find(u => 
            u.roleId?.roleName === 'Coordinator' && u.isActive === true
        );

        const rawRoles = Array.isArray(rolesData) ? rolesData : [];
        const selectableRoles = rawRoles.filter(role => {
            if (role.roleName === 'Admin') return false;
            
            // Nếu đã có Manager đang hoạt động -> ẩn khỏi dropdown
            if (role.roleName === 'Manager' && activeManager) return false;
            
            // Nếu đã có Coordinator đang hoạt động -> ẩn khỏi dropdown
            if (role.roleName === 'Coordinator' && activeCoordinator) return false;

            return true;
        });
        // -----------------------------------------------------

        setRoles(selectableRoles);
        setStores(Array.isArray(storesData) ? storesData : []);

        if (selectableRoles.length > 0) {
            setNewUser(prev => ({ ...prev, roleId: selectableRoles[0]._id }));
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
    const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedRoleId = e.target.value;
        const selectedRole = roles.find(r => r._id === selectedRoleId);
        const isStoreStaff = selectedRole?.roleName === 'StoreStaff';

        setNewUser(prev => ({
            ...prev,
            roleId: selectedRoleId,
            storeId: isStoreStaff ? prev.storeId : ''
        }));
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (!newUser.roleId) {
                toast.error('Vui lòng chọn vai trò');
                return;
            }
            await userApi.createUser(newUser);
            toast.success('Tạo tài khoản thành công!');
            setShowAddModal(false);
            fetchData();
            
            // Reset form
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
            toast.error(error.response?.data?.message || 'Không thể tạo tài khoản');
        }
    };

    // Dropdown position logic
    const handleToggleMenu = (e: React.MouseEvent<HTMLButtonElement>, userId: string, index: number) => {
        e.stopPropagation();

        if (openMenuId === userId) {
            setOpenMenuId(null);
        } else {
            // For last 2 rows, open dropdown upward
            if (index >= users.length - 2) {
                setMenuPosition('up');
            } else {
                setMenuPosition('down');
            }
            setOpenMenuId(userId);
        }
    };

    const performToggleStatus = async (user: User) => {
        try {
            setConfirmLoading(true);
            await userApi.updateUserStatus(user._id, !user.isActive);
            setUsers(users.map(u => u._id === user._id ? { ...u, isActive: !u.isActive } : u));
            toast.success(user.isActive ? 'Đã chuyển tài khoản sang trạng thái không hoạt động' : 'Đã kích hoạt tài khoản');
        } catch (error) {
            console.error(error);
            toast.error('Cannot update status');
        } finally {
            setConfirmLoading(false);
        }
    };

    const performDeleteUser = async (user: User) => {
        try {
            setConfirmLoading(true);
            await userApi.deleteUser(user._id);
            setUsers(users.filter(u => u._id !== user._id));
            toast.success('Đã xóa tài khoản.');
        } catch (error: any) {
            console.error(error);
            toast.error(error?.response?.data?.message || 'Không thể xóa tài khoản.');
        } finally {
            setConfirmLoading(false);
        }
    };

    const handleToggleStatus = (user: User) => {
        setOpenMenuId(null);
        setConfirmConfig({ type: 'toggleStatus', user });
    };

    const handleDeleteUser = (user: User) => {
        setOpenMenuId(null);
        setConfirmConfig({ type: 'deleteUser', user });
    };

    // Open Update Modal
    const handleEditUser = async (user: User) => {
        setOpenMenuId(null);
        try {
            const fresh = await userApi.getById(user._id);
            setSelectedUser(fresh ?? user);
        } catch {
            setSelectedUser(user);
        }
        setShowUpdateModal(true);
    };

    // Handle Update Submit
    const onUpdateUserSubmit = async (id: string, data: any) => {
        try {
            await userApi.updateUser(id, data);
            toast.success('Cập nhật tài khoản thành công!');
            setShowUpdateModal(false);
            fetchData();
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Không thể cập nhật tài khoản');
        }
    };
    const getRoleBadgeColor = (roleName: string | undefined) => {
        const safeRole = roleName || '';
        switch (safeRole) {
            case 'Admin': return 'bg-red-500 text-white border border-red-600';
            case 'Manager': return 'bg-purple-500 text-white border border-purple-600';
            case 'Coordinator': return 'bg-blue-500 text-white border border-blue-600';
            case 'KitchenStaff': return 'bg-orange-500 text-white border border-orange-600';
            case 'StoreStaff': return 'bg-emerald-500 text-white border border-emerald-600';
            default: return 'bg-slate-500 text-white border border-slate-600';
        }
    };

    const isStoreStaffSelected = () => {
        const role = roles.find(r => r._id === newUser.roleId);
        return role?.roleName === 'StoreStaff';
    };

    const handlePageChange = (next: number) => {
        const totalPages = Math.ceil(users.length / ITEMS_PER_PAGE) || 1;
        if (next < 1 || next > totalPages) return;
        setCurrentPage(next);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const getPageNumbers = () => {
        const totalPages = Math.ceil(users.length / ITEMS_PER_PAGE) || 1;
        const pages: (number | string)[] = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else if (currentPage <= 4) {
            pages.push(1, 2, 3, 4, 5, '...', totalPages);
        } else if (currentPage >= totalPages - 3) {
            pages.push(
                1,
                '...',
                totalPages - 4,
                totalPages - 3,
                totalPages - 2,
                totalPages - 1,
                totalPages
            );
        } else {
            pages.push(
                1,
                '...',
                currentPage - 1,
                currentPage,
                currentPage + 1,
                '...',
                totalPages
            );
        }
        return { pages, totalPages };
    };

    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const currentUsers = users.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    return (
        <div className={`space-y-6 ${darkMode ? 'text-foreground' : 'text-gray-900'}`}>
            {openMenuId && (
                <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)}></div>
            )}

            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Quản lý tài khoản</h2>
                    <p className="text-sm text-muted-foreground mt-1">Tổng số tài khoản: {users.length}</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg font-medium shadow-lg shadow-amber-600/20 transition-all"
                >
                    <span className="material-symbols-outlined text-[20px]">add</span>
                    Thêm tài khoản
                </button>
            </div>

            <div className={`rounded-xl border shadow-sm ${darkMode ? 'bg-card border-border' : 'bg-white border-orange-100'}`}>
                <div className="overflow-x-auto overflow-y-visible min-h-[400px]">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead className={`text-xs uppercase font-semibold ${darkMode ? 'bg-secondary/40 text-muted-foreground' : 'bg-orange-50 text-orange-700'}`}>
                            <tr>
                                <th className="px-6 py-4">Thông tin tài khoản</th>
                                <th className="px-6 py-4">Vai trò</th>
                                <th className="px-6 py-4">Cửa hàng</th>
                                <th className="px-6 py-4">Trạng thái</th>
                                <th className="px-6 py-4 text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {currentUsers.map((user, index) => (
                                <tr key={user._id} className={`group transition-colors border-b last:border-0 ${darkMode ? 'border-border hover:bg-secondary/40' : 'border-orange-100 hover:bg-orange-50/70'}`}>
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
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm ${getRoleBadgeColor(getRoleName(user.roleId))}`}>
                                            {getRoleName(user.roleId)}
                                        </span>
                                    </td>
                                    <td className={`px-6 py-4 font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                        {user.storeId?.storeName || 'Bếp trung tâm'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${user.isActive
                                                ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20'
                                                : 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
                                            }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${user.isActive ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                                            {user.isActive ? 'Đang hoạt động' : 'Không hoạt động'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right relative">
                                        <button
                                            ref={(el) => { buttonRefs.current[user._id] = el; }}
                                            onClick={(e) => handleToggleMenu(e, user._id, index)}
                                            className={`p-2 rounded-full transition-colors relative z-0 ${darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
                                        >
                                            <span className="material-symbols-outlined text-[20px]">more_vert</span>
                                        </button>

                                        {openMenuId === user._id && (
                                            <div className={`absolute right-8 z-50 w-40 rounded-lg shadow-xl border overflow-hidden animate-in fade-in zoom-in-95 duration-100 
                                                ${darkMode ? 'bg-[#25252A] border-gray-700' : 'bg-white border-gray-100'}
                                                ${menuPosition === 'up' ? 'bottom-full mb-1 origin-bottom-right' : 'top-full mt-1 origin-top-right'}
                                            `}>
                                                <div className="flex flex-col py-1">
                                                    <button
                                                        onClick={() => handleEditUser(user)}
                                                        className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left ${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'}`}
                                                    >
                                                        <span className="material-symbols-outlined text-[18px]">edit</span>
                                                        Cập nhật
                                                    </button>
                                                    <button
                                                        onClick={() => handleToggleStatus(user)}
                                                        className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left ${user.isActive ? (darkMode ? 'text-red-400 hover:bg-red-500/10' : 'text-red-600 hover:bg-red-50') : (darkMode ? 'text-green-400 hover:bg-green-500/10' : 'text-green-600 hover:bg-green-50')}`}
                                                    >
                                                        <span className="material-symbols-outlined text-[18px]">{user.isActive ? 'lock' : 'lock_open'}</span>
                                                        {user.isActive ? 'Chuyển không hoạt động' : 'Kích hoạt'}
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteUser(user)}
                                                        className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left ${darkMode ? 'text-red-400 hover:bg-red-500/10' : 'text-red-600 hover:bg-red-50'}`}
                                                    >
                                                        <span className="material-symbols-outlined text-[18px]">delete</span>
                                                        Xóa
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {users.length === 0 && !isLoading && (
                        <div className={`p-8 text-center ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Không tìm thấy tài khoản nào.</div>
                    )}
                </div>
            </div>

            {users.length > ITEMS_PER_PAGE && (
                <div className="mt-4 flex select-none items-center justify-end gap-2">
                    {(() => {
                        const { pages, totalPages } = getPageNumbers();
                        return (
                            <>
                                <button
                                    type="button"
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    className="flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:hover:bg-transparent"
                                >
                                    <span className="material-symbols-outlined text-[18px]">
                                        chevron_left
                                    </span>
                                    Trước
                                </button>
                                <div className="flex items-center gap-1">
                                    {pages.map((page, idx) =>
                                        page === '...' ? (
                                            <span
                                                key={`dots-${idx}`}
                                                className="px-2 text-xs text-muted-foreground"
                                            >
                                                ...
                                            </span>
                                        ) : (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => handlePageChange(page as number)}
                                                className={`h-8 min-w-[32px] rounded-lg px-2 text-xs font-semibold transition-all ${
                                                    currentPage === page
                                                        ? 'bg-amber-600 text-white shadow-sm'
                                                        : 'bg-gray-100 text-gray-600 hover:bg-amber-50 hover:text-amber-700 dark:bg-gray-800 dark:text-gray-300'
                                                }`}
                                            >
                                                {page}
                                            </button>
                                        )
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                    className="flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:hover:bg-transparent"
                                >
                                    Sau
                                    <span className="material-symbols-outlined text-[18px]">
                                        chevron_right
                                    </span>
                                </button>
                            </>
                        );
                    })()}
                </div>
            )}

            {/* Add User Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className={`w-full max-w-lg rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 ${darkMode ? 'bg-[#1C1C21] border border-gray-800' : 'bg-white'}`}>
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
                            <h3 className="font-bold text-lg">Tạo tài khoản mới</h3>
                            <button onClick={() => setShowAddModal(false)} className="text-gray-500 hover:text-red-500">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <form onSubmit={handleCreateUser} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={`block text-sm font-bold mb-1.5 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Họ và tên</label>
                                    <input 
                                        type="text" 
                                        required 
                                        placeholder="Nhập họ và tên"
                                        className={`w-full px-3 py-2 rounded-lg border outline-none focus:ring-2 focus:ring-amber-500 transition-colors ${darkMode ? 'bg-[#2A2A30] border-gray-700 text-white placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'}`}
                                        value={newUser.fullName} 
                                        onChange={e => setNewUser({ ...newUser, fullName: e.target.value })} 
                                    />
                                </div>
                                <div>
                                    <label className={`block text-sm font-bold mb-1.5 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Tên đăng nhập</label>
                                    <input 
                                        type="text" 
                                        required 
                                        placeholder="Nhập tên đăng nhập"
                                        className={`w-full px-3 py-2 rounded-lg border outline-none focus:ring-2 focus:ring-amber-500 transition-colors ${darkMode ? 'bg-[#2A2A30] border-gray-700 text-white placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'}`}
                                        value={newUser.username} 
                                        onChange={e => setNewUser({ ...newUser, username: e.target.value })} 
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <label className={`block text-sm font-bold mb-1.5 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Email</label>
                                <input 
                                    type="email" 
                                    required 
                                    placeholder="ví dụ: admin@kendo.com"
                                    className={`w-full px-3 py-2 rounded-lg border outline-none focus:ring-2 focus:ring-amber-500 transition-colors ${darkMode ? 'bg-[#2A2A30] border-gray-700 text-white placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'}`}
                                    value={newUser.email} 
                                    onChange={e => setNewUser({ ...newUser, email: e.target.value })} 
                                />
                            </div>
                            
                            <div>
                                <label className={`block text-sm font-bold mb-1.5 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Mật khẩu</label>
                                <input 
                                    type="password" 
                                    required 
                                    placeholder="Nhập mật khẩu (ít nhất 6 ký tự)"
                                    className={`w-full px-3 py-2 rounded-lg border outline-none focus:ring-2 focus:ring-amber-500 transition-colors ${darkMode ? 'bg-[#2A2A30] border-gray-700 text-white placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'}`}
                                    value={newUser.password} 
                                    onChange={e => setNewUser({ ...newUser, password: e.target.value })} 
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={`block text-sm font-bold mb-1.5 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Vai trò</label>
                                    <select 
                                        className={`w-full px-3 py-2 rounded-lg border outline-none focus:ring-2 focus:ring-amber-500 transition-colors ${darkMode ? 'bg-[#2A2A30] border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                                        value={newUser.roleId} 
                                        onChange={handleRoleChange} 
                                        required
                                    >
                                        <option value="" disabled>Chọn vai trò</option>
                                        {roles.map(role => (<option key={role._id} value={role._id}>{role.roleName}</option>))}
                                    </select>
                                </div>
                                <div>
                                    <label className={`block text-sm font-bold mb-1.5 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Cửa hàng</label>
                                    <select 
                                        className={`w-full px-3 py-2 rounded-lg border outline-none focus:ring-2 focus:ring-amber-500 transition-colors ${
                                            !isStoreStaffSelected() 
                                                ? (darkMode ? 'opacity-50 cursor-not-allowed bg-gray-800 text-gray-400 border-gray-700' : 'opacity-60 cursor-not-allowed bg-gray-100 text-gray-500 border-gray-300')
                                                : (darkMode ? 'bg-[#2A2A30] border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900')
                                        }`}
                                        value={newUser.storeId} 
                                        onChange={e => setNewUser({ ...newUser, storeId: e.target.value })} 
                                        disabled={!isStoreStaffSelected()}
                                    >
                                        {!isStoreStaffSelected() ? (<option value="">Bếp trung tâm (HQ)</option>) : (<option value="">-- Chọn cửa hàng --</option>)}
                                        {stores.map(store => (<option key={store._id} value={store._id}>{store.storeName || store.name || store._id}</option>))}
                                    </select>
                                </div>
                            </div>

                            <div className={`pt-4 flex justify-end gap-3 border-t mt-6 ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                                <button type="button" onClick={() => setShowAddModal(false)} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${darkMode ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'}`}>Hủy</button>
                                <button type="submit" className="px-6 py-2 rounded-lg text-sm font-bold bg-amber-600 text-white hover:bg-amber-700 shadow-lg shadow-amber-600/20 transition-all active:scale-95">Tạo tài khoản</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            <UpdateUserModal
                isOpen={showUpdateModal}
                onClose={() => setShowUpdateModal(false)}
                onUpdate={onUpdateUserSubmit}
                user={selectedUser}
                roles={roles}
                stores={stores}
                darkMode={darkMode}
            />
            <ConfirmModal
                isOpen={!!confirmConfig}
                onClose={() => setConfirmConfig(null)}
                onConfirm={async () => {
                    if (!confirmConfig || !confirmConfig.user) return;
                    if (confirmConfig.type === 'toggleStatus') {
                        await performToggleStatus(confirmConfig.user);
                    } else {
                        await performDeleteUser(confirmConfig.user);
                    }
                    setConfirmConfig(null);
                }}
                title={
                    confirmConfig?.type === 'toggleStatus'
                        ? confirmConfig.user?.isActive
                            ? 'Ngừng kích hoạt tài khoản?'
                            : 'Kích hoạt tài khoản?'
                        : 'Xóa tài khoản?'
                }
                message={
                    confirmConfig?.type === 'toggleStatus'
                        ? `Bạn có chắc muốn ${confirmConfig.user?.isActive ? 'ngừng kích hoạt' : 'kích hoạt'} tài khoản "${confirmConfig.user?.fullName}" (@${confirmConfig.user?.username})?`
                        : `Xóa tài khoản "${confirmConfig?.user?.fullName}" (@${confirmConfig?.user?.username})? Thao tác này sẽ ẩn tài khoản khỏi hệ thống.`
                }
                confirmLabel={
                    confirmConfig?.type === 'toggleStatus'
                        ? confirmConfig.user?.isActive
                            ? 'Ngừng kích hoạt'
                            : 'Kích hoạt'
                        : 'Xóa'
                }
                variant={confirmConfig?.type === 'deleteUser' ? 'danger' : 'default'}
                loading={confirmLoading}
            />
        </div>
    );
};