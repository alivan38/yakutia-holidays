import { HashRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import HolidayPage from './pages/HolidayPage';
import CalendarPage from './pages/CalendarPage';
import ContributePage from './pages/ContributePage';
import PrivacyPage from './pages/PrivacyPage';
import NotFoundPage from './pages/NotFoundPage';
import './App.css';
import './DrumPicker.css';

function App() {
  return (
    <HashRouter>
      <Navbar />
      <main className="app-main">
        <Routes>
          <Route path="/"            element={<HomePage />} />
          <Route path="/holiday/:id" element={<HolidayPage />} />
          <Route path="/calendar"    element={<CalendarPage />} />
          <Route path="/contribute"  element={<ContributePage />} />
          <Route path="/privacy"     element={<PrivacyPage />} />
          <Route path="*"            element={<NotFoundPage />} />
        </Routes>
      </main>
    </HashRouter>
  );
}

export default App;
