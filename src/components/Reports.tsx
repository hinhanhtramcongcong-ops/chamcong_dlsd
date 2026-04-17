import { useState, useEffect, useMemo } from 'react';
import { Employee, AttendanceRecord } from '@/src/types';
import { subscribeToEmployees, getAttendanceForMonth } from '@/src/lib/db-service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ATTENDANCE_STATUSES, TEAMS } from '@/src/lib/constants';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { Download, Filter } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useAuth } from '@/src/lib/auth-context';
import { UserGuide } from './UserGuide';

export function Reports() {
  const { adminData } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  
  const availableTeams = useMemo(() => {
    if (!adminData || adminData.teamAccess === 'ALL') return TEAMS;
    return [adminData.teamAccess];
  }, [adminData]);

  const [selectedTeam, setSelectedTeam] = useState<string>('all');

  useEffect(() => {
    if (availableTeams.length === 1 && selectedTeam !== availableTeams[0]) {
      setSelectedTeam(availableTeams[0]);
    }
  }, [availableTeams, selectedTeam]);

  useEffect(() => {
    const unsubEmployees = subscribeToEmployees(setEmployees);
    const unsubAttendance = getAttendanceForMonth(selectedMonth, setAttendance);
    return () => {
      unsubEmployees();
      unsubAttendance();
    };
  }, [selectedMonth]);

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(new Date(selectedMonth + '-01')),
    end: endOfMonth(new Date(selectedMonth + '-01'))
  });

  const filteredEmployees = selectedTeam === 'all' 
    ? employees.filter(emp => availableTeams.includes(emp.team))
    : employees.filter(emp => emp.team === selectedTeam && availableTeams.includes(emp.team));

  const getHoliday = (date: Date): string | null => {
    const d = format(date, 'dd/MM');
    const ymd = format(date, 'yyyy-MM-dd');
    
    // Solar holidays
    if (d === '01/01') return 'Tết Dương lịch';
    if (d === '30/04') return 'Giải phóng miền Nam';
    if (d === '01/05') return 'Quốc tế Lao động';
    if (d === '02/09') return 'Quốc khánh';
    
    // 2024 Lunar Holidays
    if (ymd >= '2024-02-08' && ymd <= '2024-02-14') return 'Tết Nguyên Đán';
    if (ymd === '2024-04-18') return 'Giỗ tổ Hùng Vương';
    
    // 2025 Lunar Holidays
    if (ymd >= '2025-01-25' && ymd <= '2025-02-02') return 'Tết Nguyên Đán';
    if (ymd === '2025-04-07') return 'Giỗ tổ Hùng Vương';

    // 2026 Lunar Holidays
    if (ymd >= '2026-02-13' && ymd <= '2026-02-22') return 'Tết Nguyên Đán';
    if (ymd === '2026-04-26') return 'Giỗ tổ Hùng Vương';

    return null;
  };

  const reportedEmployeeCount = useMemo(() => {
    const reportedIds = new Set(attendance.filter(a => a.confirmed).map(a => a.employeeId));
    return filteredEmployees.filter(emp => reportedIds.has(emp.employeeId)).length;
  }, [attendance, filteredEmployees]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <Card className="border-cyan-200 shadow-sm rounded-2xl overflow-hidden bg-cyan-50/30 lg:col-span-3 flex flex-col h-full">
          <CardHeader className="border-b border-cyan-100 bg-cyan-100/50 py-3">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-cyan-700">Bộ lọc báo cáo</CardTitle>
          </CardHeader>
          <CardContent className="p-4 flex-grow flex flex-col justify-center">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Tháng</label>
                <Input 
                  type="month" 
                  value={selectedMonth} 
                  onChange={(e) => setSelectedMonth(e.target.value)} 
                  className="h-9 rounded-xl border-border bg-slate-50 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Tổ</label>
                <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                  <SelectTrigger className="h-9 rounded-xl border-border bg-slate-50 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl" position="popper">
                    {availableTeams.length > 1 && <SelectItem value="all">Tất cả các tổ</SelectItem>}
                    {availableTeams.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-fuchsia-200 shadow-sm rounded-2xl overflow-hidden bg-fuchsia-50/30 lg:col-span-2 flex flex-col h-full">
          <CardHeader className="pb-2 border-b border-fuchsia-100 bg-fuchsia-100/50 py-3">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-fuchsia-700">Tỷ lệ chấm công</CardTitle>
          </CardHeader>
          <CardContent className="p-4 flex-grow flex flex-col items-center justify-center text-center">
            <div className="flex items-baseline gap-1">
              <span className="text-5xl font-bold text-foreground">{reportedEmployeeCount}</span>
              <span className="text-xl font-bold text-muted-foreground">/</span>
              <span className="text-2xl font-bold text-muted-foreground">{filteredEmployees.length}</span>
            </div>
            <span className="text-[10px] font-medium text-muted-foreground uppercase mt-2 tracking-wider">Nhân sự đã chấm</span>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden lg:col-span-7 flex flex-col h-full">
          <CardHeader className="border-b border-indigo-100 bg-indigo-50/30 py-3 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-indigo-700">Tổng hợp số liệu {format(new Date(selectedMonth + '-01'), 'MM/yyyy')}</CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-grow overflow-hidden">
            <Table>
              <TableHeader className="bg-indigo-50/50">
                <TableRow className="hover:bg-transparent border-indigo-100">
                  <TableHead className="h-8 py-0 font-bold text-indigo-600/80 text-[10px] uppercase">Danh mục công tác</TableHead>
                  <TableHead className="h-8 py-0 font-bold text-indigo-600/80 text-center text-[10px] uppercase">Tổng cộng</TableHead>
                  <TableHead className="h-8 py-0 font-bold text-indigo-600/80 text-center text-[10px] uppercase">Đơn vị</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  { id: 'sxkd', label: 'SXKD', unit: 'Ngày công', rowBg: 'bg-blue-50/20' },
                  { id: 'luuDong', label: 'Lưu động (LĐ)', unit: 'Ngày công', rowBg: 'bg-green-50/20' },
                  { id: 'thueXe', label: 'Thuê xe (TX)', unit: 'Ngày công', rowBg: 'bg-orange-50/20' },
                  { id: 'atd', label: 'An toàn điện (ATĐ)', unit: 'Ngày công', rowBg: 'bg-red-50/20' },
                  { id: 'chtt', label: 'CHTT', unit: 'Công', rowBg: 'bg-purple-50/20' },
                  { id: 'tg', label: 'Làm thêm giờ (TG)', unit: 'Giờ', rowBg: 'bg-yellow-50/20' },
                  { id: 'ca3', label: 'Ca 3', unit: 'Giờ', rowBg: 'bg-indigo-50/20' },
                  { id: 'pctn', label: 'Phụ cấp trách nhiệm', unit: 'Ngày công', rowBg: 'bg-teal-50/20' }
                ].map(cat => {
                  const total = filteredEmployees.reduce((acc, emp) => {
                    return acc + daysInMonth.reduce((dayAcc, day) => {
                      const dateStr = format(day, 'yyyy-MM-dd');
                      const record = attendance.find(a => a.employeeId === emp.employeeId && a.date === dateStr);
                      if (!record?.confirmed) return dayAcc;

                      if (cat.id === 'tg' || cat.id === 'ca3' || cat.id === 'chtt') {
                        const hours = (record[cat.id as keyof AttendanceRecord] as number) || 0;
                        return dayAcc + hours;
                      } else if (cat.id === 'pctn') {
                        return dayAcc + (record.pctn ? 1 : 0);
                      } else {
                        const val = cat.id === 'sxkd' ? record.leaveType : record[cat.id as keyof AttendanceRecord];
                        const isActive = cat.id === 'sxkd' ? val === 'X' : (val && val !== ' ' && val !== '');
                        return dayAcc + (isActive ? 1 : 0);
                      }
                    }, 0);
                  }, 0);

                  const displayTotal = cat.id === 'chtt' ? Math.round(total / 8) : total;

                  return (
                    <TableRow key={cat.id} className={cn("border-border/50 hover:bg-white transition-colors", cat.rowBg)}>
                      <TableCell className="py-1.5 text-xs font-semibold text-slate-700">{cat.label}</TableCell>
                      <TableCell className="py-1.5 text-center font-bold text-primary text-sm">{displayTotal > 0 ? displayTotal : '0'}</TableCell>
                      <TableCell className="py-1.5 text-center text-slate-500 text-[10px] uppercase font-bold">{cat.unit}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Category Specific Tables */}
      {[
        { id: 'sxkd', label: 'Sản xuất kinh doanh (SXKD)', color: 'bg-blue-500', textColor: 'text-blue-700', borderColor: 'border-blue-200', headerBg: 'bg-blue-100/50', cardBg: 'bg-blue-50/10' },
        { id: 'luuDong', label: 'Lưu động (LĐ)', color: 'bg-green-500', textColor: 'text-green-700', borderColor: 'border-green-200', headerBg: 'bg-green-100/50', cardBg: 'bg-green-50/10' },
        { id: 'thueXe', label: 'Thuê xe (TX)', color: 'bg-orange-500', textColor: 'text-orange-700', borderColor: 'border-orange-200', headerBg: 'bg-orange-100/50', cardBg: 'bg-orange-50/10' },
        { id: 'atd', label: 'An toàn điện (ATĐ)', color: 'bg-red-500', textColor: 'text-red-700', borderColor: 'border-red-200', headerBg: 'bg-red-100/50', cardBg: 'bg-red-50/10' },
        { id: 'chtt', label: 'Chỉ huy trực tiếp (CHTT)', color: 'bg-purple-500', textColor: 'text-purple-700', borderColor: 'border-purple-200', headerBg: 'bg-purple-100/50', cardBg: 'bg-purple-50/10' },
        { id: 'tg', label: 'Làm thêm giờ (TG)', color: 'bg-yellow-500', textColor: 'text-yellow-700', borderColor: 'border-yellow-200', headerBg: 'bg-yellow-100/50', cardBg: 'bg-yellow-50/10' },
        { id: 'ca3', label: 'Ca 3', color: 'bg-indigo-500', textColor: 'text-indigo-700', borderColor: 'border-indigo-200', headerBg: 'bg-indigo-100/50', cardBg: 'bg-indigo-50/10' },
        { id: 'pctn', label: 'Phụ cấp trách nhiệm (PCTN)', color: 'bg-teal-500', textColor: 'text-teal-700', borderColor: 'border-teal-200', headerBg: 'bg-teal-100/50', cardBg: 'bg-teal-50/10' }
      ].map(category => (
        <Card key={category.id} className={cn("shadow-sm rounded-2xl overflow-hidden", category.borderColor, category.cardBg)}>
          <CardHeader className={cn("border-b flex flex-row items-center justify-between py-4", category.borderColor, category.headerBg)}>
            <CardTitle className={cn("text-sm font-bold uppercase tracking-wider", category.textColor)}>Tổng Hợp {category.label}</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader className={cn("sticky top-0 z-40 transition-colors", category.headerBg)}>
                <TableRow className="hover:bg-transparent border-border">
                  <TableHead className={cn("sticky left-0 z-30 min-w-[80px] w-[80px] font-bold text-[10px] uppercase border-r border-black/5", category.headerBg, category.textColor)}>Mã NV</TableHead>
                  <TableHead className={cn("sticky left-[80px] z-30 min-w-[150px] w-[150px] font-bold text-[10px] uppercase border-r border-black/5 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]", category.headerBg, category.textColor)}>Họ Tên</TableHead>
                  <TableHead className={cn("sticky left-[230px] z-30 font-bold text-[10px] uppercase border-r border-black/5 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] text-center", category.headerBg, category.textColor)}>Tổng</TableHead>
                  {daysInMonth.map(day => {
                    const dayOfWeek = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][day.getDay()];
                    const holiday = getHoliday(day);
                    const isSunday = day.getDay() === 0;
                    const isSaturday = day.getDay() === 6;
                    
                    let bgClass = "bg-slate-50";
                    let textClass = "text-slate-400";
                    let subTextClass = "text-slate-300";
                    
                    if (holiday) {
                      bgClass = "bg-rose-100/80";
                      textClass = "text-rose-700";
                      subTextClass = "text-rose-600/80";
                    } else if (isSunday) {
                      bgClass = "bg-red-50";
                      textClass = "text-red-600";
                      subTextClass = "text-red-500/80";
                    } else if (isSaturday) {
                      bgClass = "bg-orange-50";
                      textClass = "text-orange-600";
                      subTextClass = "text-orange-500/80";
                    }

                    return (
                      <TableHead key={day.toString()} className={cn("min-w-[35px] text-center text-[10px] font-bold border-r border-slate-100 last:border-r-0 p-1", bgClass, textClass)} title={holiday || undefined}>
                        <div className="flex flex-col items-center justify-center">
                          <span>{format(day, 'dd')}</span>
                          <span className={cn("text-[8px] font-medium", subTextClass)}>{dayOfWeek}</span>
                        </div>
                      </TableHead>
                    );
                  })}
                  <TableHead className="sticky right-0 bg-slate-50 z-30 font-bold text-slate-500 pr-6 border-l border-slate-200 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)] text-right hidden">Tổng</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.map(emp => {
                  const total = daysInMonth.reduce((acc, day) => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const record = attendance.find(a => a.employeeId === emp.employeeId && a.date === dateStr);
                    
                    if (category.id === 'tg' || category.id === 'ca3' || category.id === 'chtt') {
                      return acc + ((record?.confirmed && record?.[category.id as keyof AttendanceRecord]) ? (record[category.id as keyof AttendanceRecord] as number) : 0);
                    } else if (category.id === 'pctn') {
                      return acc + ((record?.confirmed && record?.pctn) ? 1 : 0);
                    } else {
                      const val = record?.confirmed ? (
                        category.id === 'sxkd' 
                          ? record.leaveType 
                          : record?.[category.id as keyof AttendanceRecord]
                      ) : null;
                      const isActive = category.id === 'sxkd' ? val === 'X' : (val && val !== ' ' && val !== '');
                      return acc + (isActive ? 1 : 0);
                    }
                  }, 0);

                  return (
                    <TableRow key={emp.employeeId} className="border-border hover:bg-slate-50 transition-colors group even:bg-slate-50/20">
                      <TableCell className={cn("sticky left-0 z-10 min-w-[80px] w-[80px] font-bold text-primary border-r border-slate-100", category.cardBg === 'bg-slate-50/10' ? 'bg-white' : category.headerBg.replace('/50', '/20'))}>{emp.employeeId}</TableCell>
                      <TableCell className={cn("sticky left-[80px] z-10 min-w-[150px] w-[150px] font-medium border-r border-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]", category.cardBg === 'bg-slate-50/10' ? 'bg-white' : category.headerBg.replace('/50', '/20'))}>{emp.fullName}</TableCell>
                      <TableCell className={cn("sticky left-[230px] z-10 font-bold text-foreground border-r border-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] text-center", category.headerBg.replace('/50', '/30'))}>{total > 0 ? total : ''}</TableCell>
                      {daysInMonth.map(day => {
                        const dateStr = format(day, 'yyyy-MM-dd');
                        const record = attendance.find(a => a.employeeId === emp.employeeId && a.date === dateStr);
                        
                        let cellContent = <span className="text-slate-200 text-[10px]">•</span>;
                        
                        if (category.id === 'tg' || category.id === 'ca3' || category.id === 'chtt') {
                          const hours = (record?.confirmed && record?.[category.id as keyof AttendanceRecord]) ? (record[category.id as keyof AttendanceRecord] as number) : 0;
                          if (hours > 0) {
                            let colorClass = "text-yellow-600";
                            if (category.id === 'ca3') colorClass = "text-indigo-600";
                            if (category.id === 'chtt') colorClass = "text-purple-600";
                            cellContent = <span className={cn("text-xs font-bold", colorClass)}>{hours}</span>;
                          }
                        } else if (category.id === 'pctn') {
                          const value = record?.confirmed ? record.pctn : undefined;
                          if (value) {
                            cellContent = <span className="text-[10px] font-bold text-teal-600">{value}</span>;
                          }
                        } else {
                          const val = record?.confirmed ? (
                            category.id === 'sxkd' 
                              ? record.leaveType 
                              : record?.[category.id as keyof AttendanceRecord]
                          ) : null;

                          if (val && val !== ' ' && val !== '') {
                            const displayVal = typeof val === 'string' ? val : 'X';
                            cellContent = <span className={cn("text-[10px] font-bold", category.textColor)}>{displayVal}</span>;
                          }
                        }
                        
                        const holiday = getHoliday(day);
                        const isSunday = day.getDay() === 0;
                        const isSaturday = day.getDay() === 6;
                        
                        let cellBg = "";
                        if (holiday) cellBg = "bg-rose-50/50";
                        else if (isSunday) cellBg = "bg-red-50/30";
                        else if (isSaturday) cellBg = "bg-orange-50/30";

                        return (
                          <TableCell key={day.toString()} className={cn("text-center p-1 border-r border-slate-50 last:border-r-0", cellBg)}>
                            {cellContent}
                          </TableCell>
                        );
                      })}
                      <TableCell className="sticky right-0 bg-white z-10 text-right font-bold text-foreground pr-6 border-l border-slate-100 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)] hidden">{total}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}

      <Card className="border-emerald-200 shadow-sm rounded-2xl overflow-hidden bg-emerald-50/5">
        <CardHeader className="border-b border-emerald-100 bg-emerald-100/30 flex flex-row items-center justify-between py-4">
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-emerald-700">Chi tiết nội dung công tác</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-emerald-50/50">
              <TableRow className="hover:bg-transparent border-emerald-100">
                <TableHead className="w-[120px] font-bold text-emerald-600 text-[10px] uppercase">Ngày</TableHead>
                <TableHead className="w-[150px] font-bold text-emerald-600 text-[10px] uppercase">Họ Tên</TableHead>
                <TableHead className="font-bold text-emerald-600 text-[10px] uppercase">Nội dung công tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(() => {
                const workEntries: any[] = [];
                filteredEmployees.forEach(emp => {
                  daysInMonth.forEach(day => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const record = attendance.find(a => a.employeeId === emp.employeeId && a.date === dateStr);
                    if (record?.confirmed && record?.workContent) {
                      workEntries.push({
                        date: format(day, 'dd/MM/yyyy'),
                        name: emp.fullName,
                        content: record.workContent,
                        key: `${emp.employeeId}_${dateStr}`
                      });
                    }
                  });
                });

                if (workEntries.length === 0) {
                  return (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-muted-foreground italic">
                        Chưa có nội dung công tác nào được ghi nhận
                      </TableCell>
                    </TableRow>
                  );
                }

                return workEntries.sort((a, b) => b.date.localeCompare(a.date)).map(entry => (
                  <TableRow key={entry.key} className="border-border hover:bg-slate-50/80 even:bg-emerald-50/20 transition-colors">
                    <TableCell className="text-xs font-bold text-slate-500">{entry.date}</TableCell>
                    <TableCell className="text-sm font-medium">{entry.name}</TableCell>
                    <TableCell className="text-sm text-foreground">{entry.content}</TableCell>
                  </TableRow>
                ));
              })()}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <UserGuide 
        items={[
          { title: "Bộ lọc thông minh", description: "Chọn Tháng và Tổ để hệ thống tự động tổng hợp toàn bộ dữ liệu báo cáo trong tháng đó." },
          { title: "Tổng hợp số liệu", description: "Bảng tóm tắt nhanh tổng ngày công của các mục (SXKD, LĐ, TX, ATĐ...) hiển thị ngay hàng đầu." },
          { title: "Quy tắc SXKD", description: "Mục SXKD chỉ tính công khi nội dung nhập là 'X'. Các mục khác tính 1 công cho bất kỳ nội dung nào." },
          { title: "Bảng chi tiết danh mục", description: "Hiển thị chính xác nội dung đã nhập (ĐK, BT, số giờ...) theo từng ngày để đối soát dễ dàng." },
          { title: "Nhận diện thời gian", description: "Thứ 7 (cam), Chủ nhật (đỏ) và Ngày lễ (hồng) được tô màu nổi bật để dễ theo dõi." },
          { title: "Nhật ký công tác", description: "Cuối trang hiển thị chi tiết nội dung công việc đã thực hiện của từng nhân viên trong cả tháng." }
        ]}
      />
    </div>
  );
}
