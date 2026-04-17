import { useState, useEffect, useMemo, useRef } from 'react';
import { Employee } from '@/src/types';
import { subscribeToEmployees, saveEmployee, deleteEmployee } from '@/src/lib/db-service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TEAMS } from '@/src/lib/constants';
import { Plus, Trash2, UserPlus, Users, PieChart as PieChartIcon, BarChart3, Edit2, X } from 'lucide-react';
import { toast } from 'sonner';
import React from 'react';
import { cn } from '@/lib/utils';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList } from 'recharts';
import { useAuth } from '@/src/lib/auth-context';
import { UserGuide } from './UserGuide';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function EmployeeManagement() {
  const { adminData } = useAuth();
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [newEmployee, setNewEmployee] = useState({ employeeId: '', fullName: '', team: '', gender: 'Nam' as 'Nam' | 'Nữ' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const availableTeams = useMemo(() => {
    if (!adminData || adminData.teamAccess === 'ALL') return TEAMS;
    return [adminData.teamAccess];
  }, [adminData]);

  useEffect(() => {
    if (availableTeams.length === 1 && !newEmployee.team) {
      setNewEmployee(prev => ({ ...prev, team: availableTeams[0] }));
    }
  }, [availableTeams, newEmployee.team]);

  const employees = useMemo(() => {
    if (!adminData || adminData.teamAccess === 'ALL') return allEmployees;
    return allEmployees.filter(emp => emp.team === adminData.teamAccess);
  }, [allEmployees, adminData]);

  useEffect(() => {
    const unsubscribe = subscribeToEmployees(setAllEmployees);
    return () => unsubscribe();
  }, []);

  const teamStats = useMemo(() => {
    const stats = availableTeams.map(team => ({
      name: team,
      value: employees.filter(emp => emp.team === team).length
    }));
    return stats.filter(s => s.value > 0);
  }, [employees, availableTeams]);

  const genderStats = useMemo(() => {
    return [
      { name: 'Nam', value: employees.filter(emp => emp.gender === 'Nam').length },
      { name: 'Nữ', value: employees.filter(emp => emp.gender === 'Nữ').length }
    ].filter(s => s.value > 0);
  }, [employees]);

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmployee.employeeId || !newEmployee.fullName || !newEmployee.team || !newEmployee.gender) {
      toast.error('Vui lòng điền đầy đủ thông tin');
      return;
    }

    try {
      // If editing and ID changed, delete old record
      if (editingId && editingId !== newEmployee.employeeId) {
        await deleteEmployee(editingId);
      }

      await saveEmployee({
        id: newEmployee.employeeId,
        ...newEmployee,
        createdAt: Date.now(),
      });
      
      setNewEmployee({ employeeId: '', fullName: '', team: '', gender: 'Nam' });
      setEditingId(null);
      toast.success(editingId ? 'Đã cập nhật nhân viên' : 'Đã thêm nhân viên');
    } catch (error) {
      toast.error('Lỗi khi lưu nhân viên');
    }
  };

  const handleEdit = (emp: Employee) => {
    setNewEmployee({
      employeeId: emp.employeeId,
      fullName: emp.fullName,
      team: emp.team,
      gender: emp.gender
    });
    setEditingId(emp.employeeId);
    // Scroll to form
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const cancelEdit = () => {
    setNewEmployee({ employeeId: '', fullName: '', team: '', gender: 'Nam' });
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      setTimeout(() => setConfirmDeleteId(null), 3000); // Reset after 3 seconds
      return;
    }

    try {
      await deleteEmployee(id);
      toast.success('Đã xóa nhân viên');
      setConfirmDeleteId(null);
    } catch (error) {
      toast.error('Lỗi khi xóa nhân viên');
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-indigo-200 shadow-sm rounded-2xl overflow-hidden bg-indigo-50/30">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Tổng nhân sự</p>
              <p className="text-xl font-bold">{employees.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-200 shadow-sm rounded-2xl overflow-hidden bg-blue-50/30">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <span className="font-bold text-blue-600">Nam</span>
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Nhân viên Nam</p>
              <p className="text-xl font-bold">{employees.filter(e => e.gender === 'Nam').length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-pink-200 shadow-sm rounded-2xl overflow-hidden bg-pink-50/30">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-pink-100 flex items-center justify-center">
              <span className="font-bold text-pink-600">Nữ</span>
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Nhân viên Nữ</p>
              <p className="text-xl font-bold">{employees.filter(e => e.gender === 'Nữ').length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-slate-50/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Số tổ</p>
              <p className="text-xl font-bold">{availableTeams.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Statistics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border-blue-200 shadow-sm rounded-2xl overflow-hidden bg-blue-50/10">
          <CardHeader className="border-b border-blue-100 bg-blue-100/50">
            <CardTitle className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-700">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              Số lượng theo tổ
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={teamStats}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="value" position="top" fill="#3b82f6" fontSize={12} fontWeight="bold" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 shadow-sm rounded-2xl overflow-hidden bg-emerald-50/10">
          <CardHeader className="border-b border-emerald-100 bg-emerald-100/50">
            <CardTitle className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700">
              <PieChartIcon className="w-4 h-4 text-emerald-600" />
              Tỷ lệ theo tổ
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={teamStats}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                  style={{ fontSize: '10px', fontWeight: 'bold' }}
                >
                  {teamStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-purple-200 shadow-sm rounded-2xl overflow-hidden bg-purple-50/10">
          <CardHeader className="border-b border-purple-100 bg-purple-100/50">
            <CardTitle className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-700">
              <Users className="w-4 h-4 text-purple-600" />
              Tỷ lệ giới tính
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={genderStats}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                  style={{ fontSize: '10px', fontWeight: 'bold' }}
                >
                  <Cell fill="#3b82f6" />
                  <Cell fill="#ec4899" />
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Section */}
        <div ref={formRef}>
          <Card className="border-indigo-200 shadow-sm rounded-2xl overflow-hidden bg-indigo-50/10">
            <CardHeader className="border-b border-indigo-100 bg-indigo-100/50">
              <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-indigo-700">
                {editingId ? <Edit2 className="w-4 h-4 text-indigo-600" /> : <UserPlus className="w-4 h-4 text-indigo-600" />}
                {editingId ? 'Sửa Nhân Viên' : 'Thêm Nhân Viên'}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleAddEmployee} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="employeeId" className="text-xs font-bold text-slate-500 uppercase">Mã số NV</Label>
                  <Input
                    id="employeeId"
                    value={newEmployee.employeeId}
                    onChange={(e) => setNewEmployee({ ...newEmployee, employeeId: e.target.value })}
                    placeholder="VD: NV001"
                    className="rounded-xl border-border bg-slate-50 focus-visible:ring-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-xs font-bold text-slate-500 uppercase">Họ và tên</Label>
                  <Input
                    id="fullName"
                    value={newEmployee.fullName}
                    onChange={(e) => setNewEmployee({ ...newEmployee, fullName: e.target.value })}
                    placeholder="Nguyễn Văn A"
                    className="rounded-xl border-border bg-slate-50 focus-visible:ring-primary"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="gender" className="text-xs font-bold text-slate-500 uppercase">Giới tính</Label>
                    <Select
                      value={newEmployee.gender || "Nam"}
                      onValueChange={(value: 'Nam' | 'Nữ') => setNewEmployee({ ...newEmployee, gender: value })}
                    >
                      <SelectTrigger className="rounded-xl border-border bg-slate-50">
                        <SelectValue placeholder="Chọn" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl" position="popper">
                        <SelectItem value="Nam">Nam</SelectItem>
                        <SelectItem value="Nữ">Nữ</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="team" className="text-xs font-bold text-slate-500 uppercase">Tổ</Label>
                    <Select
                      value={newEmployee.team || ""}
                      onValueChange={(value) => setNewEmployee({ ...newEmployee, team: value })}
                    >
                      <SelectTrigger className="rounded-xl border-border bg-slate-50">
                        <SelectValue placeholder="Chọn" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl" position="popper">
                        {availableTeams.map((team) => (
                          <SelectItem key={team} value={team}>
                            {team}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button type="submit" className="flex-1 rounded-xl py-6 font-bold shadow-md hover:shadow-lg transition-all">
                    {editingId ? <Edit2 className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                    {editingId ? 'Cập Nhật' : 'Thêm Nhân Viên'}
                  </Button>
                  {editingId && (
                    <Button type="button" variant="outline" onClick={cancelEdit} className="rounded-xl py-6 font-bold">
                      <X className="w-4 h-4 mr-2" />
                      Hủy
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* List Section */}
        <Card className="border-indigo-200 shadow-sm rounded-2xl overflow-hidden bg-indigo-50/10 lg:col-span-2">
          <CardHeader className="border-b border-indigo-100 bg-indigo-100/50">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-indigo-700">Danh Sách Nhân Viên</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow className="hover:bg-transparent border-border">
                  <TableHead className="font-bold text-slate-500">Mã số NV</TableHead>
                  <TableHead className="font-bold text-slate-500">Họ và tên</TableHead>
                  <TableHead className="font-bold text-slate-500">Giới tính</TableHead>
                  <TableHead className="font-bold text-slate-500">Tổ</TableHead>
                  <TableHead className="text-right font-bold text-slate-500 pr-6">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground italic">
                      Chưa có nhân viên nào trong hệ thống
                    </TableCell>
                  </TableRow>
                ) : (
                  employees.map((emp) => (
                    <TableRow key={emp.employeeId} className="border-border hover:bg-slate-50/80 even:bg-slate-50/30 transition-colors">
                      <TableCell className="font-bold text-primary">{emp.employeeId}</TableCell>
                      <TableCell className="font-medium">{emp.fullName}</TableCell>
                      <TableCell>
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-bold",
                          emp.gender === 'Nam' ? "bg-blue-100 text-blue-600" : "bg-pink-100 text-pink-600"
                        )}>
                          {emp.gender}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="px-2 py-1 bg-slate-100 rounded-md text-xs font-bold text-slate-600">
                          {emp.team}
                        </span>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg"
                            onClick={() => handleEdit(emp)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                              "rounded-lg transition-all",
                              confirmDeleteId === emp.employeeId 
                                ? "text-white bg-destructive hover:bg-destructive/90 w-auto px-3 gap-1" 
                                : "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            )}
                            onClick={() => handleDelete(emp.employeeId)}
                          >
                            {confirmDeleteId === emp.employeeId ? (
                              <>
                                <Trash2 className="w-4 h-4" />
                                <span className="text-[10px] font-bold">Xác nhận?</span>
                              </>
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
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
          { title: "Quản lý thông tin", description: "Thêm, sửa mã nhân viên, họ tên, chức danh và tổ sản xuất của từng nhân sự." },
          { title: "Phân loại tổ", description: "Đảm bảo xếp nhân viên vào đúng tổ để việc chấm công và phân quyền được chính xác." },
          { title: "Thống kê nhân sự", description: "Theo dõi tổng số lượng, tỷ lệ giới tính và phân bổ nhân viên theo từng tổ qua biểu đồ." },
          { title: "Chỉnh sửa & Xóa", description: "Dễ dàng cập nhật thông tin khi nhân viên thay đổi vị trí công tác hoặc nghỉ việc." },
          { title: "Biểu đồ trực quan", description: "Hệ thống tự động phân tích cơ cấu nhân sự theo đơn vị bằng biểu đồ cột và tròn." },
          { title: "Tìm kiếm nhanh", description: "Sử dụng ô tìm kiếm để lọc nhân viên theo tên hoặc mã số ngay trong danh sách." }
        ]}
      />
    </div>
  );
}
