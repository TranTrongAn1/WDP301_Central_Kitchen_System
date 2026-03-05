import { useEffect, useRef, useState } from 'react';
import { useThemeStore } from '@/shared/zustand/themeStore';
import { userApi } from '@/api/UserApi';
import { storeApi } from '@/api/StoreApi';
import type { User, Role, CreateUserPayload } from '@/api/UserApi';
import type { Store } from '@/api/StoreApi';
import UpdateUserModal from '@/features/admin/components/UpdateUserModal';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

const ITEMS_PER_PAGE = 10;

export default function UsersRolesPage() {
  const { darkMode } = useThemeStore();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<'up' | 'down'>('down');
  const buttonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const [newUser, setNewUser] = useState<CreateUserPayload>({
    username: '',
    password: '',
    fullName: '',
    email: '',
    roleId: '',
    storeId: '',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const getRoleName = (roleId: any) =>
    typeof roleId === 'object' && roleId !== null ? roleId.roleName || 'No Role' : 'No Role';

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [usersData, rolesData, storesData] = await Promise.all([
        userApi.getAllUsers(),
        userApi.getAllRoles(),
        storeApi.getAllStores(),
      ]);
      const filteredUsers = Array.isArray(usersData)
        ? usersData.filter((u: any) => u.roleId?.roleName !== 'Admin')
        : [];
      setUsers(filteredUsers);
      const rawRoles = Array.isArray(rolesData) ? rolesData : [];
      setRoles(rawRoles.filter((r: Role) => r.roleName !== 'Admin'));
      setStores(Array.isArray(storesData) ? storesData : []);
      if (rawRoles.filter((r: Role) => r.roleName !== 'Admin').length > 0) {
        setNewUser((prev) => ({
          ...prev,
          roleId: rawRoles.find((r: Role) => r.roleName !== 'Admin')?._id || '',
        }));
      }
    } catch (error) {
      console.error('Failed to fetch data', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedRoleId = e.target.value;
    const selectedRole = roles.find((r) => r._id === selectedRoleId);
    const isStoreStaff = selectedRole?.roleName === 'StoreStaff';
    setNewUser((prev) => ({
      ...prev,
      roleId: selectedRoleId,
      storeId: isStoreStaff ? prev.storeId : '',
    }));
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.roleId) {
      alert('Vui lòng chọn role.');
      return;
    }
    try {
      await userApi.createUser(newUser);
      alert('Tạo tài khoản thành công.');
      setShowAddModal(false);
      fetchData();
      setNewUser({
        username: '',
        password: '',
        fullName: '',
        email: '',
        roleId: roles[0]?._id || '',
        storeId: '',
      });
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Tạo tài khoản thất bại.');
    }
  };

  const handleToggleMenu = (e: React.MouseEvent<HTMLButtonElement>, userId: string, index: number) => {
    e.stopPropagation();
    if (openMenuId === userId) setOpenMenuId(null);
    else {
      setMenuPosition(index >= users.length - 2 ? 'up' : 'down');
      setOpenMenuId(userId);
    }
  };

  const handleToggleStatus = async (user: User) => {
    setOpenMenuId(null);
    if (!window.confirm(`${user.isActive ? 'Vô hiệu hóa' : 'Kích hoạt'} tài khoản "${user.fullName}"?`)) return;
    try {
      await userApi.updateUserStatus(user._id, !user.isActive);
      setUsers(users.map((u) => (u._id === user._id ? { ...u, isActive: !u.isActive } : u)));
    } catch {
      alert('Không thể cập nhật trạng thái.');
    }
  };

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

  const onUpdateUserSubmit = async (id: string, data: any) => {
    try {
      await userApi.updateUser(id, data);
      alert('Cập nhật thành công.');
      setShowUpdateModal(false);
      fetchData();
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Cập nhật thất bại.');
    }
  };

  const getRoleBadgeColor = (roleName: string | undefined) => {
    const s = roleName || '';
    if (s === 'Manager') return 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300';
    if (s === 'Coordinator') return 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300';
    if (s === 'KitchenStaff') return 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300';
    if (s === 'StoreStaff') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300';
    return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
  };

  const isStoreStaffSelected = () => roles.find((r) => r._id === newUser.roleId)?.roleName === 'StoreStaff';

  const filteredUsers = users.filter(
    (u) =>
      (u.fullName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.username || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(searchQuery.toLowerCase())
  );
  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentUsers = filteredUsers.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handlePageChange = (next: number) => {
    if (next < 1 || next > totalPages) return;
    setCurrentPage(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[320px] text-muted-foreground">
        Đang tải...
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${darkMode ? 'text-foreground' : 'text-gray-900'}`}>
      {openMenuId && <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users & Roles</h1>
          <p className="text-sm text-muted-foreground mt-1">Tổng: {filteredUsers.length} user (không bao gồm Admin)</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="bg-amber-600 hover:bg-amber-700">
          Thêm user
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative max-w-xs mb-4">
            <Input
              placeholder="Tìm theo tên, username, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground material-symbols-outlined text-[18px]">search</span>
          </div>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm text-left">
              <thead className={`text-xs uppercase font-semibold ${darkMode ? 'bg-gray-800/50 text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Store</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {currentUsers.map((user, index) => (
                  <tr key={user._id} className={`border-b last:border-0 ${darkMode ? 'border-gray-800 hover:bg-gray-800/30' : 'hover:bg-gray-50'}`}>
                    <td className="px-4 py-3">
                      <div className="font-medium">{user.fullName}</div>
                      <div className="text-xs text-muted-foreground">@{user.username} · {user.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(getRoleName(user.roleId))}`}>
                        {getRoleName(user.roleId)}
                      </span>
                    </td>
                    <td className="px-4 py-3">{user.storeId?.storeName || user.storeId?.name || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={user.isActive ? 'text-green-600' : 'text-gray-500'}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right relative">
                      <button
                        ref={(el) => { buttonRefs.current[user._id] = el; }}
                        onClick={(e) => handleToggleMenu(e, user._id, index)}
                        className="p-2 rounded-full hover:bg-secondary"
                      >
                        <span className="material-symbols-outlined text-[20px]">more_vert</span>
                      </button>
                      {openMenuId === user._id && (
                        <div
                          className={`absolute right-0 z-50 w-36 rounded-lg border shadow-lg py-1 ${darkMode ? 'bg-[#25252A] border-gray-700' : 'bg-white border-gray-200'}`}
                          style={{ [menuPosition === 'up' ? 'bottom' : 'top']: '100%', marginTop: menuPosition === 'up' ? 0 : 4, marginBottom: menuPosition === 'up' ? 4 : 0 }}
                        >
                          <button
                            type="button"
                            onClick={() => handleEditUser(user)}
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-secondary"
                          >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                            Sửa
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(user)}
                            className={`flex w-full items-center gap-2 px-3 py-2 text-sm ${user.isActive ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}
                          >
                            <span className="material-symbols-outlined text-[18px]">{user.isActive ? 'lock' : 'lock_open'}</span>
                            {user.isActive ? 'Vô hiệu hóa' : 'Kích hoạt'}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredUsers.length === 0 && (
            <div className="py-8 text-center text-muted-foreground">Không có user nào.</div>
          )}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>
                Trước
              </Button>
              <span className="text-sm text-muted-foreground">
                {currentPage} / {totalPages}
              </span>
              <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}>
                Sau
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <Card className="w-full max-w-lg">
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold">Thêm user</h2>
                <button type="button" onClick={() => setShowAddModal(false)} className="text-muted-foreground hover:text-foreground">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Họ tên *</label>
                    <Input value={newUser.fullName} onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Username *</label>
                    <Input value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} required />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email *</label>
                  <Input type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Mật khẩu *</label>
                  <Input type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Role *</label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={newUser.roleId}
                      onChange={handleRoleChange}
                      required
                    >
                      <option value="">Chọn role</option>
                      {roles.map((r) => (
                        <option key={r._id} value={r._id}>{r.roleName}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Cửa hàng</label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
                      value={newUser.storeId || ''}
                      onChange={(e) => setNewUser({ ...newUser, storeId: e.target.value })}
                      disabled={!isStoreStaffSelected()}
                    >
                      <option value="">—</option>
                      {stores.map((s) => (
                        <option key={s._id} value={s._id}>{s.storeName || s.name || s._id}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>Hủy</Button>
                  <Button type="submit" className="bg-amber-600 hover:bg-amber-700">Tạo</Button>
                </div>
              </form>
            </CardContent>
          </Card>
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
    </div>
  );
}
