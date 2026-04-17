import { useState, useEffect, useMemo } from 'react';
import { Employee, AttendanceRecord, AttendanceStatus } from '@/src/types';
import { subscribeToEmployees, getAttendanceForMonth, saveAttendance } from '@/src/lib/db-service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TEAMS, ATTENDANCE_STATUSES } from '@/src/lib/constants';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Calendar as CalendarIcon, Check, FileUp, Image as ImageIcon, X, Trash2, Eye, CheckCircle2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/src/lib/auth-context';
import { UserGuide } from './UserGuide';

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const max_size = 800; // Max width/height

        if (width > height) {
          if (width > max_size) {
            height *= max_size / width;
            width = max_size;
          }
        } else {
          if (height > max_size) {
            width *= max_size / height;
            height = max_size;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        // Compress to JPEG with 0.6 quality
        const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

function WorkContentInput({ 
  initialValue, 
  onSave 
}: { 
  initialValue: string; 
  onSave: (val: string) => void 
}) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  return (
    <Input 
      placeholder="Nội dung công tác..."
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => {
        if (value !== initialValue) {
          onSave(value);
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.currentTarget.blur();
        }
      }}
      className="rounded-lg border-border bg-slate-50 text-xs h-9"
    />
  );
}

function TgInput({ 
  initialValue, 
  onSave 
}: { 
  initialValue: number | undefined; 
  onSave: (val: number | undefined) => void 
}) {
  const [value, setValue] = useState(initialValue ? String(initialValue) : '');

  useEffect(() => {
    setValue(initialValue ? String(initialValue) : '');
  }, [initialValue]);

  return (
    <Input 
      type="number"
      min="0"
      step="0.5"
      placeholder="Giờ"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => {
        const num = value ? parseFloat(value) : undefined;
        if (num !== initialValue) {
          onSave(num);
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.currentTarget.blur();
        }
      }}
      className="w-14 h-8 text-center px-1 text-xs rounded-lg border-border bg-slate-50"
    />
  );
}

export function AttendanceGrid() {
  const { adminData } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [uploading, setUploading] = useState<string | null>(null);

  const availableTeams = useMemo(() => {
    if (!adminData || adminData.teamAccess === 'ALL') return TEAMS;
    return [adminData.teamAccess];
  }, [adminData]);

  const [selectedTeam, setSelectedTeam] = useState<string>("");

  useEffect(() => {
    if (availableTeams.length > 0 && !availableTeams.includes(selectedTeam)) {
      setSelectedTeam(availableTeams[0]);
    }
  }, [availableTeams, selectedTeam]);

  useEffect(() => {
    const unsubEmployees = subscribeToEmployees(setEmployees);
    const unsubAttendance = getAttendanceForMonth(format(selectedDate, 'yyyy-MM'), setAttendance);
    return () => {
      unsubEmployees();
      unsubAttendance();
    };
  }, [selectedDate]);

  const filteredEmployees = employees.filter(emp => emp.team === selectedTeam);
  
  const unconfirmedCount = useMemo(() => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return filteredEmployees.filter(emp => {
      const record = attendance.find(a => a.employeeId === emp.employeeId && a.date === dateStr);
      return !record?.confirmed;
    }).length;
  }, [filteredEmployees, attendance, selectedDate]);

  const handleLuuDongChange = async (employeeId: string, luuDong: string) => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const existing = attendance.find(a => a.employeeId === employeeId && a.date === dateStr);
    
    try {
      await saveAttendance({
        id: `${employeeId}_${dateStr}`,
        employeeId,
        date: dateStr,
        status: existing?.status || 'present',
        proofUrl: existing?.proofUrl || null,
        extraProofUrl: existing?.extraProofUrl || null,
        workContent: existing?.workContent || '',
        leaveType: existing?.leaveType || undefined,
        luuDong: luuDong === ' ' ? undefined : luuDong,
        thueXe: existing?.thueXe || undefined,
        atd: existing?.atd || undefined,
        chtt: existing?.chtt,
        tg: existing?.tg,
        ca3: existing?.ca3,
        pctn: existing?.pctn,
        confirmed: !!existing?.confirmed,
        updatedAt: Date.now()
      });
    } catch (error) {
      toast.error('Lỗi khi cập nhật');
    }
  };

  const handleAtdChange = async (employeeId: string, atd: string) => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const existing = attendance.find(a => a.employeeId === employeeId && a.date === dateStr);
    
    try {
      await saveAttendance({
        id: `${employeeId}_${dateStr}`,
        employeeId,
        date: dateStr,
        status: existing?.status || 'present',
        proofUrl: existing?.proofUrl || null,
        extraProofUrl: existing?.extraProofUrl || null,
        workContent: existing?.workContent || '',
        leaveType: existing?.leaveType || undefined,
        luuDong: existing?.luuDong || undefined,
        thueXe: existing?.thueXe || undefined,
        atd: atd === ' ' ? undefined : atd,
        chtt: existing?.chtt,
        tg: existing?.tg,
        ca3: existing?.ca3,
        pctn: existing?.pctn,
        confirmed: !!existing?.confirmed,
        updatedAt: Date.now()
      });
    } catch (error) {
      toast.error('Lỗi khi cập nhật');
    }
  };

  const handleThueXeChange = async (employeeId: string, thueXe: string) => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const existing = attendance.find(a => a.employeeId === employeeId && a.date === dateStr);
    
    try {
      await saveAttendance({
        id: `${employeeId}_${dateStr}`,
        employeeId,
        date: dateStr,
        status: existing?.status || 'present',
        proofUrl: existing?.proofUrl || null,
        extraProofUrl: existing?.extraProofUrl || null,
        workContent: existing?.workContent || '',
        leaveType: existing?.leaveType || undefined,
        luuDong: existing?.luuDong || undefined,
        thueXe: thueXe === ' ' ? undefined : thueXe,
        atd: existing?.atd || undefined,
        chtt: existing?.chtt,
        tg: existing?.tg,
        ca3: existing?.ca3,
        pctn: existing?.pctn,
        confirmed: !!existing?.confirmed,
        updatedAt: Date.now()
      });
    } catch (error) {
      toast.error('Lỗi khi cập nhật');
    }
  };

  const handleLeaveTypeChange = async (employeeId: string, leaveType: string) => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const existing = attendance.find(a => a.employeeId === employeeId && a.date === dateStr);
    
    try {
      await saveAttendance({
        id: `${employeeId}_${dateStr}`,
        employeeId,
        date: dateStr,
        status: leaveType && leaveType !== ' ' ? 'absent' : (existing?.status || 'present'),
        proofUrl: existing?.proofUrl || null,
        extraProofUrl: existing?.extraProofUrl || null,
        workContent: existing?.workContent || '',
        leaveType: leaveType === ' ' ? undefined : leaveType,
        luuDong: existing?.luuDong || undefined,
        thueXe: existing?.thueXe || undefined,
        atd: existing?.atd || undefined,
        chtt: existing?.chtt,
        tg: existing?.tg,
        ca3: existing?.ca3,
        pctn: existing?.pctn,
        confirmed: !!existing?.confirmed,
        updatedAt: Date.now()
      });
    } catch (error) {
      toast.error('Lỗi khi cập nhật');
    }
  };

  const handleConfirmToggle = async (employeeId: string) => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const existing = attendance.find(a => a.employeeId === employeeId && a.date === dateStr);
    const newValue = !existing?.confirmed;
    const emp = employees.find(e => e.employeeId === employeeId);

    if (newValue) {
      const missingProofs = [];
      if (existing?.atd && !existing?.proofUrl) missingProofs.push("Đính kèm ATĐ");
      if ((existing?.tg || 0) > 0 && !existing?.extraProofUrl) missingProofs.push("Đính kèm chấm công thêm");

      if (missingProofs.length > 0) {
        toast.error(`Nhân viên ${emp?.fullName || employeeId} thiếu: ${missingProofs.join(', ')}`);
        return;
      }
    }
    
    try {
      await saveAttendance({
        id: `${employeeId}_${dateStr}`,
        employeeId,
        date: dateStr,
        status: existing?.status || 'present',
        proofUrl: existing?.proofUrl || null,
        extraProofUrl: existing?.extraProofUrl || null,
        workContent: existing?.workContent || '',
        leaveType: existing?.leaveType || undefined,
        luuDong: existing?.luuDong || undefined,
        thueXe: existing?.thueXe || undefined,
        atd: existing?.atd || undefined,
        chtt: existing?.chtt,
        tg: existing?.tg,
        ca3: existing?.ca3,
        pctn: existing?.pctn,
        confirmed: newValue,
        updatedAt: Date.now()
      });
    } catch (error) {
      toast.error('Lỗi khi xác nhận');
    }
  };

  const handleWorkContentChange = async (employeeId: string, workContent: string) => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const existing = attendance.find(a => a.employeeId === employeeId && a.date === dateStr);
    
    try {
      await saveAttendance({
        id: `${employeeId}_${dateStr}`,
        employeeId,
        date: dateStr,
        status: existing?.status || 'present',
        proofUrl: existing?.proofUrl || null,
        workContent,
        leaveType: existing?.leaveType || undefined,
        luuDong: existing?.luuDong || undefined,
        thueXe: existing?.thueXe || undefined,
        atd: existing?.atd || undefined,
        chtt: existing?.chtt,
        ca3: existing?.ca3,
        pctn: existing?.pctn,
        notes: existing?.notes || '',
        updatedAt: Date.now()
      });
    } catch (error) {
      toast.error('Lỗi khi lưu nội dung');
    }
  };

  const handleTgChange = async (employeeId: string, tg: number | undefined) => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const existing = attendance.find(a => a.employeeId === employeeId && a.date === dateStr);
    
    try {
      await saveAttendance({
        id: `${employeeId}_${dateStr}`,
        employeeId,
        date: dateStr,
        status: existing?.status || 'present',
        proofUrl: existing?.proofUrl || null,
        workContent: existing?.workContent || '',
        leaveType: existing?.leaveType || undefined,
        luuDong: existing?.luuDong || undefined,
        thueXe: existing?.thueXe || undefined,
        atd: existing?.atd || undefined,
        chtt: existing?.chtt,
        tg,
        ca3: existing?.ca3,
        pctn: existing?.pctn,
        notes: existing?.notes || '',
        updatedAt: Date.now()
      });
    } catch (error) {
      toast.error('Lỗi khi lưu giờ làm thêm');
    }
  };

  const handleChttChange = async (employeeId: string, chtt: number | undefined) => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const existing = attendance.find(a => a.employeeId === employeeId && a.date === dateStr);
    
    try {
      await saveAttendance({
        id: `${employeeId}_${dateStr}`,
        employeeId,
        date: dateStr,
        status: existing?.status || 'present',
        proofUrl: existing?.proofUrl || null,
        workContent: existing?.workContent || '',
        leaveType: existing?.leaveType || undefined,
        luuDong: existing?.luuDong || undefined,
        thueXe: existing?.thueXe || undefined,
        atd: existing?.atd || undefined,
        chtt,
        tg: existing?.tg,
        ca3: existing?.ca3,
        pctn: existing?.pctn,
        notes: existing?.notes || '',
        updatedAt: Date.now()
      });
    } catch (error) {
      toast.error('Lỗi khi lưu giờ CHTT');
    }
  };

  const handleCa3Change = async (employeeId: string, ca3: number | undefined) => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const existing = attendance.find(a => a.employeeId === employeeId && a.date === dateStr);
    
    try {
      await saveAttendance({
        id: `${employeeId}_${dateStr}`,
        employeeId,
        date: dateStr,
        status: existing?.status || 'present',
        proofUrl: existing?.proofUrl || null,
        workContent: existing?.workContent || '',
        leaveType: existing?.leaveType || undefined,
        luuDong: existing?.luuDong || undefined,
        thueXe: existing?.thueXe || undefined,
        atd: existing?.atd || undefined,
        chtt: existing?.chtt,
        tg: existing?.tg,
        ca3,
        pctn: existing?.pctn,
        notes: existing?.notes || '',
        updatedAt: Date.now()
      });
    } catch (error) {
      toast.error('Lỗi khi lưu giờ Ca 3');
    }
  };

  const handlePctnChange = async (employeeId: string, pctn: string) => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const existing = attendance.find(a => a.employeeId === employeeId && a.date === dateStr);
    
    try {
      await saveAttendance({
        id: `${employeeId}_${dateStr}`,
        employeeId,
        date: dateStr,
        status: existing?.status || 'present',
        proofUrl: existing?.proofUrl || null,
        extraProofUrl: existing?.extraProofUrl || null,
        workContent: existing?.workContent || '',
        leaveType: existing?.leaveType || undefined,
        luuDong: existing?.luuDong || undefined,
        thueXe: existing?.thueXe || undefined,
        atd: existing?.atd || undefined,
        chtt: existing?.chtt,
        tg: existing?.tg,
        ca3: existing?.ca3,
        pctn: pctn === ' ' ? undefined : pctn,
        confirmed: !!existing?.confirmed,
        updatedAt: Date.now()
      });
    } catch (error) {
      toast.error('Lỗi khi cập nhật PCTN');
    }
  };

  const handleFileUpload = async (employeeId: string, file: File) => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    
    setUploading(employeeId);
    try {
      // Check file type
      if (!file.type.startsWith('image/')) {
        toast.error('Vui lòng chỉ tải lên tệp hình ảnh');
        return;
      }

      // Compress and convert to Base64
      const base64Image = await compressImage(file);
      
      const existing = attendance.find(a => a.employeeId === employeeId && a.date === dateStr);
      await saveAttendance({
        id: `${employeeId}_${dateStr}`,
        employeeId,
        date: dateStr,
        status: existing?.status || 'present',
        proofUrl: base64Image,
        workContent: existing?.workContent || '',
        leaveType: existing?.leaveType || undefined,
        luuDong: existing?.luuDong || undefined,
        thueXe: existing?.thueXe || undefined,
        atd: existing?.atd || undefined,
        chtt: existing?.chtt,
        tg: existing?.tg,
        ca3: existing?.ca3,
        pctn: existing?.pctn,
        notes: existing?.notes || '',
        updatedAt: Date.now()
      });
      toast.success('Đã tải lên minh chứng');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Lỗi khi xử lý hình ảnh: ' + (error.message || 'Vui lòng thử lại'));
    } finally {
      setUploading(null);
    }
  };

  const handleRemoveProof = async (employeeId: string) => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const existing = attendance.find(a => a.employeeId === employeeId && a.date === dateStr);
    
    if (!existing) return;

    try {
      await saveAttendance({
        ...existing,
        proofUrl: null,
        updatedAt: Date.now()
      });
      toast.success('Đã xóa minh chứng');
    } catch (error) {
      toast.error('Lỗi khi xóa minh chứng');
    }
  };

  const handleExtraFileUpload = async (employeeId: string, file: File) => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    
    setUploading(`extra_${employeeId}`);
    try {
      if (!file.type.startsWith('image/')) {
        toast.error('Vui lòng chỉ tải lên tệp hình ảnh');
        return;
      }

      const base64Image = await compressImage(file);
      
      const existing = attendance.find(a => a.employeeId === employeeId && a.date === dateStr);
      await saveAttendance({
        id: `${employeeId}_${dateStr}`,
        employeeId,
        date: dateStr,
        status: existing?.status || 'present',
        proofUrl: existing?.proofUrl || null,
        extraProofUrl: base64Image,
        workContent: existing?.workContent || '',
        leaveType: existing?.leaveType || undefined,
        luuDong: existing?.luuDong || undefined,
        thueXe: existing?.thueXe || undefined,
        atd: existing?.atd || undefined,
        chtt: existing?.chtt,
        tg: existing?.tg,
        ca3: existing?.ca3,
        pctn: existing?.pctn,
        notes: existing?.notes || '',
        updatedAt: Date.now()
      });
      toast.success('Đã tải lên đính kèm chấm công thêm');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Lỗi khi xử lý hình ảnh: ' + (error.message || 'Vui lòng thử lại'));
    } finally {
      setUploading(null);
    }
  };

  const handleRemoveExtraProof = async (employeeId: string) => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const existing = attendance.find(a => a.employeeId === employeeId && a.date === dateStr);
    
    if (!existing) return;

    try {
      await saveAttendance({
        ...existing,
        extraProofUrl: null,
        updatedAt: Date.now()
      });
      toast.success('Đã xóa đính kèm chấm công thêm');
    } catch (error) {
      toast.error('Lỗi khi xóa đính kèm');
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Card */}
        <Card className="border-emerald-200 shadow-sm rounded-2xl overflow-hidden bg-emerald-50/30">
          <CardHeader className="border-b border-emerald-100 bg-emerald-100/50 flex flex-row items-center justify-between py-4">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-emerald-700">Thông tin tổ</CardTitle>
            {unconfirmedCount > 0 && (
              <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                Chưa chấm: {unconfirmedCount}
              </span>
            )}
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-foreground">{selectedTeam}</span>
                <span className="text-sm text-muted-foreground">Tổng số: {filteredEmployees.length} nhân viên</span>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Chọn Tổ</label>
                <Select value={selectedTeam || (availableTeams[0] || "")} onValueChange={setSelectedTeam}>
                  <SelectTrigger className="rounded-xl border-border bg-slate-50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl" position="popper">
                    {availableTeams.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filter Card */}
        <Card className="border-amber-200 shadow-sm rounded-2xl overflow-hidden bg-amber-50/30">
          <CardHeader className="border-b border-amber-100 bg-amber-100/50">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-amber-700">Thời gian</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-foreground">{format(selectedDate, 'dd/MM/yyyy')}</span>
                <span className="text-sm text-muted-foreground capitalize">{format(selectedDate, 'EEEE', { locale: vi })}</span>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Chọn Ngày</label>
                <Popover>
                  <PopoverTrigger className={cn(buttonVariants({ variant: "outline" }), "w-full justify-start text-left font-normal rounded-xl border-border bg-slate-50")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(selectedDate, 'dd/MM/yyyy')}
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 rounded-2xl overflow-hidden shadow-xl border-border">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => date && setSelectedDate(date)}
                      initialFocus
                      locale={vi}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-violet-200 shadow-sm rounded-2xl overflow-hidden bg-violet-50/10">
        <CardHeader className="border-b border-violet-100 bg-violet-100/50 flex flex-row items-center justify-between py-4">
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-violet-700">Chi tiết chấm công</CardTitle>
          <div className="text-xs font-medium text-violet-600/80">
            {selectedTeam} • {format(selectedDate, 'dd/MM/yyyy')}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow className="hover:bg-transparent border-border">
                <TableHead className="w-[100px] font-bold text-slate-500">Mã NV</TableHead>
                <TableHead className="font-bold text-slate-500">Họ và tên</TableHead>
                <TableHead className="font-bold text-slate-500">Nội dung công tác</TableHead>
                <TableHead className="w-[120px] text-center font-bold text-slate-500">LĐ</TableHead>
                <TableHead className="w-[80px] text-center font-bold text-slate-500">Thuê xe</TableHead>
                <TableHead className="w-[80px] text-center font-bold text-slate-500">ATĐ</TableHead>
                <TableHead className="w-[80px] text-center font-bold text-slate-500">CHTT</TableHead>
                <TableHead className="w-[120px] text-center font-bold text-slate-500">SXKD</TableHead>
                <TableHead className="w-[80px] text-center font-bold text-slate-500">TG</TableHead>
                <TableHead className="w-[80px] text-center font-bold text-slate-500">Ca 3</TableHead>
                <TableHead className="w-[120px] text-center font-bold text-slate-500">PCTN</TableHead>
                <TableHead className="w-[150px] font-bold text-slate-500">Đính kèm ATĐ</TableHead>
                <TableHead className="w-[150px] font-bold text-slate-500">Đính kèm chấm công thêm</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground italic">
                    Không có nhân viên nào trong tổ này
                  </TableCell>
                </TableRow>
              ) : (
                filteredEmployees.map(emp => {
                  const record = attendance.find(a => a.employeeId === emp.employeeId && a.date === format(selectedDate, 'yyyy-MM-dd'));
                  const isConfirmed = !!record?.confirmed;
                  
                  return (
                    <TableRow key={emp.employeeId} className="border-border hover:bg-slate-50/80 even:bg-slate-50/30 transition-colors">
                      <TableCell className="font-bold text-primary">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleConfirmToggle(emp.employeeId)}
                            className="focus:outline-none transition-transform active:scale-90"
                            title={isConfirmed ? "Hủy xác nhận" : "Xác nhận chấm công"}
                          >
                            {isConfirmed ? (
                              <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                            ) : (
                              <div className="w-5 h-5 rounded-full border-2 border-slate-200 shrink-0 hover:border-primary/50" />
                            )}
                          </button>
                          {emp.employeeId}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{emp.fullName}</TableCell>
                      <TableCell>
                        <WorkContentInput 
                          initialValue={record?.workContent || ''}
                          onSave={(val) => handleWorkContentChange(emp.employeeId, val)}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Select 
                          value={record?.luuDong || ''} 
                          onValueChange={(val) => handleLuuDongChange(emp.employeeId, val)}
                        >
                          <SelectTrigger className="w-24 h-8 text-xs rounded-lg">
                            <SelectValue placeholder="Chọn..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value=" ">Không</SelectItem>
                            <SelectItem value="KS">KS (Khả năng xây dựng đd &amp; TBA &lt; 110Kv)</SelectItem>
                            <SelectItem value="XL">XL (Xây gắn ĐD&amp;TBA &lt; 110)</SelectItem>
                            <SelectItem value="VH">VH (QLVH đđ &lt; 110)</SelectItem>
                            <SelectItem value="BT">BT (sửa chữa, bảo dưỡng, thí nghiệm đd&amp;TBA &lt; 110)</SelectItem>
                            <SelectItem value="G">G (ghi, Phúc tra ghi chỉ số)</SelectItem>
                            <SelectItem value="ĐK">ĐK (treo reo, khảo sát di chuyển công tơ, TU, TI)</SelectItem>
                            <SelectItem value="ĐC">ĐC (đóng cắt điện đòi nợ)</SelectItem>
                            <SelectItem value="KT">KT (KTGSMBĐ, kiểm tra theo dõi TTĐN, quản lý HTĐĐ)</SelectItem>
                            <SelectItem value="AG">AG (áp giá điện)</SelectItem>
                            <SelectItem value="T">T (Thu tiền điện tại nhà KH)</SelectItem>
                            <SelectItem value="Gis">Gis (thu thập thông tin địa lý Gis)</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-center">
                        <Select 
                          value={record?.thueXe || ''} 
                          onValueChange={(val) => handleThueXeChange(emp.employeeId, val)}
                        >
                          <SelectTrigger className="w-24 h-8 text-xs rounded-lg">
                            <SelectValue placeholder="Chọn..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value=" ">Không</SelectItem>
                            <SelectItem value="KS">KS (Khảo sát xây dựng đd &amp; TBA &lt; 110Kv)</SelectItem>
                            <SelectItem value="XL">XL (Xâu lắp đd&amp;TBA &lt; 110)</SelectItem>
                            <SelectItem value="VH">VH (QLVH đd &lt; 110)</SelectItem>
                            <SelectItem value="BT">BT (sửa chữa, bảo dưỡng, thí nghiệm đd&amp;TBA &lt; 110)</SelectItem>
                            <SelectItem value="G">G (ghi, phúc tra ghi chỉ số)</SelectItem>
                            <SelectItem value="ĐK">ĐK (treo tháo, khảo sát di dời công tơ, TU, TI)</SelectItem>
                            <SelectItem value="ĐC">ĐC (đóng cắt điện đòi nợ)</SelectItem>
                            <SelectItem value="KT">KT (KTGSMBĐ, kiểm tra theo dõi TTĐN, quản lý HTĐĐ)</SelectItem>
                            <SelectItem value="AG">AG (áp giá điện)</SelectItem>
                            <SelectItem value="T">T (Thu tiền điện tại nhà KH)</SelectItem>
                            <SelectItem value="Gis">Gis (thu thập thông tin địa lý Gis)</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-center">
                        <Select 
                          value={record?.atd || ''} 
                          onValueChange={(val) => handleAtdChange(emp.employeeId, val)}
                        >
                          <SelectTrigger className="w-24 h-8 text-xs rounded-lg">
                            <SelectValue placeholder="Chọn..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value=" ">Không</SelectItem>
                            <SelectItem value="X">X</SelectItem>
                            <SelectItem value="VH">VH: QLVH hệ thống điện có cấp điện áp &lt;110 kV</SelectItem>
                            <SelectItem value="ĐK">ĐK: treo tháo ĐK; khảo sát, lắp đặt và di dời công tơ</SelectItem>
                            <SelectItem value="KT">KT: Quản lý và kiểm tra công tơ tại hiện trường; kiểm tra theo dõi TTĐN; kiểm tra sử dụng điện; kiểm tra áp giá điện</SelectItem>
                            <SelectItem value="KĐ">KĐ: Cài đặt công tơ; kiểm định và sữa chữa công tơ; sữa chữa nhỏ hòm công tơ; kiểm tra, kiểm định, thay thế định kỳ TI, TU, công tơ điện tử</SelectItem>
                            <SelectItem value="G">G: ghi chỉ số; phúc tra ghi chỉ số; điều hành ghi chỉ số</SelectItem>
                            <SelectItem value="ĐC">ĐC: cắt đóng điện đòi nợ</SelectItem>
                            <SelectItem value="GX">GX: Theo dõi vận hành và xử lý sự cố đo ghi từ xa</SelectItem>
                            <SelectItem value="VT">VT: ngày công phối hợp xử lý sự cố VTDR, CNTT</SelectItem>
                            <SelectItem value="L,T">L,T (Lễ, Tết)</SelectItem>
                            <SelectItem value="P">P (Phép)</SelectItem>
                            <SelectItem value="O">O (Ốm)</SelectItem>
                            <SelectItem value="TS">TS (Thai sản)</SelectItem>
                            <SelectItem value="H">H (Học)</SelectItem>
                            <SelectItem value="Hdh">Hdh (Học dài hạn)</SelectItem>
                            <SelectItem value="DL">DL (Tham quan, du lịch)</SelectItem>
                            <SelectItem value="Ro">Ro (Riêng không lương)</SelectItem>
                            <SelectItem value="DS">DS (Dưỡng sức phục hồi sức khỏe)</SelectItem>
                            <SelectItem value="B">B (nghỉ bù)</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-center">
                        <TgInput 
                          initialValue={record?.chtt}
                          onSave={(val) => handleChttChange(emp.employeeId, val)}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Select 
                          value={record?.leaveType || ''} 
                          onValueChange={(val) => handleLeaveTypeChange(emp.employeeId, val)}
                        >
                          <SelectTrigger className="w-24 h-8 text-xs rounded-lg">
                            <SelectValue placeholder="Chọn..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value=" ">Không</SelectItem>
                            <SelectItem value="X">X</SelectItem>
                            <SelectItem value="L,T">L,T (Lễ, Tết)</SelectItem>
                            <SelectItem value="P">P (Phép)</SelectItem>
                            <SelectItem value="O">O (Ốm)</SelectItem>
                            <SelectItem value="TS">TS (Thai sản)</SelectItem>
                            <SelectItem value="H">H (Học)</SelectItem>
                            <SelectItem value="Hdh">Hdh (Học dài hạn)</SelectItem>
                            <SelectItem value="DL">DL (Tham quan, du lịch)</SelectItem>
                            <SelectItem value="Ro">Ro (Riêng không lương)</SelectItem>
                            <SelectItem value="DS">DS (Dưỡng sức)</SelectItem>
                            <SelectItem value="B">B (Nghỉ bù)</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <TgInput 
                          initialValue={record?.tg}
                          onSave={(val) => handleTgChange(emp.employeeId, val)}
                        />
                      </TableCell>
                      <TableCell>
                        <TgInput 
                          initialValue={record?.ca3}
                          onSave={(val) => handleCa3Change(emp.employeeId, val)}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Select 
                          value={record?.pctn || ''} 
                          onValueChange={(val) => handlePctnChange(emp.employeeId, val)}
                        >
                          <SelectTrigger className="w-24 h-8 text-xs rounded-lg">
                            <SelectValue placeholder="Chọn..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value=" ">Không</SelectItem>
                            <SelectItem value="LX">LX: Công nhân được giao thực hiện nhiệm vụ đồng thời kiêm lái xe</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {record?.proofUrl ? (
                            <div className="flex items-center gap-1">
                              <Dialog>
                                <DialogTrigger className={buttonVariants({ variant: "ghost", size: "sm", className: "h-8 px-2 text-primary hover:text-primary hover:bg-primary/10 gap-1" })}>
                                  <Eye className="w-4 h-4" /> Xem
                                </DialogTrigger>
                                <DialogContent className="max-w-3xl">
                                  <DialogHeader>
                                    <DialogTitle>Đính kèm ATĐ - {emp.fullName}</DialogTitle>
                                  </DialogHeader>
                                  <div className="mt-4 flex justify-center bg-slate-100 rounded-xl overflow-hidden p-2">
                                    <img 
                                      src={record.proofUrl} 
                                      alt="Proof" 
                                      className="max-w-full max-h-[70vh] object-contain shadow-lg" 
                                      referrerPolicy="no-referrer"
                                    />
                                  </div>
                                  <div className="mt-4 flex justify-end">
                                    <a href={record.proofUrl} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline" })}>
                                      Mở trong tab mới
                                    </a>
                                  </div>
                                </DialogContent>
                              </Dialog>
                              
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                onClick={() => handleRemoveProof(emp.employeeId)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <label className="cursor-pointer">
                              <Input 
                                type="file" 
                                className="hidden" 
                                accept="image/*"
                                onChange={(e) => e.target.files?.[0] && handleFileUpload(emp.employeeId, e.target.files[0])}
                                disabled={uploading === emp.employeeId}
                              />
                              <div className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-primary transition-colors px-2 py-1 rounded-md hover:bg-slate-100">
                                <FileUp className="w-4 h-4" />
                                {uploading === emp.employeeId ? 'Đang tải...' : 'Tải lên'}
                              </div>
                            </label>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {record?.extraProofUrl ? (
                            <div className="flex items-center gap-1">
                              <Dialog>
                                <DialogTrigger className={buttonVariants({ variant: "ghost", size: "sm", className: "h-8 px-2 text-primary hover:text-primary hover:bg-primary/10 gap-1" })}>
                                  <Eye className="w-4 h-4" /> Xem
                                </DialogTrigger>
                                <DialogContent className="max-w-3xl">
                                  <DialogHeader>
                                    <DialogTitle>Đính kèm chấm công thêm - {emp.fullName}</DialogTitle>
                                  </DialogHeader>
                                  <div className="mt-4 flex justify-center bg-slate-100 rounded-xl overflow-hidden p-2">
                                    <img 
                                      src={record.extraProofUrl} 
                                      alt="Extra Proof" 
                                      className="max-w-full max-h-[70vh] object-contain shadow-lg" 
                                      referrerPolicy="no-referrer"
                                    />
                                  </div>
                                  <div className="mt-4 flex justify-end">
                                    <a href={record.extraProofUrl} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline" })}>
                                      Mở trong tab mới
                                    </a>
                                  </div>
                                </DialogContent>
                              </Dialog>
                              
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                onClick={() => handleRemoveExtraProof(emp.employeeId)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <label className="cursor-pointer">
                              <Input 
                                type="file" 
                                className="hidden" 
                                accept="image/*"
                                onChange={(e) => e.target.files?.[0] && handleExtraFileUpload(emp.employeeId, e.target.files[0])}
                                disabled={uploading === `extra_${emp.employeeId}`}
                              />
                              <div className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-primary transition-colors px-2 py-1 rounded-md hover:bg-slate-100">
                                <FileUp className="w-4 h-4" />
                                {uploading === `extra_${emp.employeeId}` ? 'Đang tải...' : 'Tải lên'}
                              </div>
                            </label>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <UserGuide 
        items={[
          { title: "Chọn Tổ & Ngày", description: "Sử dụng bộ lọc để chọn Tổ quản lý và Ngày cần chấm công (mặc định là ngày hiện tại)." },
          { title: "Trạng thái & Loại công", description: "Nhập ký tự loại công (X, ĐK, BT, ...) vào ô tương ứng. Hệ thống tự động nhận diện để tổng hợp báo cáo." },
          { title: "Nội dung công tác", description: "Ghi chú chi tiết nội dung công việc thực hiện trong ngày của từng nhân viên." },
          { title: "Làm thêm & Công đặc thù", description: "Nhập số giờ làm thêm (TG), giờ Ca 3 hoặc số lần Chỉ huy trực tiếp (CHTT) nếu có." },
          { title: "Phụ cấp trách nhiệm", description: "Tích chọn nếu nhân viên đó được hưởng phụ cấp trách nhiệm (kiêm lái xe) trong ngày." },
          { title: "Minh chứng ATĐ", description: "Tải lên hình ảnh lệnh công tác hoặc hình ảnh hiện trường để làm minh chứng An toàn điện." }
        ]}
      />
    </div>
  );
}
