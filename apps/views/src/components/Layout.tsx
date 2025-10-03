import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Settings, History, Shield, Target } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();

  const navItems = [
    { path: '/', label: '대시보드', icon: Home },
    { path: '/templates', label: '템플릿 설정', icon: Settings },
    { path: '/roulette-history', label: '룰렛 기록', icon: History },
    { path: '/fanscore-settings', label: '애청지수 설정', icon: Target },
    { path: '/shield-settings', label: '실드 설정', icon: Shield },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 shadow-sm">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-8">애청지수 도구</h1>
          <nav className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto bg-gray-50">
        {children}
      </main>
    </div>
  );
}

