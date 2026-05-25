import { HashRouter, Routes, Route } from 'react-router-dom';
import HomePage from "./pages/HomePage";
import HolidayPage from "./pages/HolidayPage";
import CalendarPage from "./pages/CalendarPage";
import ContributePage from "./pages/ContributePage";
import PeoplePage from "./pages/PeoplePage";
import "./App.css";
import AdminPage from './pages/AdminPage';

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/holiday/:id" element={<HolidayPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/people/:people" element={<PeoplePage />} />
        <Route path="/contribute" element={<ContributePage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </HashRouter>
  );
}

export default App;