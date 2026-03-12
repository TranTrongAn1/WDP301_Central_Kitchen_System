import { useState, useEffect } from 'react';
import { Loader2, Plus, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { supplierApi, type Supplier, type CreateSupplierRequest } from '@/api/SupplierApi';
import { useManagerReadOnly } from '@/shared/hooks/useManagerReadOnly';
import toast from 'react-hot-toast';

export default function SuppliersPage() {
  const { isManagerReadOnly, user } = useManagerReadOnly();
  const isAdmin = user?.role === 'Admin';

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState<'create' | 'edit' | null>(null);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState<CreateSupplierRequest>({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
  });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [permanentDeletingId, setPermanentDeletingId] = useState<string | null>(null);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const res = await supplierApi.getAll();
      const data = (res as any)?.data ?? res ?? [];
      setSuppliers(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Không tải được danh sách nhà cung cấp.');
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const openCreate = () => {
    if (isManagerReadOnly) return;
    setEditing(null);
    setForm({ name: '', contactPerson: '', phone: '', email: '', address: '' });
    setModalOpen('create');
  };

  const openEdit = (s: Supplier) => {
    if (isManagerReadOnly) return;
    setEditing(s);
    setForm({
      name: s.name,
      contactPerson: s.contactPerson ?? '',
      phone: s.phone,
      email: s.email,
      address: s.address,
    });
    setModalOpen('edit');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isManagerReadOnly) {
      toast.error('Manager chỉ được xem, không được chỉnh sửa nhà cung cấp.');
      return;
    }
    if (!form.name.trim() || !form.phone.trim() || !form.email.trim()) {
      toast.error('Điền đủ Tên, SĐT, Email.');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await supplierApi.update(editing._id, form);
        toast.success('Đã cập nhật nhà cung cấp.');
      } else {
        await supplierApi.create(form);
        toast.success('Đã thêm nhà cung cấp.');
      }
      setModalOpen(null);
      setEditing(null);
      fetchSuppliers();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Lỗi lưu.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (isManagerReadOnly) {
      toast.error('Manager không được phép xóa nhà cung cấp.');
      return;
    }
    if (!window.confirm('Xóa nhà cung cấp này? (soft-delete)')) return;
    setDeletingId(id);
    try {
      await supplierApi.delete(id);
      toast.success('Đã xóa.');
      setSuppliers((prev) => prev.filter((s) => s._id !== id));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Không xóa được.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeletePermanent = async (id: string) => {
    if (isManagerReadOnly) {
      toast.error('Manager không được phép xóa vĩnh viễn nhà cung cấp.');
      return;
    }
    if (!window.confirm('XÓA VĨNH VIỄN nhà cung cấp? Không thể khôi phục.')) return;
    setPermanentDeletingId(id);
    try {
      await supplierApi.deletePermanent(id);
      toast.success('Đã xóa vĩnh viễn.');
      setSuppliers((prev) => prev.filter((s) => s._id !== id));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Không xóa được.');
    } finally {
      setPermanentDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[320px] gap-2 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin" /> Đang tải...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nhà cung cấp</h1>
          <p className="text-sm text-muted-foreground mt-1">Tổng: {suppliers.length}</p>
        </div>
        <Button onClick={openCreate} disabled={isManagerReadOnly}>
          <Plus className="w-4 h-4 mr-2" /> Thêm nhà cung cấp
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-3 font-semibold">Tên</th>
                  <th className="px-4 py-3 font-semibold">Liên hệ</th>
                  <th className="px-4 py-3 font-semibold">SĐT / Email</th>
                  <th className="px-4 py-3 font-semibold">Địa chỉ</th>
                  <th className="px-4 py-3 font-semibold text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((s) => (
                  <tr key={s._id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{s.name}</td>
                    <td className="px-4 py-3">{s.contactPerson || '—'}</td>
                    <td className="px-4 py-3">{s.phone} · {s.email}</td>
                    <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">{s.address || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(s)}
                        disabled={isManagerReadOnly}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        disabled={isManagerReadOnly || deletingId === s._id}
                        onClick={() => handleDelete(s._id)}
                      >
                        {deletingId === s._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </Button>
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          disabled={permanentDeletingId === s._id}
                          onClick={() => handleDeletePermanent(s._id)}
                          title="Xóa vĩnh viễn (chỉ Admin)"
                        >
                          {permanentDeletingId === s._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
                        </Button>
                      )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {suppliers.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">Chưa có nhà cung cấp.</div>
          )}
        </CardContent>
      </Card>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !saving && setModalOpen(null)}>
          <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <CardContent className="p-6">
              <h2 className="text-lg font-bold mb-4">{editing ? 'Sửa nhà cung cấp' : 'Thêm nhà cung cấp'}</h2>
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Tên *</label>
                  <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Người liên hệ</label>
                  <Input value={form.contactPerson} onChange={(e) => setForm((p) => ({ ...p, contactPerson: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Số điện thoại *</label>
                  <Input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email *</label>
                  <Input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Địa chỉ *</label>
                  <Input value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} required />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setModalOpen(null)} disabled={saving}>Hủy</Button>
                  <Button type="submit" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu'}</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
