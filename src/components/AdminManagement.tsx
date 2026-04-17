import { useState, useEffect } from 'react';
import { Admin } from '@/src/types';
import { subscribeToAdmins, saveAdmin, deleteAdmin } from '@/src/lib/db-service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck, UserPlus, Trash2, Mail } from 'lucide-react';
import { toast } from 'sonner';
import React from 'react';
import { cn } from '@/lib/utils';
import { TEAMS } from '@/src/lib/constants';
import { UserGuide } from './UserGuide';

export function AdminManagement() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [newAdmin, setNewAdmin] = useState({ email: '', role: 'editor' as 'admin' | 'editor', teamAccess: 'ALL' });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToAdmins(setAdmins);
    return () => unsubscribe();
  }, []);

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdmin.email) {
      toast.error('Vui lòng nhập Gmail');
      return;
    }

    if (!newAdmin.email.endsWith('@gmail.com')) {
      toast.error('Vui lòng nhập địa chỉ Gmail hợp lệ');
      return;
    }

    try {
      const id = newAdmin.email;
      await saveAdmin({
        id,
        email: newAdmin.email,
        role: newAdmin.role,
        teamAccess: newAdmin.teamAccess,
        createdAt: Date.now(),
      });
      setNewAdmin({ email: '', role: 'editor', teamAccess: 'ALL' });
      toast.success('Đã thêm quyền truy cập');
    } catch (error) {
      toast.error('Lỗi khi thêm quyền');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      setTimeout(() => setConfirmDeleteId(null), 3000); // Reset after 3 seconds
      return;
    }

    try {
      await deleteAdmin(id);
      toast.success('Đã thu hồi quyền');
      setConfirmDeleteId(null);
    } catch (error) {
      toast.error('Lỗi khi thu hồi quyền');
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Section */}
        <Card className="border-rose-200 shadow-sm rounded-2xl overflow-hidden bg-rose-50/10">
          <CardHeader className="border-b border-rose-100 bg-rose-100/50">
            <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-rose-700">
              <ShieldCheck className="w-4 h-4 text-rose-600" />
              Phân Quyền Gmail
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleAddAdmin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-bold text-slate-500 uppercase">Địa chỉ Gmail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    value={newAdmin.email}
                    onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                    placeholder="example@gmail.com"
                    className="rounded-xl border-border bg-slate-50 pl-10 focus-visible:ring-primary"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="role" className="text-xs font-bold text-slate-500 uppercase">Vai trò</Label>
                <Select
                  value={newAdmin.role || "editor"}
                  onValueChange={(value: 'admin' | 'editor') => setNewAdmin({ ...newAdmin, role: value })}
                >
                  <SelectTrigger className="rounded-xl border-border bg-slate-50">
                    <SelectValue placeholder="Chọn vai trò" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl" position="popper">
                    <SelectItem value="admin">Quản trị viên (Admin)</SelectItem>
                    <SelectItem value="editor">Người dùng (Editor)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="teamAccess" className="text-xs font-bold text-slate-500 uppercase">Phụ trách tổ</Label>
                <Select
                  value={newAdmin.teamAccess || "ALL"}
                  onValueChange={(value) => setNewAdmin({ ...newAdmin, teamAccess: value })}
                >
                  <SelectTrigger className="rounded-xl border-border bg-slate-50">
                    <SelectValue placeholder="Chọn tổ phụ trách" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl" position="popper">
                    <SelectItem value="ALL">Tất cả (Trưởng/Phó Điện lực)</SelectItem>
                    {TEAMS.map(team => (
                      <SelectItem key={team} value={team}>{team}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full rounded-xl py-6 font-bold shadow-md hover:shadow-lg transition-all mt-4">
                <UserPlus className="w-4 h-4 mr-2" />
                Cấp Quyền Truy Cập
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* List Section */}
        <Card className="border-teal-200 shadow-sm rounded-2xl overflow-hidden bg-teal-50/10 lg:col-span-2">
          <CardHeader className="border-b border-teal-100 bg-teal-100/50">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-teal-700">Danh Sách Gmail Được Cấp Quyền</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow className="hover:bg-transparent border-border">
                  <TableHead className="font-bold text-slate-500">Gmail</TableHead>
                  <TableHead className="font-bold text-slate-500">Vai trò</TableHead>
                  <TableHead className="font-bold text-slate-500">Phụ trách</TableHead>
                  <TableHead className="font-bold text-slate-500">Ngày cấp</TableHead>
                  <TableHead className="text-right font-bold text-slate-500 pr-6">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-12 text-muted-foreground italic">
                      Chưa có Gmail nào được cấp quyền
                    </TableCell>
                  </TableRow>
                ) : (
                  admins.map((admin) => (
                    <TableRow key={admin.id} className="border-border hover:bg-slate-50/80 even:bg-slate-50/30 transition-colors">
                      <TableCell className="font-medium">{admin.email}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${
                          admin.role === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
                        }`}>
                          {admin.role === 'admin' ? 'ADMIN' : 'EDITOR'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="px-2 py-1 bg-slate-100 rounded-md text-xs font-bold text-slate-600">
                          {admin.teamAccess === 'ALL' || !admin.teamAccess ? 'Tất cả' : admin.teamAccess}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {new Date(admin.createdAt).toLocaleDateString('vi-VN')}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn(
                            "rounded-lg transition-all",
                            confirmDeleteId === admin.id 
                              ? "text-white bg-destructive hover:bg-destructive/90 w-auto px-3 gap-1" 
                              : "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          )}
                          onClick={() => handleDelete(admin.id)}
                        >
                          {confirmDeleteId === admin.id ? (
                            <>
                              <Trash2 className="w-4 h-4" />
                              <span className="text-[10px] font-bold">Xác nhận?</span>
                            </>
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      
      <UserGuide 
        items={[
          { title: "Cấp quyền Gmail", description: "Cấp quyền cho tài khoản Google để đăng nhập. Chỉ Gmail trong danh sách mới có thể truy cập." },
          { title: "Phân mức vai trò", description: "Admin (toàn quyền hệ thống) hoặc Editor (chỉ chấm công và xem báo cáo tổ phụ trách)." },
          { title: "Giới hạn phạm vi", description: "Phân quyền Editor theo từng tổ cụ thể hoặc chọn 'Tất cả' để kiểm soát dữ liệu rộng hơn." },
          { title: "Bảo mật tài khoản", description: "Mọi hoạt động đều yêu cầu xác thực qua Google, đảm bảo an toàn dữ liệu nội bộ." },
          { title: "Quản lý truy cập", description: "Dễ dàng thêm Gmail mới hoặc thu hồi quyền truy cập khi nhân sự thay đổi bộ phận." },
          { title: "Kiểm soát tổ", description: "Lãnh đạo đơn vị thường được cấp quyền 'Tất cả' để giám sát toàn bộ các tổ." }
        ]}
      />
    </div>
  );
}
