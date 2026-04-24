import * as React from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { 
  ShieldCheck, 
  ShieldAlert,
  AlertTriangle,
  LayoutDashboard, 
  FolderTree, 
  FileText, 
  Users, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  User as UserIcon,
  Archive,
  CalendarDays,
  MoreHorizontal,
  RefreshCw,
  ChevronLeft,
  History
} from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';
import { dbApi } from '../../db/storage';
import { FinancialYear } from '../../types';

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [user, setUser] = React.useState<any>(null);
  const [activeYear, setActiveYear] = React.useState<FinancialYear | null>(null);
  const [adminDisplayName, setAdminDisplayName] = React.useState('Admin');

  React.useEffect(() => {
    const init = async () => {
      await dbApi.init();
      const [year, settings] = await Promise.all([
        dbApi.getActiveYear(),
        dbApi.getSettings()
      ]);
      setActiveYear(year);
      setAdminDisplayName(settings.adminId || 'Admin');
    };
    init();
  }, []);

  React.useEffect(() => {
    const loggedInUser = localStorage.getItem('fps_current_user');
    if (!loggedInUser) {
      navigate('/login');
    } else {
      setUser(JSON.parse(loggedInUser));
    }
  }, [navigate]);

  React.useEffect(() => {
    const handleYearChange = async () => {
      const year = await dbApi.getActiveYear();
      setActiveYear(year);
    };
    window.addEventListener('fy-change', handleYearChange);
    return () => window.removeEventListener('fy-change', handleYearChange);
  }, []);

  const handleYearSelect = async (year: FinancialYear) => {
    await dbApi.setActiveYear(year);
    // When changing years, it's safer to go back to the top level 
    // because IDs for folders/plants may not exist in other years
    if (location.pathname !== '/' && location.pathname !== '/schedule') {
      navigate('/');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('fps_current_user');
    navigate('/login');
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const menuItems = [
    { name: 'Master Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'System Categories', path: '/categories', icon: FolderTree },
    { name: 'Consolidated Reports', path: '/reports', icon: FileText },
    { name: 'Plant Management', path: '/plants', icon: ShieldCheck },
    { name: 'Manage Users', path: '/users', icon: Users },
    { name: 'Others', path: '/others', icon: MoreHorizontal },
  ];

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex w-64 flex-col bg-white border-r border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <ShieldCheck className="h-6 w-6 text-white" />
            </div>
            <span className="font-bold text-lg leading-tight">FIXED PROTECTION SYSTEM</span>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex items-center w-full space-x-3 px-4 py-3 rounded-xl transition-all duration-200 text-[15px]",
                location.pathname === item.path 
                  ? "bg-blue-50 text-blue-600 font-semibold" 
                  : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.name}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100 space-y-1">
          <button
            onClick={() => navigate('/bin')}
            className={cn(
              "flex items-center w-full space-x-3 px-4 py-3 rounded-xl transition-all duration-200 text-[15px]",
              location.pathname === '/bin' 
                ? "bg-rose-50 text-rose-600 font-semibold" 
                : "text-gray-500 hover:bg-gray-100 hover:text-rose-600"
            )}
          >
            <Archive className="h-5 w-5" />
            <span>Recycle Bin</span>
          </button>
          <button
            onClick={() => navigate('/settings')}
            className={cn(
              "flex items-center w-full space-x-3 px-4 py-3 rounded-xl transition-all duration-200 text-[15px]",
              location.pathname === '/settings' 
                ? "bg-blue-50 text-blue-600 font-semibold" 
                : "text-gray-500 hover:bg-gray-100"
            )}
          >
            <Settings className="h-5 w-5" />
            <span>Settings</span>
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center w-full space-x-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-all duration-200 text-[15px]"
          >
            <LogOut className="h-5 w-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 shrink-0 z-30">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden mr-2"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <div className="md:hidden">
                 <Menu className="h-6 w-6" />
              </div>
            </Button>
            
            <div className="flex items-center space-x-3">
              {location.pathname !== '/' && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => navigate(-1)}
                  className="rounded-full h-8 w-8 hover:bg-gray-100 hidden md:flex"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              )}
              <h2 className="text-xl font-black text-gray-900 tracking-tight hidden md:block">
                {menuItems.find(i => i.path === location.pathname)?.name || 
                 (location.pathname.includes('/categories/') ? 'Testing Explorer' : 
                  location.pathname === '/bin' ? 'Recycle Bin' : 'System View')}
              </h2>
            </div>
          </div>

          <div className="flex items-center space-x-6">
            {/* Global Year Toggle */}
            <div className="flex items-center space-x-2 bg-gray-50 border border-gray-100 rounded-xl px-3 py-1.5">
              <History className="h-4 w-4 text-blue-500" />
              <select 
                className="text-xs font-bold text-gray-700 bg-transparent border-none outline-none focus:ring-0 p-0 cursor-pointer"
                value={activeYear || ''}
                onChange={(e) => handleYearSelect(e.target.value as FinancialYear)}
              >
                {['2024-25', '2025-26', '2026-27', '2027-28', '2028-29', '2029-30'].map(y => (
                  <option key={y} value={y}>FY {y}</option>
                ))}
              </select>
            </div>

            <button 
              onClick={handleRefresh}
              className="flex items-center space-x-2 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-blue-600 transition-colors group"
            >
               <RefreshCw className="h-3.5 w-3.5 group-active:rotate-180 transition-transform duration-500" />
               <span className="hidden sm:inline">Refresh Data</span>
            </button>

            <div className="flex items-center space-x-3">
            <div className="flex flex-col items-end">
              <span className="text-sm font-semibold text-gray-900">{adminDisplayName}: {user?.name || 'Guest'}</span>
              <span className="text-xs text-gray-500">{user?.role || 'Viewer'}</span>
            </div>
            <div className="h-10 w-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
          </div>
        </div>
      </header>

        {/* Dynamic Page Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </div>
      </main>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsMobileMenuOpen(false)} />
          <nav className="absolute inset-y-0 left-0 w-64 bg-white shadow-xl flex flex-col">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <span className="font-bold text-lg">FPS SYSTEM</span>
              <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)}>
                <X className="h-6 w-6" />
              </Button>
            </div>
            <div className="flex-1 p-4 space-y-2">
              {menuItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => {
                    navigate(item.path);
                    setIsMobileMenuOpen(false);
                  }}
                  className={cn(
                    "flex items-center w-full space-x-3 px-4 py-3 rounded-xl text-[15px]",
                    location.pathname === item.path ? "bg-blue-50 text-blue-600" : "text-gray-500"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </button>
              ))}
            </div>
          </nav>
        </div>
      )}
    </div>
  );
}
