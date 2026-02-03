import React, { useEffect, useState } from 'react';
import type { User, Role, UpdateUserPayload } from '../../../api/UserApi';
import type { Store } from '../../../api/StoreApi';

interface UpdateUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpdate: (id: string, data: any) => Promise<void>;
    user: User | null;
    roles: Role[];
    stores: Store[];
    darkMode: boolean;
}

const UpdateUserModal = ({ isOpen, onClose, onUpdate, user, roles, stores, darkMode }: UpdateUserModalProps) => {
    // Form state for update
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        roleId: '',
        storeId: '',
        password: '',
        isActive: true
    });

    // Update form when user changes
    useEffect(() => {
        if (user) {
            setFormData({
                fullName: user.fullName || '',
                email: user.email || '',
                roleId: user.roleId?._id || '',
                storeId: user.storeId?._id || '',
                password: '',
                isActive: user.isActive
            });
        }
    }, [user]);

    if (!isOpen || !user) return null;

    // Check if StoreStaff role is selected
    const isStoreStaffSelected = () => {
        const role = roles.find(r => r._id === formData.roleId);
        return role?.roleName === 'StoreStaff';
    };

    const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedRoleId = e.target.value;
        const selectedRole = roles.find(r => r._id === selectedRoleId);
        const isStaff = selectedRole?.roleName === 'StoreStaff';

        setFormData(prev => ({
            ...prev,
            roleId: selectedRoleId,
            storeId: isStaff ? prev.storeId : ''
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Create payload, remove empty password
        const payload: any = { ...formData };
        if (!payload.password) delete payload.password;
        
        onUpdate(user._id, payload);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className={`w-full max-w-lg rounded-xl shadow-2xl overflow-hidden ${darkMode ? 'bg-[#1C1C21] border border-gray-800' : 'bg-white'}`}>
                {/* HEADER */}
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
                    <h3 className="font-bold text-lg">Update Account: <span className="text-amber-600">{user.username}</span></h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-red-500">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* FORM */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Full Name</label>
                            <input type="text" required
                                className="w-full px-3 py-2 rounded-lg border bg-transparent outline-none focus:ring-2 focus:ring-amber-500 dark:border-gray-700"
                                value={formData.fullName}
                                onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1.5">Email</label>
                        <input type="email" required
                            className="w-full px-3 py-2 rounded-lg border bg-transparent outline-none focus:ring-2 focus:ring-amber-500 dark:border-gray-700"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1.5">New Password <span className="text-xs text-gray-500 font-normal">(Leave blank to keep current)</span></label>
                        <input type="password"
                            placeholder="••••••••"
                            className="w-full px-3 py-2 rounded-lg border bg-transparent outline-none focus:ring-2 focus:ring-amber-500 dark:border-gray-700"
                            value={formData.password}
                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Role</label>
                            <select
                                className="w-full px-3 py-2 rounded-lg border bg-transparent outline-none focus:ring-2 focus:ring-amber-500 dark:border-gray-700 dark:bg-[#1C1C21]"
                                value={formData.roleId}
                                onChange={handleRoleChange}
                                required
                            >
                                <option value="" disabled>Select Role</option>
                                {roles.map(role => (
                                    <option key={role._id} value={role._id}>{role.roleName}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Store</label>
                            <select
                                className={`w-full px-3 py-2 rounded-lg border bg-transparent outline-none focus:ring-2 focus:ring-amber-500 dark:border-gray-700 dark:bg-[#1C1C21] ${!isStoreStaffSelected() ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800' : ''}`}
                                value={formData.storeId}
                                onChange={e => setFormData({ ...formData, storeId: e.target.value })}
                                disabled={!isStoreStaffSelected()}
                            >
                                {!isStoreStaffSelected() ? (<option value="">Central Kitchen (HQ)</option>) : (<option value="">-- Select a Store --</option>)}
                                {stores.map(store => (
                                    <option key={store._id} value={store._id}>{store.storeName}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button type="button" onClick={onClose}
                            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">
                            Cancel
                        </button>
                        <button type="submit"
                            className="px-6 py-2 rounded-lg text-sm font-medium bg-amber-600 text-white hover:bg-amber-700 shadow-lg shadow-amber-600/20">
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default UpdateUserModal;