import { HashRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import HolidayPage from './pages/HolidayPage';
import CalendarPage from './pages/CalendarPage';
import ContributePage from './pages/ContributePage';
import './App.css';

function App() {
  return (
    <HashRouter>
      <div className="app-layout">
        <Navbar />
        <main className="app-main">
          <Routes>
            <Route path="/"            element={<HomePage />} />
            <Route path="/holiday/:id" element={<HolidayPage />} />
            <Route path="/calendar"    element={<CalendarPage />} />
            <Route path="/contribute"  element={<ContributePage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </HashRouter>
  );
}

export default App;
