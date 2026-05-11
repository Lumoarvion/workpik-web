'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { getUser, getCompany } from '@/lib/auth';
import { logout } from '@/lib/api';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard, MapPin, Users, Camera, AlertTriangle,
  FileText, Bell, Settings, LogOut, Menu, X, ChevronLeft,
  ClipboardList, Wrench, Package, UsersRound, DollarSign,
} from 'lucide-react';

interface NavLink {
  href: string;
  label: string;
  icon: any;
  module?: string; // if set, only show when this module is enabled
}

const allLinks: NavLink[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/sites', label: 'Sites', icon: MapPin },
  { href: '/workers', label: 'Workers', icon: Users },
  { href: '/gallery', label: 'Submissions', icon: Camera },
  { href: '/billing', label: 'Site Billing', icon: DollarSign, module: 'daily_site_log' },
  { href: '/mb', label: 'Meas. Book', icon: ClipboardList },
  { href: '/issues', label: 'Issues', icon: AlertTriangle },
  { href: '/reports', label: 'Reports', icon: FileText },
  { href: '/alerts', label: 'Alerts', icon: Bell },
  { href: '/settings', label: 'Settings', icon: Settings },
];

const managerExclude = ['settings'];
const clientOnly = ['/dashboard', '/gallery', '/issues', '/reports'];

function getLinksForRole(role: string, enabledModules: string[]) {
  let links = allLinks;

  // Filter by role
  if (role === 'MANAGER') {
    links = links.filter((l) => !managerExclude.includes(l.href.replace('/', '')));
  } else if (role === 'CLIENT') {
    links = links.filter((l) => clientOnly.includes(l.href));
  }

  // Filter by enabled modules
  links = links.filter((l) => {
    if (!l.module) return true; // always show non-module links
    return enabledModules.includes(l.module);
  });

  return links;
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUserState] = useState<any>(null);
  const [company, setCompanyState] = useState<any>(null);

  useEffect(() => {
    setUserState(getUser());
    setCompanyState(getCompany());
  }, []);

  const enabledModules: string[] = company?.enabledModules || [];
  const links = getLinksForRole(user?.role || 'CLIENT', enabledModules);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const nav = (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 p-4 border-b">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600 text-white text-sm font-bold shrink-0">W</div>
        {!collapsed && <span className="font-semibold text-gray-900 truncate">{company?.name || 'Workpik'}</span>}
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {links.map((link) => {
          const Icon = link.icon;
          const active = pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                active ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{link.label}</span>}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-3">
        <div className={cn('flex items-center gap-3 px-3 py-2', collapsed && 'justify-center')}>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-sm font-medium shrink-0">
            {user?.fullName?.[0] || 'U'}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.fullName}</p>
              <p className="text-xs text-gray-500 truncate">{user?.role}</p>
            </div>
          )}
        </div>
        <button
          onClick={handleLogout}
          className={cn('flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 w-full mt-1', collapsed && 'justify-center')}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile trigger */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 rounded-lg bg-white p-2 shadow-md border"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile sidebar */}
      <aside className={cn(
        'lg:hidden fixed inset-y-0 left-0 z-40 w-64 bg-white border-r transform transition-transform',
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        {nav}
      </aside>

      {/* Desktop sidebar */}
      <aside className={cn(
        'hidden lg:flex flex-col bg-white border-r transition-all duration-200',
        collapsed ? 'w-16' : 'w-64'
      )}>
        {nav}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex items-center justify-center p-2 border-t text-gray-400 hover:text-gray-600"
        >
          <ChevronLeft className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
        </button>
      </aside>
    </>
  );
}
