import { Routes, Route, HashRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Dashboard } from './pages/Dashboard';
import { TemplateSettings } from './pages/TemplateSettings';
import { RouletteHistory } from './pages/RouletteHistory';
import { FanscoreSettings } from './pages/FanscoreSettings';
import { UserManagement } from './pages/UserManagement';
import { ShieldSettings } from './pages/ShieldSettings';
import { StickerTest } from './pages/StickerTest';

function App() {
  return (
    <HashRouter>
      <div className="min-h-screen bg-gray-50 text-gray-900">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/templates" element={<TemplateSettings />} />
          <Route path="/roulette-history" element={<RouletteHistory />} />
          <Route path="/fanscore-settings" element={<FanscoreSettings />} />
          <Route path="/user-management" element={<UserManagement />} />
          <Route path="/shield-settings" element={<ShieldSettings />} />
          <Route path="/sticker-test" element={<StickerTest />} />
        </Routes>
        <Toaster position="top-right" richColors />
      </div>
    </HashRouter>
  );
}

export default App;