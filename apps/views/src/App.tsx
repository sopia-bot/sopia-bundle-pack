import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Dashboard } from './pages/Dashboard';
import { TemplateSettings } from './pages/TemplateSettings';
import { RouletteHistory } from './pages/RouletteHistory';
import { FanscoreSettings } from './pages/FanscoreSettings';
import { ShieldSettings } from './pages/ShieldSettings';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50 text-gray-900">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/templates" element={<TemplateSettings />} />
          <Route path="/roulette-history" element={<RouletteHistory />} />
          <Route path="/fanscore-settings" element={<FanscoreSettings />} />
          <Route path="/shield-settings" element={<ShieldSettings />} />
        </Routes>
        <Toaster position="top-right" richColors />
      </div>
    </Router>
  );
}

export default App;