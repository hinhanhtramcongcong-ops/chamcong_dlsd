import { AttendanceStatus } from "@/src/types";

export const ATTENDANCE_STATUSES: { value: AttendanceStatus; label: string; color: string }[] = [
  { value: 'present', label: 'Có mặt', color: 'bg-green-500' },
  { value: 'absent', label: 'Vắng mặt', color: 'bg-red-500' },
  { value: 'late', label: 'Đi muộn', color: 'bg-yellow-500' },
  { value: 'half-day', label: 'Nửa ngày', color: 'bg-blue-500' },
  { value: 'off', label: 'Nghỉ phép', color: 'bg-purple-500' },
];

export const TEAMS = ['Tổ KD', 'Tổ QLVH', 'Tổ KHKT', 'Tổ TH'];
