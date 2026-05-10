import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import HolidayPage from "./pages/HolidayPage";
import CalendarPage from "./pages/CalendarPage";
import ContributePage from "./pages/ContributePage";
import PeoplePage from "./pages/PeoplePage";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/holiday/:id" element={<HolidayPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/people/:people" element={<PeoplePage />} />
        <Route path="/contribute" element={<ContributePage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;