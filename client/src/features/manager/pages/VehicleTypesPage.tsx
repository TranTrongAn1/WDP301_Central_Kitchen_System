import { useState, useEffect } from 'react';
import { 
  Loader2, Plus, Pencil, Trash2, AlertTriangle, 
  MoreVertical,
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import vehicleApi, {
  type VehicleType,
  type VehicleTypeInput,
} from '@/api/VehicleApi';
import toast from 'react-hot-toast';

export default function VehicleTypesPage() {
  const [list, setList] = useState<VehicleType[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState<'create' | 'edit' | 'delete' | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  
  const [editing, setEditing] = useState<VehicleType | null>(null);
  const [form, setForm] = useState<VehicleTypeInput>({
    name: '',
    description: '',
    isActive: true,
    capacity: undefined,
    unit: 'kg',
  });
  
  const [saving, setSaving] = useState(false);
  const [selectedForDelete, setSelectedForDelete] = useState<VehicleType | null>(null);

  const fetchList = async () => {
    try {
      setLoading(true);
      const res = await vehicleApi.getAll();
      const data = (res as any)?.data ?? res ?? [];
      setList(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Không tải được danh sách loại xe.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
    const closeMenu = () => setOpenMenuId(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
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

  const openDeleteConfirm = (v: VehicleType) => {
    setSelectedForDelete(v);
    setModalOpen('delete');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Nhập tên loại xe.');
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
      fetchList();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Lỗi lưu.');
    } finally {
      setSaving(false);
    }
  };

  const handleSoftDelete = async () => {
    if (!selectedForDelete) return;
    setSaving(true);
    try {
      await vehicleApi.update(selectedForDelete._id, {
        ...selectedForDelete,
        isActive: false,
      });
      toast.success('Đã ngưng sử dụng.');
      setModalOpen(null);
      fetchList();
    } catch (err: any) {
      toast.error('Không thể cập nhật trạng thái.');
    } finally {
      setSaving(false);
      setSelectedForDelete(null);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[320px]">
      <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
    </div>
  );

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-xl font-semibold">Loại xe</h1>
        <Button onClick={openCreate} className="bg-orange-500 hover:bg-orange-600 gap-2">
          <Plus className="w-4 h-4" />
          Thêm loại xe
        </Button>
      </div>

      <Card className="overflow-visible">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b bg-slate-50/50">
                  <th className="px-6 py-4 font-semibold">Tên loại xe</th>
                  <th className="px-6 py-4 font-semibold">Mô tả</th>
                  <th className="px-6 py-4 font-semibold">Sức chở tối đa</th>
                  <th className="px-6 py-4 font-semibold text-center">Trạng thái</th>
                  <th className="px-6 py-4 font-semibold text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {list.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground italic">
                      Chưa có dữ liệu loại xe.
                    </td>
                  </tr>
                ) : (
                  list.map((v, index) => {
                    const isInactive = !v.isActive;
                    const isLastRows = index >= list.length - 2 && list.length > 2;

                    return (
                      <tr key={v._id} className="hover:bg-slate-50/30 transition-colors">
                        <td className={`px-6 py-4 font-medium text-slate-900 ${isInactive ? 'opacity-40' : ''}`}>
                          {v.name}
                        </td>
                        <td className={`px-6 py-4 ${isInactive ? 'opacity-40' : ''}`}>
                          <div className="group relative flex items-center text-slate-500 max-w-[200px] cursor-help">
                            <span className="truncate">{v.description || '—'}</span>
                            {v.description && (
                              <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-50 w-64 p-2 bg-slate-800 text-white text-xs rounded shadow-xl animate-in fade-in slide-in-from-bottom-1 text-left whitespace-normal font-normal">
                                {v.description}
                                <div className="absolute top-full left-4 border-8 border-transparent border-t-slate-800" />
                              </div>
                            )}
                          </div>
                        </td>
                        <td className={`px-6 py-4 text-slate-600 ${isInactive ? 'opacity-40' : ''}`}>
                          {v.capacity != null ? `${v.capacity} ${v.unit}` : '—'}
                        </td>
                        <td className={`px-6 py-4 text-center ${isInactive ? 'opacity-40' : ''}`}>
                          <Badge className={v.isActive ? "bg-orange-500 text-white" : "bg-slate-200 text-slate-600"}>
                            {v.isActive ? 'Đang dùng' : 'Tắt'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-right relative">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === v._id ? null : v._id); }}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>

                          {/* DROPDOWN MENU */}
                          {openMenuId === v._id && (
                            <div className={`absolute right-10 ${isLastRows ? 'bottom-full mb-2' : 'top-12'} z-[100] w-40 rounded-md border bg-white shadow-xl animate-in fade-in zoom-in duration-100 text-left`}>
                              <div className="py-1">
                                <button 
                                  onClick={() => openEdit(v)} 
                                  className="flex w-full items-center px-4 py-2 text-slate-700 hover:bg-slate-100 transition-colors"
                                >
                                  <Pencil className="mr-2 h-4 w-4 text-blue-500" /> Sửa
                                </button>
                                {v.isActive && (
                                  <button 
                                    onClick={() => openDeleteConfirm(v)}
                                    className="flex w-full items-center px-4 py-2 text-orange-600 hover:bg-orange-50 transition-colors"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" /> Ngưng dùng
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* MODAL THÊM / SỬA */}
      {(modalOpen === 'create' || modalOpen === 'edit') && (
        <Modal
          isOpen={true}
          onClose={() => setModalOpen(null)}
          title={editing ? 'Sửa loại xe' : 'Thêm loại xe'}
        >
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1.5 text-left">
              <Label>Tên loại xe *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="VD: Xe tải 500kg"
                required
              />
            </div>
            <div className="space-y-1.5 text-left">
              <Label>Mô tả</Label>
              <Input
                value={form.description ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Tùy chọn"
              />
            </div>
            <div className="grid grid-cols-2 gap-4 text-left">
              <div className="space-y-1.5">
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
                  placeholder="VD: 500"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Đơn vị</Label>
                <select
                  className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-orange-500"
                  value={form.unit ?? 'kg'}
                  onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value as any }))}
                >
                  <option value="kg">Kg</option>
                  <option value="ton">Tấn</option>
                  <option value="box">Thùng</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="isActive"
                checked={form.isActive ?? true}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                className="rounded border-gray-300 text-orange-500 focus:ring-orange-500 h-4 w-4"
              />
              <Label htmlFor="isActive" className="cursor-pointer font-normal text-slate-600">
                Cho phép sử dụng khi điều phối
              </Label>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setModalOpen(null)}>Hủy</Button>
              <Button type="submit" disabled={saving} className="flex-1 bg-orange-500 hover:bg-orange-600">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : 'Lưu'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL XÁC NHẬN NGƯNG DÙNG */}
      {modalOpen === 'delete' && (
        <Modal
          isOpen={true}
          onClose={() => setModalOpen(null)}
          title="Xác nhận ngưng dùng"
        >
          <div className="space-y-6 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <p className="text-sm">
                Loại xe <strong>{selectedForDelete?.name}</strong> sẽ được chuyển sang trạng thái <strong>Ngưng dùng</strong>. 
              </p>
              <p className="text-xs text-slate-500 px-4 italic">
                (Dữ liệu vận tải cũ vẫn được giữ nguyên, nhưng bạn sẽ không thể chọn xe này cho các đơn hàng mới.)
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setModalOpen(null)} disabled={saving}>
                Quay lại
              </Button>
              <Button 
                onClick={handleSoftDelete} 
                disabled={saving}
                className="flex-1 bg-orange-500 hover:bg-orange-600"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : 'Xác nhận'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}