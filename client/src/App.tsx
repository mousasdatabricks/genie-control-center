import { useState } from 'react';
import { createBrowserRouter, RouterProvider, NavLink, Outlet } from 'react-router';
import {
  LayoutDashboard,
  TrendingUp,
  MessageSquare,
  ThumbsUp,
  DollarSign,
  Receipt,
  Boxes,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { FilterProvider, FilterBar } from './lib/filters';
import { I18nProvider, useT, LanguageSwitcher } from './lib/i18n';
import { BrandMark } from './components/Brand';
import { Overview } from './pages/Overview';
import { Adoption } from './pages/Adoption';
import { Usage } from './pages/Usage';
import { Quality } from './pages/Quality';
import { Costs } from './pages/Costs';
import { Billing } from './pages/Billing';
import { Spaces } from './pages/Spaces';
import { SpaceDetail } from './pages/SpaceDetail';
import { Admin } from './pages/Admin';

interface NavItem {
  to: string;
  tKey: string;
  icon: ComponentType<{ className?: string }>;
  end?: boolean;
}

const NAV: NavItem[] = [
  { to: '/', tKey: 'nav.overview', icon: LayoutDashboard, end: true },
  { to: '/adoption', tKey: 'nav.adoption', icon: TrendingUp },
  { to: '/usage', tKey: 'nav.usage', icon: MessageSquare },
  { to: '/quality', tKey: 'nav.quality', icon: ThumbsUp },
  { to: '/costs', tKey: 'nav.costs', icon: DollarSign },
  { to: '/billing', tKey: 'nav.billing', icon: Receipt },
  { to: '/spaces', tKey: 'nav.spaces', icon: Boxes },
  { to: '/admin', tKey: 'nav.admin', icon: Settings },
];

function navClass({ isActive }: { isActive: boolean }) {
  return `flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
    isActive
      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground'
  }`;
}

function Layout() {
  const t = useT();
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('genie_sidebar_collapsed') === '1';
    } catch {
      return false;
    }
  });

  const toggle = () => {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem('genie_sidebar_collapsed', next ? '1' : '0');
      } catch {
        // ignore
      }
      return next;
    });
  };

  return (
    <FilterProvider>
      <div className="flex min-h-screen flex-col bg-background lg:flex-row">
        <aside
          className={`shrink-0 bg-sidebar lg:border-r lg:border-sidebar-border ${
            collapsed ? 'lg:w-16' : 'lg:w-64'
          }`}
        >
          <div className="flex items-center justify-between gap-2 border-b border-sidebar-border px-3 py-4">
            <BrandMark collapsed={collapsed} />
            <button
              type="button"
              onClick={toggle}
              title={collapsed ? t('nav.expand') : t('nav.collapse')}
              aria-label={collapsed ? t('nav.expand') : t('nav.collapse')}
              className="hidden shrink-0 rounded-md p-1.5 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground lg:block"
            >
              {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </button>
          </div>

          <nav className="flex gap-1 overflow-x-auto p-3 lg:flex-col lg:overflow-visible">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={navClass}
                title={t(item.tKey)}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="whitespace-nowrap">{t(item.tKey)}</span>}
              </NavLink>
            ))}
          </nav>

          <div className="border-t border-sidebar-border p-3">
            {!collapsed && (
              <p className="mb-1.5 px-1 text-[11px] uppercase tracking-wide text-sidebar-foreground/50">
                {t('lang.label')}
              </p>
            )}
            <LanguageSwitcher compact={collapsed} />
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b bg-background/85 px-6 py-3 backdrop-blur">
            <FilterBar />
          </header>
          <main className="flex-1 p-6">
            <Outlet />
          </main>
          <footer className="border-t px-6 py-3 text-xs text-muted-foreground">{t('footer')}</footer>
        </div>
      </div>
    </FilterProvider>
  );
}

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Overview /> },
      { path: '/adoption', element: <Adoption /> },
      { path: '/usage', element: <Usage /> },
      { path: '/quality', element: <Quality /> },
      { path: '/costs', element: <Costs /> },
      { path: '/billing', element: <Billing /> },
      { path: '/spaces', element: <Spaces /> },
      { path: '/spaces/:id', element: <SpaceDetail /> },
      { path: '/admin', element: <Admin /> },
    ],
  },
]);

export default function App() {
  return (
    <I18nProvider>
      <RouterProvider router={router} />
    </I18nProvider>
  );
}
