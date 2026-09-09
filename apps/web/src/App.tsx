import { Route, Routes } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Home from "./pages/Home";
import VolumePage from "./pages/VolumePage";
import ChapterPage from "./pages/ChapterPage";

export default function App() {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main">
        <div className="main-inner">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/course/:volumeId" element={<VolumePage />} />
            <Route path="/course/:volumeId/:chapterId" element={<ChapterPage />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
