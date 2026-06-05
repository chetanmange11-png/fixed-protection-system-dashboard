import * as React from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FolderTree, 
  LogOut, 
  Menu, 
  X,
  MoreHorizontal,
  RefreshCw,
  ChevronLeft,
  FileSpreadsheet,
  ChevronDown,
  Trash2,
  Users,
  PieChart as PieChartIcon,
  Sun,
  Moon,
  AlertOctagon
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'react-hot-toast';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import { cn } from '../../lib/utils';
import { dbApi } from '../../db/storage';
import { AdminAuthModal } from '../shared/AdminAuthModal';
import { FinancialYear } from '../../types';

import { useGlobalStore } from '../../store/useGlobalStore';

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [adminDisplayName, setAdminDisplayName] = React.useState('Admin');
  
  const [isCycleDropdownOpen, setIsCycleDropdownOpen] = React.useState(false);
  const { currentUser, initSync, initGlobal, theme, setTheme, activeCycle, setActiveCycle, categories } = useGlobalStore();

  React.useEffect(() => {
    const unsubSync = initSync();
    const unsubGlobal = initGlobal();
    return () => {
      unsubSync();
      unsubGlobal();
    };
  }, [initSync, initGlobal]);

  const loadSettingsAndCycle = React.useCallback(async () => {
    await dbApi.init();
    const settings = await dbApi.getSettings();
    setAdminDisplayName(settings.adminId || 'Admin');
    const year = await dbApi.getActiveYear();
    setActiveCycle(year);
  }, [setActiveCycle]);

  React.useEffect(() => {
    loadSettingsAndCycle();
    window.addEventListener('fy-change', loadSettingsAndCycle);
    return () => window.removeEventListener('fy-change', loadSettingsAndCycle);
  }, [loadSettingsAndCycle]);

  React.useEffect(() => {
    const loggedInUser = localStorage.getItem('fps_current_user');
    if (!loggedInUser && !currentUser) {
      navigate('/login');
    }
  }, [navigate, currentUser]);

  const handleLogout = () => {
    localStorage.removeItem('fps_current_user');
    navigate('/login');
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleExport = async () => {
    const toastId = toast.loading('Preparing Export...');
    try {
      const records = await dbApi.getTestRecords(); // gets only active cycle records implicitly in dbApi or we can map them
      const data = records.map(r => ({ 'FY': r.financialYear, 'Plant': r.plantName, 'System': r.subSystemName, 'Status': r.status }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Schedule");
      XLSX.writeFile(wb, `FPS_Export_${activeCycle}.xlsx`);
      toast.success('Export Successful', { id: toastId });
    } catch (e: any) {
      toast.error('Export failed: ' + e.message, { id: toastId });
    }
  };

  const baseMenuItems = [
    { name: 'System Analysis', path: '/analysis', icon: PieChartIcon },
    { name: 'Planning & Schedule', path: '/', icon: LayoutDashboard },
    { name: 'System Categories', path: '/categories', icon: FolderTree },
    { name: 'UTILITY HUB', path: '/others', icon: MoreHorizontal },
  ];

  const menuItems = currentUser?.role === 'Admin' 
    ? [...baseMenuItems, { name: 'Manage User', path: '/manage-users', icon: Users }]
    : baseMenuItems;

  const switchCycle = async (year: FinancialYear) => {
    await dbApi.setActiveYear(year);
    setIsCycleDropdownOpen(false);
  };

  return (
    <div className={cn("flex h-screen font-sans transition-colors duration-500", theme === 'modern' ? "theme-modern bg-[#0F172A] text-slate-200" : "bg-[#F8FAFC] text-slate-900")}>
      {/* Sidebar Desktop */}
      <aside className={cn("hidden md:flex w-64 flex-col border-r transition-colors duration-500", theme === 'modern' ? "bg-[#0F172A] border-slate-800" : "bg-white border-slate-200")}>
        <div className={cn("p-8 border-b flex flex-col items-center transition-colors duration-500", theme === 'modern' ? "border-slate-800 bg-[#0F172A]" : "border-slate-200 bg-white")}>
          <img 
            src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAScAAACrCAMAAAATgapkAAAAwFBMVEX////Sq2YAAAAfGhe/oWHt7e3a2dnLysq7urmZmJcMAAAcFxRpZ2X19fX7+/unpqUUCweuraxJRkZXVVPm5eXSq2ihn5/Qp17QqGDOo1b48+vj4uJ9fHt3dXXBwMBgXl717eCHhoXS0dFsa2pBPj3v49DbvIrr3MTfxJnjzarUr3G7m1aSkZFGRENbWVkoJCQ0MTDy6Nnk0LHMoE7gx57dwJDm3MnYtn7Qu5LEqnTkz6zApmm3lUnUw58tKCYTDg7lDUtbAAAJX0lEQVR4nO2ae3ubuBKHqQgYzMX4Et8AYzBNmtiJSZNttnv2ON//W50ZIe522/M8uwte5v0jASFj8fPMaDRCkgiCIAiCIAiCIAiCIAiCIAiCIAiCIAiCIAiCIAiCIIi/ivV6u12v2x5Ft3l5eF8gq9Xi8e0ziXWW9dtytfyUs1ys3j+3Pabusb4riyRYPZJSVR7OqMSVeifvK1g/Ls6qxJW6b3t0nWF7wZg4t68PbY+vI7y8XlaJW9Rb2yPsBNufyARCfW17jB3AvhyactdbvbQ9yvZ5/0FsylnYbQ+zbe5XvyDTp+VvbY+zZX7B6ziv27ZH2i5ff1GnT3dtj7Rd6nLcXjSoXuflL43odLsEzui07HW2+VaTZLm6/e3h4e1u1XTH27bH2iY1N1vdbdN2uxG3blc9drx1VY1FqYqyfqwJtejxenhbDU8Vi7FroavPAepzWYu6Yz1UY9fySztj7AL3Jb9b1UuXNWPrc0pe1qmRSNZS9T7rVPK75nRWX9L02O9KaeZ74+K65nc9juNFCBKzfnmDs5ZC9TkvkHIpVlt+/u3bmWuVHv3kPbeWtBD3++/NS5lObY2xC+S+JVZvN3tRuFw3ypy9LqzksfqRn37b779K9nr9+UujjtDr8FR4V6rT953vW1XTH27bH2iY1N1vdbdN2uxG3blc9drx1VY1FqYqyfqwJtejxenhbDU8Vi7FroavPAepzWYu6Yz1UY9fySztj7AL3Jb9b1UuXNWPrc0pe1qmRSNZS9T7rVPK75nRWX9L02O9KaeZ74+K65nc9juNFCBKzfnmDs5ZC9TkvkHIpVlt+/u3bmWuVHv3kPbeWtBD3++/NS5lObY2xC+S+JVZvN3tRuFw3ypy9LqzksfqRn37b779K9nr9+UujjtDr8FR4V6rT95ubvSTdvS7ObKG3PNCWyTIortPLHnSCSP6lWVVZ/NH2SFsmMyg8BnO6ufkPHNw1hOq5OeUp1AISp+2fqNOfmELVozi9ZCA9cKEwO7rfo057Lkm1+rTs9WQn4LaD09nXVCe+SW5XK5293+ZEboXF3Jd04qvgTKtFj0u+JexPy9tPC0im0vgk3iUolsGLbavD6xDvC16m4/PdPmsU77Esbsmach5W6Hg44e2Lme1ltVguXntcdjrDyyNu+P53f/O91Gjf/3FPxlTjHit13/c0s/0MG0zH3rY9CoIgiLMo4aFncdxVS8x+1NO2FFdN1bE/GJv8I8PrDCErMzQHlzrKvMOGHw+YbDDrHxtjJ7DViSMzTbJtZRMPHWZe6KfYGpOFThYb9s2eJG4doBNnCpL5FzvmOkmq6fXMnKSKTgqTZaZe6jg0Mp16SUkn6cmQ2fxSR5l0ynTageMdLnU8kk6ZTgHeDC4uuWNd1/Js4VTSySriUzTX9XHhrJg+4D9tPq+qGo30+aCUdg3m1fOuU9aJgd/luqgxi/2AsUBokqQ6zQ0DMoRAdBoxtvOeGIuVtA9PHxTJ4/8NN/+WscMm/jNjo+ycsWd/wpj+9z7cX0hJpw0celm7lqZLSjIcpkIJnRTNZLIj8geTTfHfiDlHfq4MjobhuPLTSDsww/nIbvbMjir/LhH+TJYo/AtzwTtPodPMMYphR0y0RszhWkCQz/zOd4ROYzBAfjB1Mn+NYM6UeT+VGdkPsGPNLphBhc9ZEaqfTgs+3mnGYi8yAJXOBWDTpxEHME8xx8yznUaM6GTB7kCDzFgUCLxUkAdkdWDnGnjJrvqDXneoeb+pmZCdx9chSRxDDFmGhWtGzbMJr7ASZ8KbKauEzxw6qegk7BE0MlJYxU2PvODJFPYYw4EL8l0mJv3ZkUQ6zSgk+Pr+tAwDKVoNXNRJE+YxVPTnmB2S/9XdBoWjdxjXbDY1M1sP0aLhfNsojtdTbIh/A7lKrnAyTDiSYosgm3QtCeB9gwfvqwTRDFW7g4hzBD3BivOJ9uOk8XxOZOH+dNbsoFGlsHD1sTJHqmsk60FbDL+oT0dhtUgBNOqcyhufnGh1C3y+c4cFosW68wixTyjk+JDhFIqLWd1Mso3glmPXVGCKSjyghNkmVkoh7hRX+g9N3WK2DCdC6Fll147o9OoFI/ST8msFAqvhEIniLeGLJLv52xOL2jak51bXSUvqOuE31B2LhvOLxYEO0spH4cfXuSUcFiOvVy8pk6Yv2fdf6CTDU2H8r2eyj/CtVSyyus7LNSF/MhiJcfTP9Btdg2dRr+mE09HM0fbQIqgwc3zZWRysUDRLQZFnRLVkUWqPC6aN6k+fiMvQHviWeLswyjHJyvvFmS3dZ7StoivhCdDJxGd/CuptM8mDmQz2a+7wYpmwJ8d1mDMjxQl8sQiPzGcIA3HO1gIYsAHhzLkgeLqDC1rY+FV1FdYCFZp0nkB1ojOUVMUNUx/BTuBxHyuKsomvlw/7RJ+vtcSpw279AwTJi3dY2EGxly36JZ9Il2oDeFoaknPeLAT9RTGTLArAVdqNklPjtl8mm30BFdiTfnmnVhl2elZGk0Guufpg3K7iuKkRGg99jgM5/yjm8M8Ku7nFh8QQrij0NdLC0hLO/jh6IdbhgRBEARBEATRP+yR/tMVvPuzRZna3ESJzuXeA/1wFZWo8Q6o1RYtnZ3vXHA822Nmws1SNdixftHKVpDVVvfy+zGdwhL1pjLRORVmp5I9RNGZHkCSvWYXNQ1ugCYWNzah4n+bTr9S0p787HXE5mbdNenkmvHMSxL8wZWdH+5Ap9HUlFT/CYLHbOf7U0kLmBm4ajBVTdnSp1iUc3dhMIZ45nleIsLRRFSND5MQ/4zGz2xs+cdYkewQmlRzON1pkjT3vQBWn5ued7wincBYdEkKplh52+CbKtAUJuLsaMElW9jTgGkz5kphjIVLG+xjIHmgVSj8MNNJ8rGQOU0UaYN3nmD18xm15fake/AdH/AptD7jmnRSUIT5CWwA4y/3u0OMF+GxTqYq2VioU/glXk7S4WI4dVU38aXwOLAlse2U6+ShTkEo3DXE5gAL6FwnNlbVDXMtvulyTX4HOkGQnoMFBfgTV3WaTZkxLnTiUQp1mk608Xij8ppoFuNqOnmoE9zZq+ikMF0baxtrwGvryVXq5OHkXdHJUiRlxKKmTr7QJJLsgSEyrjSOa1FZJ6Wuky2C+YyXhK/EniRe9Od+N0qw4B3hZoKErxeiDQ0kBZ8xRp3w11cLv+NdLV06gc+NhEFNUB4bAxhGJPQ7fucQX+8xuU5YePfxzSpNlZ4wYp2uQidtx2TPUnYscDcxmpbGvFDHN6Gsj6m3GcYDKza1A2qZyMHADdgOgsomQXU1tvN8W5oG4/GOxyfFG7IwDBOmaKfhXBoZsmbBnRUtgWRydDRG6KMB/DVlb4czZTwN9fh0LS/U1chXHMULrelWQDN/mqVN7v+xG6Dwe1lu5QYEQRAEQRAEQRAEQRAEQRAEQRAEQRAEQRAEQRAEQRAEQRBElf8BQrmlWxPtlUIAAAAASUVORK5CYII=" 
            alt="Reliance Logo" 
            className="h-16 w-auto mb-4 object-contain"
          />
          <span className={cn("font-extrabold text-sm tracking-widest text-center uppercase", theme === 'modern' ? "text-slate-200" : "text-slate-900")}>RIL - Fire Department</span>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex items-center w-full space-x-3 px-4 py-3 rounded-xl transition-all duration-200 text-[15px]",
                location.pathname === item.path 
                  ? (theme === 'modern' ? "bg-slate-800/80 text-[#D4AF37] font-semibold border-l-4 border-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.2)] drop-shadow-[0_0_8px_rgba(212,175,55,0.8)] rounded-none" : "bg-blue-50 text-blue-600 font-semibold border-l-4 border-blue-600 rounded-none")
                  : (theme === 'modern' ? "text-slate-400 hover:bg-slate-800 hover:text-slate-200" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900")
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.name}</span>
            </button>
          ))}
        </nav>

        <div className={cn("p-4 border-t space-y-1 transition-colors duration-500", theme === 'modern' ? "border-slate-800" : "border-slate-200")}>
          <button
            onClick={handleLogout}
            className={cn("flex items-center w-full space-x-3 px-4 py-3 rounded-xl transition-all duration-200 text-[15px]", theme === 'modern' ? "text-red-400 hover:bg-red-500/10" : "text-red-600 hover:bg-red-50")}
          >
            <LogOut className="h-5 w-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className={cn("h-16 md:h-20 border-b flex items-center justify-between px-4 md:px-6 shrink-0 z-30 transition-colors duration-500", theme === 'modern' ? "bg-slate-900/40 backdrop-blur-lg border-slate-700/50" : "bg-white border-gray-100")}>
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              className={cn("md:hidden mr-2 h-10 w-10", theme === 'modern' ? "text-slate-300 hover:bg-slate-800" : "text-gray-600")}
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </Button>
            
            <div className="flex items-center space-x-2 md:space-x-3">
              {location.pathname !== '/' && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => navigate(-1)}
                  className={cn("rounded-full h-8 w-8 hidden md:flex", theme === 'modern' ? "text-slate-300 hover:bg-slate-800" : "hover:bg-gray-100")}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              )}
              <h2 className={cn("text-lg md:text-xl font-black tracking-tight line-clamp-1", theme === 'modern' ? "text-slate-100" : "text-gray-900")}>
                {location.pathname === '/' ? 'Planning & Schedule' : 
                 (menuItems.find(i => i.path === location.pathname)?.name || 
                  (location.pathname.includes('/categories/') ? 'Testing Explorer' : 
                   location.pathname === '/others/recycle-bin' ? 'Recycle Bin' : 'System View'))}
              </h2>
            </div>
          </div>

          <div className="flex items-center space-x-3 md:space-x-4">
            {/* Global Context Bar UI */}
            <div className={cn("hidden lg:flex items-center space-x-2 mr-2 border rounded-xl p-1 shadow-sm transition-colors duration-500", theme === 'modern' ? "bg-slate-800/50 backdrop-blur-md border border-slate-700/50" : "bg-gray-50 border-gray-100")}>
              <div className="relative">
                <button 
                  onClick={() => setIsCycleDropdownOpen(!isCycleDropdownOpen)}
                  className={cn("flex items-center px-3 py-1.5 rounded-lg border shadow-sm text-xs font-black uppercase tracking-widest transition-colors", theme === 'modern' ? "bg-slate-900/80 backdrop-blur-md border-slate-700/50 text-[#D4AF37] hover:border-[#D4AF37]" : "bg-white border-gray-200 text-[#C09532] hover:border-[#C09532]")}
                >
                  Active Cycle: {activeCycle} <ChevronDown className={cn("h-3 w-3 ml-2", theme === 'modern' ? "text-slate-500" : "text-gray-400")} />
                </button>
                {isCycleDropdownOpen && (
                  <div className={cn("absolute top-10 left-0 w-40 border rounded-xl shadow-lg z-50 overflow-hidden", theme === 'modern' ? "bg-slate-800/90 backdrop-blur-lg border-slate-700/50" : "bg-white border-gray-100")}>
                    {(['2024-25', '2025-26', '2026-27', '2027-28', '2028-29', '2029-30'] as FinancialYear[]).map((y) => (
                      <button 
                        key={y}
                        onClick={() => switchCycle(y)}
                        className={cn("w-full text-left px-4 py-2 text-xs font-bold transition-colors", y === activeCycle ? (theme === 'modern' ? "bg-[#C09532]/20 text-[#D4AF37]" : "bg-[#C09532]/10 text-[#C09532]") : (theme === 'modern' ? "text-slate-300 hover:bg-slate-700" : "text-gray-600 hover:bg-gray-50"))}
                      >
                        {y}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <Button variant="outline" size="sm" onClick={handleExport} className={cn("h-8 rounded-lg text-xs px-3 transition-all", theme === 'modern' ? "bg-slate-900/50 backdrop-blur-md border-[#D4AF37]/50 text-[#D4AF37] hover:bg-slate-800/80 hover:border-[#D4AF37] hover:shadow-[0_0_15px_rgba(212,175,55,0.2)]" : "bg-white text-emerald-600")}>
                <FileSpreadsheet className="h-3.5 w-3.5 mr-1" /> Export
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setTheme(theme === 'modern' ? 'traditional' : 'modern')}
                className={cn(
                  "p-2 rounded-full transition-all duration-500",
                  theme === 'modern' 
                    ? "text-[#D4AF37] hover:bg-slate-800 hover:shadow-[0_0_15px_rgba(212,175,55,0.3)] animate-in fade-in spin-in-180" 
                    : "text-slate-400 hover:bg-slate-100 animate-in fade-in spin-in-[-180deg]"
                )}
                title="Toggle Theme"
              >
                {theme === 'modern' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
              <div className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest px-1 hidden sm:flex">
                <div className={cn("h-1.5 w-1.5 rounded-full animate-pulse mr-1", theme === 'modern' ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" : "bg-green-500")} />
                <span className={theme === 'modern' ? "text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]" : "text-green-600"}>Sync</span>
              </div>
            </div>

            <div className={cn("flex items-center space-x-2 md:space-x-3 ml-2 border-l pl-4", theme === 'modern' ? "border-slate-700/50" : "border-gray-100")}>
              <div className="hidden sm:flex flex-col items-end">
                <span className={cn("text-[11px] md:text-sm font-semibold leading-tight", theme === 'modern' ? "text-slate-200" : "text-gray-900")}>{adminDisplayName}: {currentUser?.name || 'Guest'}</span>
                <span className={cn("text-[9px] md:text-xs", theme === 'modern' ? "text-slate-400" : "text-gray-500")}>{currentUser?.role || 'Viewer'}</span>
              </div>
              <div className={cn("h-8 w-8 md:h-10 md:w-10 rounded-full flex items-center justify-center font-bold text-xs md:text-base", theme === 'modern' ? "bg-[#D4AF37]/20 text-[#D4AF37]" : "bg-[#C09532]/10 text-[#C09532]")}>
                {currentUser?.name?.[0]?.toUpperCase() || 'U'}
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6 relative z-10">
          <Outlet />
        </div>
      </main>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsMobileMenuOpen(false)} />
          <nav className={cn("absolute inset-y-0 left-0 w-64 shadow-xl flex flex-col", theme === 'modern' ? "bg-[#0F172A]" : "bg-white")}>
            <div className={cn("p-8 border-b flex flex-col items-center relative", theme === 'modern' ? "border-slate-800 bg-[#0F172A]" : "bg-white border-slate-200")}>
              <span className={cn("font-extrabold text-sm tracking-widest text-center uppercase mt-2", theme === 'modern' ? "text-slate-200" : "text-slate-800")}>RIL-HMD-FIRE</span>
              <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)} className={cn("absolute top-4 right-4", theme === 'modern' ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800" : "")}>
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
                    location.pathname === item.path 
                      ? (theme === 'modern' ? "bg-[#C09532]/20 text-[#D4AF37]" : "bg-blue-50 text-blue-600") 
                      : (theme === 'modern' ? "text-slate-400" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900")
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </button>
              ))}
            </div>
            
            {/* Global Context on Mobile */}
            <div className={cn("p-4 border-t space-y-2", theme === 'modern' ? "border-slate-800" : "border-gray-100")}>
               <p className={cn("text-xs font-black uppercase tracking-widest text-center mb-3", theme === 'modern' ? "text-slate-500" : "text-gray-400")}>Cycle Focus: {activeCycle}</p>
               <Button variant="outline" size="sm" onClick={() => { setIsMobileMenuOpen(false); handleExport(); }} className={cn("w-full justify-center rounded-xl", theme === 'modern' ? "bg-slate-800 border-slate-700 text-emerald-400 hover:bg-slate-700" : "text-emerald-600")}>
                 <FileSpreadsheet className="h-4 w-4 mr-2" /> Export Active Cycle Data
               </Button>
            </div>
            
          </nav>
        </div>
      )}
    </div>
  );
}

