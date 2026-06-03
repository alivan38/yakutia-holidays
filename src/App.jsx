import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import HolidayPage from './pages/HolidayPage';
import CalendarPage from './pages/CalendarPage';
import ContributePage from './pages/ContributePage';
import ContributeEventPage from './pages/ContributeEventPage';
import PrivacyPage from './pages/PrivacyPage';
import NotFoundPage from './pages/NotFoundPage';
import './App.css';
import './DrumPicker.css';

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <main className="app-main">
        <Routes>
          <Route path="/"            element={<HomePage />} />
          <Route path="/holiday/:id" element={<HolidayPage />} />
          <Route path="/calendar"    element={<CalendarPage />} />
          <Route path="/contribute"       element={<ContributePage />} />
          <Route path="/contribute/event" element={<ContributeEventPage />} />
          <Route path="/privacy"     element={<PrivacyPage />} />
          <Route path="*"            element={<NotFoundPage />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;
