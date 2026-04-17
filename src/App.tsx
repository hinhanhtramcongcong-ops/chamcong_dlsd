import { useState } from 'react';
import { AuthProvider, useAuth } from './lib/auth-context';
import { EmployeeManagement } from './components/EmployeeManagement';
import { AttendanceGrid } from './components/AttendanceGrid';
import { Reports } from './components/Reports';
import { AdminManagement } from './components/AdminManagement';
import { Button } from '@/components/ui/button';
import { LogIn, LogOut, Users, CalendarCheck, BarChart3, ClipboardList, ShieldCheck, Lock, Menu, Printer } from 'lucide-react';
import { Toaster } from 'sonner';
import { cn } from '@/lib/utils';
import { PrintMenu } from './components/PrintMenu';

function AppContent() {
  const { user, adminData, loading, login, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'employees' | 'attendance' | 'reports' | 'admins' | 'print'>('attendance');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-primary/20 rounded-full" />
          <p className="text-muted-foreground font-medium">Đang tải hệ thống...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full space-y-8 text-center bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
              <ClipboardList className="w-8 h-8 text-primary" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Hệ thống Chấm công</h1>
            <p className="text-slate-500">Vui lòng đăng nhập bằng tài khoản Google để tiếp tục</p>
          </div>
          <Button onClick={login} size="lg" className="w-full py-6 text-lg">
            <LogIn className="w-5 h-5 mr-2" />
            Đăng nhập với Google
          </Button>
        </div>
      </div>
    );
  }

  if (!adminData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full space-y-8 text-center bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-destructive/10 rounded-2xl flex items-center justify-center">
              <Lock className="w-8 h-8 text-destructive" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Truy cập bị từ chối</h1>
            <p className="text-slate-500">Tài khoản <strong>{user.email}</strong> chưa được cấp quyền sử dụng hệ thống này.</p>
            <p className="text-sm text-muted-foreground">Vui lòng liên hệ quản trị viên để được cấp quyền.</p>
          </div>
          <Button onClick={logout} variant="outline" size="lg" className="w-full">
            <LogOut className="w-5 h-5 mr-2" />
            Đăng xuất
          </Button>
        </div>
      </div>
    );
  }

  const menuItems = [
    { id: 'employees', label: 'Nhân viên', icon: Users },
    { id: 'attendance', label: 'Chấm công', icon: CalendarCheck },
    { id: 'reports', label: 'Báo cáo', icon: BarChart3 },
    { id: 'print', label: 'In ấn', icon: Printer },
    ...(adminData.role === 'admin' ? [{ id: 'admins', label: 'Phân quyền', icon: ShieldCheck }] : []),
  ] as const;

  return (
    <div className="min-h-screen bg-background font-sans flex">
      <aside className="w-64 bg-white border-r border-border flex flex-col fixed inset-y-0 left-0 z-50">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-sm mr-3">
            <ClipboardList className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-sm tracking-tight text-foreground">Điện lực Sa Đéc</span>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all",
                activeTab === item.id 
                  ? "bg-primary text-white shadow-md" 
                  : "text-slate-500 hover:bg-slate-50 hover:text-primary"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 px-2 mb-4">
            <div className="w-9 h-9 bg-slate-200 rounded-full border border-border overflow-hidden">
              {user.photoURL ? (
                <img src={user.photoURL} alt="avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold">
                  {user.displayName?.[0]}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-foreground truncate">{user.displayName}</p>
              <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={logout} className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive">
            <LogOut className="w-4 h-4" />
            Đăng xuất
          </Button>
        </div>
      </aside>

      <main className="flex-1 pl-64 p-8">
        <div className="max-w-[1200px] mx-auto">
          {activeTab === 'employees' && <EmployeeManagement />}
          {activeTab === 'attendance' && <AttendanceGrid />}
          {activeTab === 'reports' && <Reports />}
          {activeTab === 'print' && <PrintMenu />}
          {activeTab === 'admins' && <AdminManagement />}
        </div>
      </main>
      <Toaster position="top-center" richColors />
    </div>
  );
}


export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
