import { useEffect, useState } from "react";
import { Link, Route, Routes, useLocation } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Home from "./pages/Home";
import VolumePage from "./pages/VolumePage";
import ChapterPage from "./pages/ChapterPage";
import { CrumbProvider, useCrumbValue } from "./ui/crumb";
import { volumeNumber } from "./ui/volumeMeta";

type Theme = "light" | "dark";

const THEME_KEY = "aifs-theme";

function readStoredTheme(): Theme {
  try {
    return localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

/** "vol3-language" → "Vol 03 Language" */
function volumeCrumb(volumeId: string): string {
  const match = /^vol(\d+)-(.*)$/.exec(volumeId);
  if (!match) return volumeId;
  const name = match[2].replace(/-/g, " ");
  return `Vol ${volumeNumber(volumeId, 0)} ${name}`;
}

function TopBar({
  theme,
  onToggleTheme,
  onToggleNav,
}: {
  theme: Theme;
  onToggleTheme: () => void;
  onToggleNav: () => void;
}) {
  const { pathname } = useLocation();
  const crumb = useCrumbValue();
  const segments = pathname.split("/").filter(Boolean);
  const volumeId = segments[0] === "course" ? segments[1] : undefined;
  const chapterId = segments[0] === "course" ? segments[2] : undefined;

  return (
    <div className="topbar">
      <div className="crumbs">
        <button className="sidebar-toggle" onClick={onToggleNav} aria-label="Toggle navigation">
          Menu
        </button>
        {volumeId ? <Link to="/">Course</Link> : <span className="current">Course</span>}
        {volumeId && (
          <>
            <span className="sep">/</span>
            {chapterId ? (
              <Link to={`/course/${volumeId}`}>{volumeCrumb(volumeId)}</Link>
            ) : (
              <span className="current">{volumeCrumb(volumeId)}</span>
            )}
          </>
        )}
        {chapterId && (
          <>
            <span className="sep">/</span>
            <span className="current">{crumb || chapterId}</span>
          </>
        )}
      </div>
      <button className="btn theme-toggle" onClick={onToggleTheme}>
        {theme === "dark" ? "Light" : "Dark"}
      </button>
    </div>
  );
}

/** Closes the mobile nav drawer whenever the route changes. */
function NavCloser({ onRouteChange }: { onRouteChange: () => void }) {
  const { pathname } = useLocation();
  useEffect(onRouteChange, [pathname]);
  return null;
}

export default function App() {
  const [theme, setTheme] = useState<Theme>(readStoredTheme);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* storage unavailable — the in-memory theme still applies */
    }
  }, [theme]);

  return (
    <CrumbProvider>
      <div className={`app-shell${navOpen ? " nav-open" : ""}`} data-theme={theme}>
        <NavCloser onRouteChange={() => setNavOpen(false)} />
        <Sidebar />
        {navOpen && (
          <button className="nav-scrim" aria-label="Close navigation" onClick={() => setNavOpen(false)} />
        )}
        <main className="main">
          <TopBar
            theme={theme}
            onToggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
            onToggleNav={() => setNavOpen((v) => !v)}
          />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/course/:volumeId" element={<VolumePage />} />
            <Route path="/course/:volumeId/:chapterId" element={<ChapterPage />} />
          </Routes>
        </main>
      </div>
    </CrumbProvider>
  );
}
