export interface Admin {
  id: string;
  email: string;
  role: 'admin' | 'editor';
  teamAccess?: string; // 'ALL' for Trưởng/Phó Điện lực or Admin, or specific team name
  createdAt: number;
}

export interface Employee {
  id: string;
  employeeId: string; // Mã số NV
  fullName: string; // Họ và tên
  team: string; // Tổ
  gender: 'Nam' | 'Nữ'; // Giới tính
  createdAt: number;
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'half-day' | 'off';

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  proofUrl?: string;
  extraProofUrl?: string;
  workContent?: string;
  leaveType?: string; // Replaced sxkd boolean
  luuDong?: string; // Changed from boolean to string
  thueXe?: string; // Changed from boolean to string
  atd?: string; // Changed from boolean to string
  chtt?: number; // Changed from boolean to number
  tg?: number; // Làm thêm giờ
  ca3?: number; // Ca 3
  pctn?: string; // Phụ cấp trách nhiệm
  confirmed?: boolean;
  notes?: string;
  updatedAt: number;
}

export interface Team {
  id: string;
  name: string;
}
