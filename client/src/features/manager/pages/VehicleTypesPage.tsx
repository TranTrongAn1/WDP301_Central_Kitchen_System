import { useState, useEffect } from 'react';
import { Loader2, Plus, Pencil, Trash2 } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import vehicleApi, {
  type VehicleType,
  type VehicleTypeInput,
} from '@/api/VehicleApi';
import toast from 'react-hot-toast';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';

export default function VehicleTypesPage() {
  const [list, setList] = useState<VehicleType[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState<'create' | 'edit' | null>(null);
  const [editing, setEditing] = useState<VehicleType | null>(null);
  const [form, setForm] = useState<VehicleTypeInput>({
    name: '',
    description: '',
    isActive: true,
    capacity: undefined,
    unit: 'kg',
  });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchList = async () => {
    try {
      setLoading(true);
      const res = await vehicleApi.getAll();
      const data = (res as any)?.data ?? res ?? [];
      setList(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Không tải được danh sách loại xe.');
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', description: '', isActive: true, capacity: undefined, unit: 'kg' });
    setModalOpen('create');
  };

  const openEdit = (v: VehicleType) => {
    setEditing(v);
    setForm({
      name: v.name,
      description: v.description ?? '',
      isActive: v.isActive ?? true,
      capacity: v.capacity,
      unit: v.unit ?? 'kg',
    });
    setModalOpen('edit');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Nhập tên loại xe.');
      return;
    }
    if (form.capacity != null && (isNaN(form.capacity) || form.capacity <= 0)) {
      toast.error('Sức chở tối đa phải là số lớn hơn 0.');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await vehicleApi.update(editing._id, form);
        toast.success('Đã cập nhật loại xe.');
      } else {
        await vehicleApi.create(form);
        toast.success('Đã thêm loại xe.');
      }
      setModalOpen(null);
      setEditing(null);
      fetchList();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Lỗi lưu.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Xóa loại xe này?')) return;
    setDeletingId(id);
    try {
      await vehicleApi.delete(id);
      toast.success('Đã xóa.');
      setList((prev) => prev.filter((v) => v._id !== id));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Không xóa được.');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[320px] gap-2 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>Đang tải...</span>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-xl font-semibold">Loại xe</h1>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          Thêm loại xe
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 font-medium">Tên</th>
                  <th className="px-4 py-3 font-medium">Mô tả</th>
                  <th className="px-4 py-3 font-medium">Sức chở tối đa</th>
                  <th className="px-4 py-3 font-medium">Trạng thái</th>
                  <th className="px-4 py-3 text-right font-medium">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {list.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      Chưa có loại xe. Thêm loại xe để chọn khi tạo chuyến giao.
                    </td>
                  </tr>
                ) : (
                  list.map((v) => (
                    <tr key={v._id} className="border-b last:border-0">
                      <td className="px-4 py-3">{v.name}</td>
                      <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">
                        {v.description || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {v.capacity != null && v.unit ? (
                          v.unit === 'kg' ? `${v.capacity} kg` :
                          v.unit === 'ton' ? `${v.capacity} tấn (~${v.capacity * 1000} kg)` :
                          v.unit === 'box' ? `${v.capacity} thùng/hộp` :
                          `${v.capacity} ${v.unit}`
                        ) : (
                          'Chưa cấu hình'
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={v.isActive ? 'default' : 'secondary'}>
                          {v.isActive ? 'Đang dùng' : 'Tắt'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEdit(v)}
                            className="gap-1"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            Sửa
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(v._id)}
                            disabled={deletingId === v._id}
                            className="gap-1 text-red-600 hover:text-red-700"
                          >
                            {deletingId === v._id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                            Xóa
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {(modalOpen === 'create' || modalOpen === 'edit') && (
        <Modal
          isOpen={true}
          onClose={() => setModalOpen(null)}
          title={editing ? 'Sửa loại xe' : 'Thêm loại xe'}
        >
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <Label>Tên loại xe *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="VD: Xe tải 500kg"
                required
              />
            </div>
            <div>
              <Label>Mô tả</Label>
              <Input
                value={form.description ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Tùy chọn"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Sức chở tối đa</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.capacity ?? ''}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      capacity: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                  placeholder="VD: 500 nếu đơn vị là kg, 1 nếu đơn vị là tấn"
                />
              </div>
              <div>
                <Label>Đơn vị sức chở</Label>
                <select
                  className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.unit ?? 'kg'}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      unit: e.target.value as VehicleTypeInput['unit'],
                    }))
                  }
                >
                  <option value="kg">Kilogram (kg)</option>
                  <option value="ton">Tấn (ton)</option>
                  <option value="box">Thùng / Hộp (box)</option>
                </select>
              </div>
            </div>
            {editing && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={form.isActive ?? true}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="isActive">Đang dùng (hiển thị khi tạo chuyến)</Label>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setModalOpen(null)}>
                Hủy
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Đang lưu...
                  </>
                ) : (
                  'Lưu'
                )}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
