import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Bell,
  Building2,
  Camera,
  ClipboardList,
  Gauge,
  Gift,
  LogOut,
  Map as MapIcon,
  Menu,
  Recycle,
  Route as RouteIcon,
  Settings,
  ShieldCheck,
  TrendingUp,
  Truck,
  User as UserIcon,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Avatar, Dropdown, Logo, MenuItem } from '../ui/Misc';
import { notificationsService } from '../../services/notificationsService';
import { ROLE_META } from '../../utils/labels';

export interface NavItem {
  to: string;
  label: string;
  icon: typeof Gauge;
  end?: boolean;
}
export interface NavSection {
  title?: string;
  items: NavItem[];
}

export const CITIZEN_NAV: NavSection[] = [
  {
    items: [
      { to: '/dashboard', label: 'Overview', icon: Gauge, end: true },
      { to: '/classify', label: 'Classify Waste', icon: Camera },
      { to: '/report', label: 'Report Waste', icon: ClipboardList },
      { to: '/reports', label: 'My Reports', icon: ClipboardList },
      { to: '/map', label: 'Live Map', icon: MapIcon },
      { to: '/analytics', label: 'My Analytics', icon: BarChart3 },
      { to: '/eco-points', label: 'Eco Points', icon: Gift },
    ],
  },
];

export const MUNICIPALITY_NAV: NavSection[] = [
  {
    title: 'Operations',
    items: [
      { to: '/municipality', label: 'Overview', icon: Gauge, end: true },
      { to: '/municipality/reports', label: 'Reports', icon: ClipboardList },
      { to: '/municipality/bins', label: 'Bins', icon: Recycle },
      { to: '/municipality/collections', label: 'Collections', icon: Truck },
      { to: '/municipality/routes', label: 'Routes', icon: RouteIcon },
    ],
  },
  {
    title: 'Intelligence',
    items: [
      { to: '/municipality/analytics', label: 'Analytics', icon: BarChart3 },
      { to: '/municipality/forecast', label: 'Forecasting', icon: TrendingUp },
      { to: '/municipality/citizens', label: 'Citizens', icon: Users },
      { to: '/municipality/recycling', label: 'Recycling', icon: Recycle },
      { to: '/municipality/settings', label: 'Settings', icon: Settings },
    ],
  },
];

export const ADMIN_NAV: NavSection[] = [
  {
    title: 'Administration',
    items: [
      { to: '/admin', label: 'System Overview', icon: ShieldCheck, end: true },
      { to: '/admin/users', label: 'Users & Roles', icon: Users },
      { to: '/admin/municipalities', label: 'Municipalities', icon: Building2 },
      { to: '/admin/categories', label: 'Waste Categories', icon: Recycle },
      { to: '/admin/ai', label: 'AI Model Stats', icon: Gauge },
      { to: '/admin/audit', label: 'Audit Logs', icon: ClipboardList },
    ],
  },
];

export function AppShell({ nav, accent = 'forest' }: { nav: NavSection[]; accent?: 'forest' | 'ink' }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let alive = true;
    notificationsService.list().then((list) => {
      if (alive) setUnread(list.filter((n) => !n.read).length);
    });
    return () => {
      alive = false;
    };
  }, [location.pathname]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const flat = useMemo(() => nav.flatMap((s) => s.items), [nav]);

  if (!user) return null;

  const sidebarBg = accent === 'ink' ? 'bg-ink-950' : 'bg-forest-950';

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-between px-5">
        <Link to="/" aria-label="BinAlert home">
          <Logo dark />
        </Link>
        <button className="rounded-lg p-1.5 text-forest-100/60 hover:bg-forest-900 lg:hidden" onClick={() => setSidebarOpen(false)} aria-label="Close navigation">
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4" aria-label="Dashboard">
        {nav.map((section, si) => (
          <div key={si}>
            {section.title && (
              <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-forest-100/40">{section.title}</p>
            )}
            <ul className="space-y-1">
              {section.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                        isActive
                          ? 'bg-emerald2-500/15 text-emerald2-300 shadow-[inset_2px_0_0_0_theme(colors.emerald2.400)]'
                          : 'text-forest-100/70 hover:bg-forest-900 hover:text-white'
                      }`
                    }
                  >
                    <item.icon className="h-4.5 w-5 shrink-0" aria-hidden />
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-forest-900 p-3">
        <div className="flex items-center gap-3 rounded-xl bg-forest-900/60 p-3">
          <Avatar name={user.name} hue={user.avatarHue} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{user.name}</p>
            <p className="truncate text-[11px] text-forest-100/50">{ROLE_META[user.role].label}</p>
          </div>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="rounded-lg p-2 text-forest-100/60 transition-colors hover:bg-forest-800 hover:text-white"
            aria-label="Logout"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-canvas">
      {/* Desktop sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 hidden w-64 ${sidebarBg} lg:block`}>{sidebarContent}</aside>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-ink-950/50 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} aria-label="Close navigation" />
          <aside className={`absolute inset-y-0 left-0 w-72 animate-fade-in ${sidebarBg}`}>{sidebarContent}</aside>
        </div>
      )}

      <div className="lg:pl-64">
        {/* Topbar */}
        <header className="sticky top-0 z-30 border-b border-ink-200/70 bg-white/85 backdrop-blur-lg">
          <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <button className="rounded-lg p-2 text-ink-600 hover:bg-ink-100 lg:hidden" onClick={() => setSidebarOpen(true)} aria-label="Open navigation">
                <Menu className="h-5 w-5" />
              </button>
              <div className="hidden sm:block">
                <p className="text-xs font-semibold text-ink-400">{ROLE_META[user.role].label} workspace</p>
                <p className="text-sm font-bold text-ink-900">
                  {flat.find((f) => (f.end ? location.pathname === f.to : location.pathname.startsWith(f.to)))?.label ?? 'BinAlert'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                to="/notifications"
                className="relative rounded-lg p-2.5 text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-900"
                aria-label={`Notifications${unread ? ` (${unread} unread)` : ''}`}
              >
                <Bell className="h-5 w-5" />
                {unread > 0 && (
                  <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                    {unread}
                  </span>
                )}
              </Link>
              <Dropdown
                width="w-60"
                trigger={() => (
                  <button className="flex items-center gap-2.5 rounded-xl border border-ink-200 bg-white py-1.5 pl-1.5 pr-3 shadow-card transition-colors hover:border-ink-300" aria-label="Account menu">
                    <Avatar name={user.name} hue={user.avatarHue} size="sm" />
                    <span className="hidden text-left sm:block">
                      <span className="block max-w-[9rem] truncate text-sm font-semibold text-ink-900">{user.name}</span>
                      <span className="block text-[10px] font-semibold uppercase tracking-wider text-emerald2-600">Level {user.level}</span>
                    </span>
                  </button>
                )}
              >
                {(close) => (
                  <>
                    <div className="border-b border-ink-100 px-3.5 py-2.5">
                      <p className="truncate text-sm font-bold text-ink-900">{user.name}</p>
                      <p className="truncate text-xs text-ink-400">{user.email}</p>
                    </div>
                    <div className="pt-1.5">
                      <MenuItem icon={<UserIcon className="h-4 w-4" />} onClick={() => { close(); navigate('/profile'); }}>
                        My Profile
                      </MenuItem>
                      <MenuItem icon={<Gift className="h-4 w-4" />} onClick={() => { close(); navigate('/eco-points'); }}>
                        Eco Points & Badges
                      </MenuItem>
                      <MenuItem icon={<Settings className="h-4 w-4" />} onClick={() => { close(); navigate('/profile'); }}>
                        Settings
                      </MenuItem>
                      <MenuItem
                        danger
                        icon={<LogOut className="h-4 w-4" />}
                        onClick={() => {
                          close();
                          logout();
                          navigate('/login');
                        }}
                      >
                        Logout
                      </MenuItem>
                    </div>
                  </>
                )}
              </Dropdown>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 pb-24 sm:px-6 lg:pb-8">
          <div className="mx-auto w-full max-w-[86rem]">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-200 bg-white/95 backdrop-blur-lg lg:hidden" aria-label="Primary mobile">
        <div className="grid grid-cols-5">
          {flat.slice(0, 5).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold transition-colors ${
                  isActive ? 'text-emerald2-600' : 'text-ink-400 hover:text-ink-700'
                }`
              }
            >
              <item.icon className="h-5 w-5" aria-hidden />
              {item.label.split(' ')[0]}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
