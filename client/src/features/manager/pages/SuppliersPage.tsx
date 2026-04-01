import { useState, useEffect } from 'react';
import { 
  Loader2, Plus, Pencil, Trash2, AlertTriangle, 
  X, Ban, MoreVertical, MapPin, Mail, Phone, CheckCircle 
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Label } from '../components/ui/Label';
import { supplierApi, type Supplier, type CreateSupplierRequest } from '@/api/SupplierApi';
import { useManagerReadOnly } from '@/shared/hooks/useManagerReadOnly';
import toast from 'react-hot-toast';

export default function SuppliersPage() {
  const { isManagerReadOnly, user } = useManagerReadOnly();
  const isAdmin = user?.role === 'Admin';

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [modalOpen, setModalOpen] = useState<'create' | 'edit' | null>(null);
  // Cập nhật type để hỗ trợ 'reactivate'
  const [confirmModal, setConfirmModal] = useState<{ supplier: Supplier, type: 'soft' | 'permanent' | 'reactivate' } | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null); 
  
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState<Partial<Supplier>>({
    name: '', address: '', phone: '', email: '', status: 'Active',
  });
  
  const [saving, setSaving] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const res = await supplierApi.getAll();
      const data = (res as any)?.data ?? res ?? [];
      setSuppliers(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Không tải được danh sách.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
    const closeMenu = () => setOpenMenuId(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  const openCreate = () => {
    if (isManagerReadOnly) return;
    setEditing(null);
    setForm({ name: '', address: '', phone: '', email: '', status: 'Active' });
    setModalOpen('create');
  };

  const openEdit = (s: Supplier) => {
    if (isManagerReadOnly) return;
    setEditing(s);
    setForm({ name: s.name, address: s.address, phone: s.phone, email: s.email, status: s.status });
    setModalOpen('edit');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await supplierApi.update(editing._id, form);
        toast.success('Đã cập nhật');
      } else {
        await supplierApi.create(form as CreateSupplierRequest);
        toast.success('Đã thêm mới');
      }
      setModalOpen(null);
      fetchSuppliers();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Lỗi xử lý');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmModal) return;
    setProcessingId(confirmModal.supplier._id);
    try {
      if (confirmModal.type === 'soft') {
        await supplierApi.update(confirmModal.supplier._id, { status: 'Inactive' });
        toast.success('Đã ngưng hoạt động');
      } else if (confirmModal.type === 'reactivate') {
        // GỌI API KÍCH HOẠT LẠI
        await supplierApi.reactivate(confirmModal.supplier._id);
        toast.success('Đã kích hoạt lại nhà cung cấp');
      } else {
        await supplierApi.deletePermanent(confirmModal.supplier._id);
        toast.success('Đã xóa vĩnh viễn');
      }
      setConfirmModal(null);
      fetchSuppliers();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Thao tác thất bại');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
    </div>
  );

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Nhà cung cấp</h1>
          <p className="text-sm text-muted-foreground">Quản lý đối tác cung ứng nguyên liệu</p>
        </div>
        <Button onClick={openCreate} disabled={isManagerReadOnly} className="bg-orange-500 hover:bg-orange-600">
          <Plus className="mr-2 h-4 w-4" /> Thêm nhà cung cấp
        </Button>
      </div>

      <Card className="overflow-visible">
        <CardContent className="p-0">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-6 py-4 font-semibold">Tên đơn vị</th>
                <th className="px-6 py-4 font-semibold text-center">Liên lạc</th>
                <th className="px-6 py-4 font-semibold">Địa chỉ</th>
                <th className="px-6 py-4 font-semibold text-center">Trạng thái</th>
                <th className="px-6 py-4 font-semibold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {suppliers.map((s, index) => {
                const isInactive = s.status === 'Inactive';
                const isLastRows = index >= suppliers.length - 2 && suppliers.length > 2;

                return (
                  <tr key={s._id} className={`hover:bg-slate-50/50 transition-colors`}>
                    <td className={`px-6 py-4 font-medium text-slate-900 ${isInactive ? 'opacity-40' : ''}`}>{s.name}</td>
                    <td className={`px-6 py-4 ${isInactive ? 'opacity-40' : ''}`}>
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center text-slate-600"><Phone className="w-3 h-3 mr-2" /> {s.phone}</div>
                        <div className="flex items-center text-slate-400 text-xs"><Mail className="w-3 h-3 mr-2" /> {s.email}</div>
                      </div>
                    </td>
                    <td className={`px-6 py-4 ${isInactive ? 'opacity-40' : ''}`}>
                      <div className="group relative flex items-start text-slate-500 max-w-[250px] cursor-help">
                        <MapPin className="w-3 h-3 mr-2 mt-1 flex-shrink-0" />
                        <span className="truncate">{s.address}</span>
                        <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-50 w-64 p-2 bg-slate-800 text-white text-xs rounded shadow-xl animate-in fade-in slide-in-from-bottom-1">
                          {s.address}
                          <div className="absolute top-full left-4 border-8 border-transparent border-t-slate-800" />
                        </div>
                      </div>
                    </td>
                    <td className={`px-6 py-4 text-center ${isInactive ? 'opacity-40' : ''}`}>
                      <Badge className={s.status === 'Active' ? "bg-orange-500 text-white" : "bg-slate-200 text-slate-600"}>
                        {s.status === 'Active' ? 'Đang dùng' : 'Tắt'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right relative">
                      <Button
                        variant="ghost" size="sm"
                        onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === s._id ? null : s._id); }}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>

                      {openMenuId === s._id && (
                        <div className={`absolute right-10 ${isLastRows ? 'bottom-full mb-2' : 'top-12'} z-[100] w-40 rounded-md border bg-white shadow-xl animate-in fade-in zoom-in duration-100 text-left`}>
                          <div className="py-1">
                            <button onClick={() => openEdit(s)} className="flex w-full items-center px-4 py-2 hover:bg-slate-100 transition-colors text-slate-700">
                              <Pencil className="mr-2 h-4 w-4 text-blue-500" /> Sửa
                            </button>
                            
                            {/* NÚT KÍCH HOẠT LẠI (NẾU ĐANG TẮT) */}
                            {isInactive ? (
                              <button 
                                onClick={() => setConfirmModal({ supplier: s, type: 'reactivate' })}
                                className="flex w-full items-center px-4 py-2 text-emerald-600 hover:bg-emerald-50 transition-colors"
                              >
                                <CheckCircle className="mr-2 h-4 w-4" /> Kích hoạt lại
                              </button>
                            ) : (
                              <button 
                                onClick={() => setConfirmModal({ supplier: s, type: 'soft' })}
                                className="flex w-full items-center px-4 py-2 text-orange-600 hover:bg-orange-50 transition-colors"
                              >
                                <Ban className="mr-2 h-4 w-4" /> Ngưng dùng
                              </button>
                            )}

                            {isAdmin && (
                              <button 
                                onClick={() => setConfirmModal({ supplier: s, type: 'permanent' })}
                                className="flex w-full items-center px-4 py-2 text-red-600 hover:bg-red-50 border-t mt-1"
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Xóa vĩnh viễn
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* MODAL THÊM / SỬA */}
      {modalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md shadow-2xl animate-in zoom-in duration-200">
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">{editing ? 'Sửa nhà cung cấp' : 'Thêm nhà cung cấp'}</h2>
                <X className="cursor-pointer text-slate-400 hover:text-slate-600" onClick={() => setModalOpen(null)} />
              </div>
              <form onSubmit={handleSave} className="space-y-4 text-left">
                <div className="space-y-1">
                  <Label>Tên đơn vị *</Label>
                  <Input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} placeholder="VD: Công ty thực phẩm sạch" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Số điện thoại *</Label>
                    <Input value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} placeholder="09xxxxxxx" required />
                  </div>
                  <div className="space-y-1">
                    <Label>Email *</Label>
                    <Input type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} placeholder="ncc@example.com" required />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Địa chỉ chi tiết *</Label>
                  <Input value={form.address} onChange={(e) => setForm({...form, address: e.target.value})} placeholder="Số nhà, tên đường..." required />
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setModalOpen(null)}>Hủy</Button>
                  <Button type="submit" className="flex-1 bg-orange-500 hover:bg-orange-600 text-white" disabled={saving}>
                    {saving ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
                    {saving ? 'Đang lưu...' : 'Lưu dữ liệu'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* CONFIRM MODAL (Hỗ trợ cả ngưng dùng, xóa và kích hoạt lại) */}
      {confirmModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-sm shadow-2xl animate-in zoom-in duration-200">
            <CardContent className="p-6 text-center">
              <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 
                ${confirmModal.type === 'soft' ? 'bg-orange-100 text-orange-600' : 
                  confirmModal.type === 'reactivate' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                {confirmModal.type === 'soft' ? <Ban className="h-6 w-6" /> : 
                 confirmModal.type === 'reactivate' ? <CheckCircle className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
              </div>
              
              <h3 className="text-lg font-bold">
                {confirmModal.type === 'soft' ? 'Ngưng hợp tác?' : 
                 confirmModal.type === 'reactivate' ? 'Kích hoạt lại?' : 'Xóa vĩnh viễn?'}
              </h3>
              
              <p className="text-sm text-slate-500 mt-2">
                {confirmModal.type === 'reactivate' 
                  ? `Nhà cung cấp "${confirmModal.supplier.name}" sẽ được phép hoạt động trở lại.`
                  : `Xác nhận thực hiện hành động này cho "${confirmModal.supplier.name}"?`}
              </p>

              <div className="flex gap-3 mt-6">
                <Button variant="outline" className="flex-1" onClick={() => setConfirmModal(null)}>Quay lại</Button>
                <Button 
                  className={`flex-1 ${confirmModal.type === 'soft' ? 'bg-orange-500' : 
                                    confirmModal.type === 'reactivate' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600'}`}
                  onClick={handleConfirmAction} disabled={!!processingId}
                >
                  {processingId ? <Loader2 className="animate-spin h-4 w-4" /> : 'Xác nhận'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}