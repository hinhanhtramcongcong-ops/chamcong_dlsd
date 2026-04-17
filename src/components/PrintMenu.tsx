import { useState, useEffect, useMemo } from 'react';
import { Employee, AttendanceRecord } from '@/src/types';
import { subscribeToEmployees, getAttendanceForMonth } from '@/src/lib/db-service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { Printer, FileSpreadsheet, FileText, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import html2pdf from 'html2pdf.js';
import { useAuth } from '@/src/lib/auth-context';
import { TEAMS } from '@/src/lib/constants';
import { cn } from '@/lib/utils';
import { UserGuide } from './UserGuide';

export function PrintMenu() {
  const { adminData } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [isGenerating, setIsGenerating] = useState(false);
  
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

  const categories = [
    { id: 'sxkd', label: 'SXKD' },
    { id: 'luuDong', label: 'Lưu động' },
    { id: 'thueXe', label: 'Thuê xe' },
    { id: 'atd', label: 'ATĐ' },
    { id: 'chtt', label: 'CHTT' },
    { id: 'tg', label: 'Làm thêm giờ' },
    { id: 'ca3', label: 'Ca 3' },
    { id: 'pctn', label: 'Phụ cấp trách nhiệm' }
  ];

  const getHoliday = (date: Date): string | null => {
    const d = format(date, 'dd/MM');
    const ymd = format(date, 'yyyy-MM-dd');
    if (d === '01/01') return 'Tết Dương lịch';
    if (d === '30/04') return 'Giải phóng miền Nam';
    if (d === '01/05') return 'Quốc tế Lao động';
    if (d === '02/09') return 'Quốc khánh';
    if (ymd >= '2026-02-13' && ymd <= '2026-02-22') return 'Tết Nguyên Đán';
    if (ymd === '2026-04-26') return 'Giỗ tổ Hùng Vương';
    return null;
  };

  const exportToExcel = (catId: string) => {
    const cat = categories.find(c => c.id === catId);
    if (!cat) return;

    const wb = XLSX.utils.book_new();
    const [year, month] = selectedMonth.split('-').map(Number);

    const aoa: any[][] = [
      ['CÔNG TY ĐIỆN LỰC ĐỒNG THÁP'],
      ['ĐIỆN LỰC SA ĐÉC'],
      [''],
      [`BẢNG CHẤM CÔNG ${cat.label.toUpperCase()}${cat.id === 'sxkd' ? ' ĐIỆN' : ''}`],
      [`Tháng ${month} năm ${year}`],
      [''],
    ];

    const headerRow1 = ['Số TT', 'Mã NV', 'Họ và tên', 'Các ngày trong tháng'];
    for (let i = 1; i < daysInMonth.length; i++) headerRow1.push('');
    if (cat.id === 'luuDong') {
      headerRow1.push('Σ NC LĐ 0,2', 'Ghi chú');
    } else if (cat.id === 'ca3') {
      headerRow1.push('Σ giờ Ca 3', 'Ghi chú');
    } else if (cat.id === 'atd') {
      headerRow1.push('Σ NC 15%', 'Ghi chú');
    } else if (cat.id === 'pctn') {
      headerRow1.push('Σ thuê xe', 'Ghi chú');
    } else if (cat.id === 'thueXe') {
      headerRow1.push('Σ thuê xe', 'Ghi chú');
    } else if (cat.id === 'chtt') {
      headerRow1.push('Σ số giờ CHTT', 'Σ công CHTT', 'Ghi chú');
    } else {
      headerRow1.push('Σ NC SP', 'Σ NC TAGC', 'Ghi chú');
    }
    aoa.push(headerRow1);

    const headerRow2 = ['', '', ''];
    daysInMonth.forEach(day => headerRow2.push(format(day, 'dd')));
    if (cat.id === 'luuDong' || cat.id === 'ca3' || cat.id === 'atd' || cat.id === 'pctn' || cat.id === 'thueXe') {
      headerRow2.push('', '');
    } else if (cat.id === 'chtt') {
      headerRow2.push('', '', '');
    } else {
      headerRow2.push('', '', '');
    }
    aoa.push(headerRow2);

    const headerRow3 = ['', '', ''];
    const dowLabels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    daysInMonth.forEach(day => {
      headerRow3.push(dowLabels[day.getDay()]);
    });
    if (cat.id === 'luuDong' || cat.id === 'ca3' || cat.id === 'atd' || cat.id === 'pctn' || cat.id === 'thueXe') {
      headerRow3.push('', '');
    } else if (cat.id === 'chtt') {
      headerRow3.push('', '', '');
    } else {
      headerRow3.push('', '', '');
    }
    aoa.push(headerRow3);

    const dailyTotals = new Array(daysInMonth.length).fill(0);
    let grandTotalNC = 0;
    let grandTotalTAGC = 0;

    filteredEmployees.forEach((emp, index) => {
      const row: any[] = [index + 1, emp.employeeId, emp.fullName];
      let totalNC = 0;
      
      daysInMonth.forEach((day, dIdx) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const record = attendance.find(a => a.employeeId === emp.employeeId && a.date === dateStr);
        
        let val = '';

        if (cat.id === 'tg' || cat.id === 'ca3' || cat.id === 'chtt') {
          const hours = (record?.confirmed && record?.[cat.id as keyof AttendanceRecord]) ? (record[cat.id as keyof AttendanceRecord] as number) : 0;
          val = hours > 0 ? hours.toString() : '';
          if (hours > 0) {
            totalNC += hours;
            dailyTotals[dIdx] += hours;
          }
        } else if (cat.id === 'pctn') {
          val = (record?.confirmed && record.pctn) ? record.pctn : '';
          if (val) {
            totalNC++;
            dailyTotals[dIdx]++;
          }
        } else {
          const isActive = record?.confirmed && (
            cat.id === 'sxkd' 
              ? record.leaveType === 'X' 
              : record?.[cat.id as keyof AttendanceRecord]
          );
          
          if (isActive) {
            if (cat.id === 'sxkd') {
              val = record.leaveType || 'X';
            } else {
              const actualVal = record?.[cat.id as keyof AttendanceRecord];
              val = (typeof actualVal === 'string' && actualVal !== ' ') ? actualVal : 'X';
            }
            totalNC++;
            dailyTotals[dIdx]++;
          } else if (cat.id === 'sxkd' && record?.confirmed && record.leaveType && record.leaveType !== ' ') {
            val = record.leaveType;
          }
        }
        row.push(val);
      });

      if (cat.id === 'luuDong' || cat.id === 'ca3' || cat.id === 'atd' || cat.id === 'pctn' || cat.id === 'thueXe') {
        row.push(totalNC, '');
      } else if (cat.id === 'chtt') {
        const congCHTT = Math.round(totalNC / 8);
        row.push(totalNC, congCHTT, '');
      } else {
        row.push(totalNC, totalNC, '');
      }
      grandTotalNC += totalNC;
      if (cat.id === 'chtt') {
        grandTotalTAGC += Math.round(totalNC / 8);
      } else {
        grandTotalTAGC += totalNC;
      }
      aoa.push(row);
    });

    const totalRow: any[] = ['Tổng cộng', '', ''];
    dailyTotals.forEach(t => totalRow.push(t || ''));
    if (cat.id === 'luuDong' || cat.id === 'ca3' || cat.id === 'atd' || cat.id === 'pctn' || cat.id === 'thueXe') {
      totalRow.push(grandTotalNC, '');
    } else if (cat.id === 'chtt') {
      totalRow.push(grandTotalNC, grandTotalTAGC, '');
    } else {
      totalRow.push(grandTotalNC, grandTotalTAGC, '');
    }
    aoa.push(totalRow);

    aoa.push(['']);
    const today = new Date();
    const lastColIdx = headerRow1.length - 1;
    
    // Create footer rows with correct alignment
    const dateRow = new Array(lastColIdx + 1).fill('');
    dateRow[lastColIdx - 5] = `Sa Đéc, ngày ${today.getDate()} tháng ${today.getMonth() + 1} năm ${today.getFullYear()}`;
    aoa.push(dateRow);

    const signRow = new Array(lastColIdx + 1).fill('');
    signRow[1] = 'THIẾT LẬP';
    signRow[lastColIdx - 3] = 'TỔ TRƯỞNG';
    aoa.push(signRow);

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const merges = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } },
      { s: { r: 3, c: 0 }, e: { r: 3, c: headerRow1.length - 1 } },
      { s: { r: 4, c: 0 }, e: { r: 4, c: headerRow1.length - 1 } },
      { s: { r: 6, c: 0 }, e: { r: 8, c: 0 } }, // Số TT
      { s: { r: 6, c: 1 }, e: { r: 8, c: 1 } }, // Mã NV
      { s: { r: 6, c: 2 }, e: { r: 8, c: 2 } }, // Họ và tên
      { s: { r: 6, c: 3 }, e: { r: 6, c: 3 + daysInMonth.length - 1 } }, // Các ngày trong tháng
    ];

    if (cat.id === 'luuDong' || cat.id === 'ca3' || cat.id === 'atd' || cat.id === 'pctn' || cat.id === 'thueXe') {
      merges.push(
        { s: { r: 6, c: 3 + daysInMonth.length }, e: { r: 8, c: 3 + daysInMonth.length } }, // Single Total Column
        { s: { r: 6, c: 3 + daysInMonth.length + 1 }, e: { r: 8, c: 3 + daysInMonth.length + 1 } } // Ghi chú
      );
    } else if (cat.id === 'chtt') {
      merges.push(
        { s: { r: 6, c: 3 + daysInMonth.length }, e: { r: 8, c: 3 + daysInMonth.length } }, // Σ số giờ CHTT
        { s: { r: 6, c: 3 + daysInMonth.length + 1 }, e: { r: 8, c: 3 + daysInMonth.length + 1 } }, // Σ công CHTT
        { s: { r: 6, c: 3 + daysInMonth.length + 2 }, e: { r: 8, c: 3 + daysInMonth.length + 2 } } // Ghi chú
      );
    } else {
      merges.push(
        { s: { r: 6, c: 3 + daysInMonth.length }, e: { r: 8, c: 3 + daysInMonth.length } }, // Σ NC SP
        { s: { r: 6, c: 3 + daysInMonth.length + 1 }, e: { r: 8, c: 3 + daysInMonth.length + 1 } }, // Σ NC TAGC
        { s: { r: 6, c: 3 + daysInMonth.length + 2 }, e: { r: 8, c: 3 + daysInMonth.length + 2 } } // Ghi chú
      );
    }
    ws['!merges'] = merges;

    const wscols = [{ wch: 6 }, { wch: 10 }, { wch: 25 }];
    for (let i = 0; i < daysInMonth.length; i++) wscols.push({ wch: 4 });
    if (cat.id === 'luuDong' || cat.id === 'ca3' || cat.id === 'atd' || cat.id === 'pctn' || cat.id === 'thueXe') {
      wscols.push({ wch: 15 }, { wch: 15 });
    } else {
      wscols.push({ wch: 10 }, { wch: 10 }, { wch: 15 });
    }
    ws['!cols'] = wscols;

    XLSX.utils.book_append_sheet(wb, ws, cat.label);
    XLSX.writeFile(wb, `BCC-${cat.id}-${selectedMonth}.xlsx`);
  };

  const exportToPDF = async (catId: string) => {
    const cat = categories.find(c => c.id === catId);
    if (!cat) return;
    
    setIsGenerating(true);
    const [year, month] = selectedMonth.split('-').map(Number);
    const today = new Date();

    // Create a temporary container for PDF rendering
    const element = document.createElement('div');
    element.style.padding = '10px';
    element.style.fontFamily = '"Inter", sans-serif';
    element.style.width = '1020px'; // Further reduced to ensure it fits A4 Landscape perfectly
    element.style.backgroundColor = 'white';

    const html = `
      <div style="margin-bottom: 15px; display: flex; justify-content: space-between;">
        <div>
          <div style="font-weight: bold; font-size: 11px;">CÔNG TY ĐIỆN LỰC ĐỒNG THÁP</div>
          <div style="font-weight: bold; font-size: 11px;">ĐIỆN LỰC SA ĐÉC</div>
        </div>
      </div>
      <div style="text-align: center; margin-bottom: 15px;">
        <div style="font-weight: bold; font-size: 16px; text-transform: uppercase;">BẢNG CHẤM CÔNG ${cat.label.toUpperCase()}${cat.id === 'sxkd' ? ' ĐIỆN' : ''}</div>
        <div style="font-size: 12px;">Tháng ${month} năm ${year}</div>
      </div>
      <table style="width: 100%; border-collapse: collapse; font-size: 12px; border: 1px solid black; table-layout: fixed;">
        <thead>
          <tr>
            <th rowspan="2" style="border: 1px solid black; padding: 6px 2px; width: 35px;">Số TT</th>
            <th rowspan="2" style="border: 1px solid black; padding: 6px 2px; width: 55px;">Mã NV</th>
            <th rowspan="2" style="border: 1px solid black; padding: 6px 4px; width: 130px;">Họ và tên</th>
            <th colspan="${daysInMonth.length}" style="border: 1px solid black; padding: 6px 2px;">Các ngày trong tháng</th>
            ${cat.id === 'luuDong' ? `
              <th rowspan="2" style="border: 1px solid black; padding: 6px 2px; width: 80px;">Σ NC LĐ 0,2</th>
            ` : cat.id === 'ca3' ? `
              <th rowspan="2" style="border: 1px solid black; padding: 6px 2px; width: 80px;">Σ giờ Ca 3</th>
            ` : cat.id === 'atd' ? `
              <th rowspan="2" style="border: 1px solid black; padding: 6px 2px; width: 80px;">Σ NC 15%</th>
            ` : cat.id === 'pctn' ? `
              <th rowspan="2" style="border: 1px solid black; padding: 6px 2px; width: 80px;">Σ thuê xe</th>
            ` : cat.id === 'thueXe' ? `
              <th rowspan="2" style="border: 1px solid black; padding: 6px 2px; width: 80px;">Σ thuê xe</th>
            ` : cat.id === 'chtt' ? `
              <th rowspan="2" style="border: 1px solid black; padding: 6px 2px; width: 45px;">Σ số giờ CHTT</th>
              <th rowspan="2" style="border: 1px solid black; padding: 6px 2px; width: 45px;">Σ công CHTT</th>
            ` : `
              <th rowspan="2" style="border: 1px solid black; padding: 6px 2px; width: 40px;">Σ NC SP</th>
              <th rowspan="2" style="border: 1px solid black; padding: 6px 2px; width: 40px;">Σ NC TAGC</th>
            `}
            <th rowspan="2" style="border: 1px solid black; padding: 6px 2px; width: 60px;">Ghi chú</th>
          </tr>
          <tr>
            ${daysInMonth.map(day => {
              const dow = day.getDay();
              const dowLabels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
              const label = dowLabels[dow];
              const holiday = getHoliday(day);
              let color = 'black';
              if (holiday) color = 'red';
              else if (dow === 0) color = 'red';
              else if (dow === 6) color = 'orange';
              return `<th style="border: 1px solid black; padding: 4px 1px; width: 18px; color: ${color}; font-size: 10px;">${format(day, 'dd')}<br/><small style="font-size: 9px;">${label}</small></th>`;
            }).join('')}
          </tr>
        </thead>
        <tbody style="font-size: 12px;">
          ${(() => {
            const dailyTotals = new Array(daysInMonth.length).fill(0);
            let grandTotalNC = 0;
            let grandTotalTAGC = 0;
            
            const rows = filteredEmployees.map((emp, idx) => {
              let totalNC = 0;
              const cells = daysInMonth.map((day, dIdx) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const record = attendance.find(a => a.employeeId === emp.employeeId && a.date === dateStr);
                let val = '';
                if (cat.id === 'tg' || cat.id === 'ca3' || cat.id === 'chtt') {
                  const hours = (record?.confirmed && record?.[cat.id as keyof AttendanceRecord]) ? (record[cat.id as keyof AttendanceRecord] as number) : 0;
                  val = hours > 0 ? hours.toString() : '';
                  if (hours > 0) {
                    totalNC += hours;
                    dailyTotals[dIdx] += hours;
                  }
                } else if (cat.id === 'pctn') {
                  val = (record?.confirmed && record.pctn) ? record.pctn : '';
                  if (val) {
                    totalNC++;
                    dailyTotals[dIdx]++;
                  }
                } else {
                  const isActive = record?.confirmed && (cat.id === 'sxkd' ? record.leaveType === 'X' : record?.[cat.id as keyof AttendanceRecord]);
                  if (isActive) {
                    if (cat.id === 'sxkd') val = record.leaveType || 'X';
                    else val = (typeof record?.[cat.id as keyof AttendanceRecord] === 'string') ? (record?.[cat.id as keyof AttendanceRecord] as string) : 'X';
                    totalNC++;
                    dailyTotals[dIdx]++;
                  } else if (cat.id === 'sxkd' && record?.confirmed && record.leaveType && record.leaveType !== ' ') {
                    val = record.leaveType;
                  }
                }
                return `<td style="border: 1px solid black; padding: 8px 2px; text-align: center;">${val}</td>`;
              }).join('');
              
              grandTotalNC += totalNC;
              if (cat.id === 'chtt') {
                grandTotalTAGC += Math.round(totalNC / 8);
              } else {
                grandTotalTAGC += totalNC;
              }
              
              return `
                <tr>
                  <td style="border: 1px solid black; padding: 8px 2px; text-align: center;">${idx + 1}</td>
                  <td style="border: 1px solid black; padding: 8px 2px; text-align: center;">${emp.employeeId}</td>
                  <td style="border: 1px solid black; padding: 8px 4px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;">${emp.fullName}</td>
                  ${cells}
                  <td style="border: 1px solid black; padding: 8px 2px; text-align: center; font-weight: bold;">${totalNC}</td>
                  ${(cat.id !== 'luuDong' && cat.id !== 'ca3' && cat.id !== 'atd' && cat.id !== 'pctn' && cat.id !== 'thueXe') ? `
                    <td style="border: 1px solid black; padding: 8px 2px; text-align: center; font-weight: bold;">
                      ${cat.id === 'chtt' ? Math.round(totalNC / 8) : totalNC}
                    </td>
                  ` : ''}
                  <td style="border: 1px solid black; padding: 8px 2px;"></td>
                </tr>
              `;
            }).join('');

            const totalRow = `
              <tr style="background-color: #f8fafc; font-weight: bold;">
                <td colspan="3" style="border: 1px solid black; padding: 8px 4px; text-align: center;">Tổng cộng</td>
                ${dailyTotals.map(t => `<td style="border: 1px solid black; padding: 8px 2px; text-align: center;">${t || ''}</td>`).join('')}
                <td style="border: 1px solid black; padding: 8px 2px; text-align: center;">${grandTotalNC}</td>
                ${(cat.id !== 'luuDong' && cat.id !== 'ca3' && cat.id !== 'atd' && cat.id !== 'pctn' && cat.id !== 'thueXe') ? `<td style="border: 1px solid black; padding: 8px 2px; text-align: center;">${cat.id === 'chtt' ? grandTotalTAGC : grandTotalNC}</td>` : ''}
                <td style="border: 1px solid black; padding: 8px 2px;"></td>
              </tr>
            `;

            return rows + totalRow;
          })()}
        </tbody>
      </table>
      <div style="margin-top: 20px; display: flex; justify-content: space-between; font-size: 11px;">
        <div style="text-align: center; width: 250px;">
          <div style="font-weight: bold;">THIẾT LẬP</div>
        </div>
        <div style="text-align: center; width: 350px;">
          <div style="font-style: italic; margin-bottom: 5px;">Sa Đéc, ngày ${today.getDate()} tháng ${today.getMonth() + 1} năm ${today.getFullYear()}</div>
          <div style="font-weight: bold; text-align: center;">TỔ TRƯỞNG</div>
        </div>
      </div>
    `;

    element.innerHTML = html;
    document.body.appendChild(element);

    const opt = {
      margin: [10, 8, 10, 8] as [number, number, number, number], // top, left, bottom, right
      filename: `BCC-${cat.id}-${selectedMonth}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true, width: 1020 },
      jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'landscape' as const }
    };

    try {
      await html2pdf().set(opt).from(element).save();
    } finally {
      document.body.removeChild(element);
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {isGenerating && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[100] flex items-center justify-center">
          <div className="bg-white p-6 rounded-2xl shadow-xl flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="font-bold text-slate-700">Đang tạo tệp PDF...</p>
            <p className="text-xs text-slate-500">Vui lòng chờ trong giây lát</p>
          </div>
        </div>
      )}
      <Card className="border-cyan-200 shadow-sm rounded-2xl overflow-hidden bg-cyan-50/30">
        <CardHeader className="border-b border-cyan-100 bg-cyan-100/50">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-cyan-700">Bộ lọc in ấn</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase">Tháng</label>
              <Input 
                type="month" 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(e.target.value)} 
                className="rounded-xl border-border bg-slate-50"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase">Tổ</label>
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger className="rounded-xl border-border bg-slate-50">
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {categories.map(cat => (
          <Card key={cat.id} className="border-slate-200 shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
            <CardHeader className="border-b bg-slate-50/50 py-4">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-700">
                Bảng chấm công {cat.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 flex items-center justify-between gap-4">
              <div className="flex-1">
                <p className="text-xs text-slate-500">Xuất báo cáo chi tiết cho danh mục {cat.label}</p>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => exportToPDF(cat.id)} 
                  variant="outline" 
                  size="sm" 
                  disabled={isGenerating}
                  className="rounded-xl border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 gap-2"
                >
                  <FileText className="w-4 h-4" />
                  PDF
                </Button>
                <Button 
                  onClick={() => exportToExcel(cat.id)} 
                  variant="outline" 
                  size="sm" 
                  disabled={isGenerating}
                  className="rounded-xl border-green-200 text-green-600 hover:bg-green-50 hover:text-green-700 gap-2"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Excel
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <UserGuide 
        items={[
          { title: "Xuất file PDF/Excel", description: "Chọn Tháng và Tổ, sau đó nhấn nút tương ứng để tải xuống bảng chấm công theo từng danh mục." },
          { title: "Định dạng chuyên nghiệp", description: "Các file được xuất với tiêu đề, ngày tháng và các cột tổng số ngày công được tính toán tự động." },
          { title: "Bảng biểu chuẩn", description: "Hỗ trợ các bảng SXKD, Lưu động, Thuê xe, ATĐ, CHTT, Làm thêm giờ, Ca 3 và Phục cấp trách nhiệm." },
          { title: "Chốt số liệu", description: "Chỉ những dữ liệu đã được 'Xác nhận' trong phần chấm công mới hiển thị trên bản in." },
          { title: "Lưu ý in ấn", description: "File PDF được tối ưu hóa cho khổ giấy A4 ngang để đảm bảo hiển thị đầy đủ các ngày trong tháng." },
          { title: "Tính toán tự động", description: "Hệ thống tự động cộng dồn số ngày công, giờ làm thêm và làm tròn số công CHTT theo đúng quy định." }
        ]}
      />
    </div>
  );
}
