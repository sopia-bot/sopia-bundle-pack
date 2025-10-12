import type { ReactNode } from 'react';
import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Settings, History, Shield, Target, Users, BookOpen, X, ExternalLink } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const [showBanner, setShowBanner] = useState(true);

  // 로컬 스토리지에서 배너 표시 상태 로드
  useEffect(() => {
    const bannerDismissed = localStorage.getItem('guideBannerDismissed');
    if (bannerDismissed === 'true') {
      setShowBanner(false);
    }
  }, []);

  // 배너 닫기 핸들러
  const handleDismissBanner = () => {
    setShowBanner(false);
    localStorage.setItem('guideBannerDismissed', 'true');
  };

  const navItems = [
    { path: '/', label: '대시보드', icon: Home },
    { path: '/templates', label: '템플릿 설정', icon: Settings },
    { path: '/roulette-history', label: '룰렛 기록', icon: History },
    { path: '/fanscore-settings', label: '애청지수 설정', icon: Target },
    { path: '/user-management', label: '청취자 관리', icon: Users },
    { path: '/shield-settings', label: '실드 설정', icon: Shield },
  ];

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar - Fixed */}
      <aside className="w-64 bg-white border-r border-gray-200 shadow-sm flex flex-col h-screen">
        <div className="flex-1 p-6 overflow-y-auto">
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

        {/* 사용법 링크 (사이드바 하단) */}
        <div className="p-6 border-t border-gray-200">
          <a
            href="https://sopia.dev/bundles/starter-pack"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-gray-600 hover:bg-gray-100 hover:text-gray-900"
          >
            <BookOpen size={20} />
            <span>사용법</span>
            <ExternalLink size={16} className="ml-auto" />
          </a>
        </div>
      </aside>

      {/* Main Content - Scrollable */}
      <main className="flex-1 overflow-y-auto bg-gray-50 h-screen">
        {/* 사용법 안내 배너 */}
        {showBanner && (
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md sticky top-0 z-10">
            <div className="flex items-center justify-between px-8 py-4">
              <div className="flex items-center gap-3">
                <BookOpen size={24} className="flex-shrink-0" />
                <p className="text-base font-medium">
                  사용법은{' '}
                  <a
                    href="https://sopia.dev/bundles/starter-pack"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-blue-100 font-semibold inline-flex items-center gap-1"
                  >
                    여기
                    <ExternalLink size={14} />
                  </a>
                  {' '}를 참고해 주세요.
                </p>
              </div>
              <button
                onClick={handleDismissBanner}
                className="p-1 rounded-lg hover:bg-blue-800 transition-colors flex-shrink-0"
                aria-label="배너 닫기"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        )}

        {/* 페이지 콘텐츠 */}
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

