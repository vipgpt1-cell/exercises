import { useEffect } from "react";
import { useRoute } from "./lib/router";
import { useSettings } from "./lib/store";
import { pages } from "./i18n/pages";
import { Home } from "./pages/Home";
import { FieldPage } from "./pages/FieldPage";
import { ExercisePage, TestPage } from "./pages/TestPage";
import { ResultPage } from "./pages/ResultPage";
import { HistoryPage, TestHistoryPage } from "./pages/HistoryPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { ReportPage } from "./pages/ReportPage";
import { NotFound } from "./pages/NotFound";
import { DevFigures } from "./pages/DevFigures";

function useDocumentSettings() {
  const s = useSettings();
  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      // A data-theme set by the page that embeds us wins; otherwise the setting ("Auto" follows the phone).
      const host = root.dataset.theme;
      const dark =
        host === "dark" || host === "light"
          ? host === "dark"
          : s.theme === "dark" ||
            (s.theme === "system" &&
              matchMedia("(prefers-color-scheme: dark)").matches);
      root.classList.toggle("dark", dark);
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute("content", dark ? "#0c111c" : "#f6f7fb");
    };
    apply();
    root.dataset.text = s.textSize;
    root.lang = s.lang;
    root.classList.toggle("reduce-motion", s.reduceMotion);
    document.title = pages[s.lang].home.title;
    const m = matchMedia("(prefers-color-scheme: dark)");
    m.addEventListener?.("change", apply);
    const obs = new MutationObserver(apply);
    obs.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => {
      m.removeEventListener?.("change", apply);
      obs.disconnect();
    };
  }, [s.theme, s.textSize, s.lang, s.reduceMotion]);
}

export default function App() {
  useDocumentSettings();
  const { parts } = useRoute();
  const [a, b] = parts;
  switch (a) {
    case undefined:
      return <Home />;
    case "field":
      return <FieldPage key={b} id={b} />;
    case "test":
      return <TestPage key={b} id={b} />;
    case "exercise":
      return <ExercisePage key={b} id={b} />;
    case "result":
      return <ResultPage key={b} id={b} />;
    case "history":
      return b ? <TestHistoryPage key={b} testId={b} /> : <HistoryPage />;
    case "analytics":
      return <AnalyticsPage />;
    case "report":
      return <ReportPage />;
    case "dev":
      return import.meta.env.DEV ? <DevFigures /> : <NotFound />;
    default:
      return <NotFound />;
  }
}
