import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import { ProjectSelector } from "./components/ProjectSelector";
import { ChatPage } from "./components/ChatPage";
import { SettingsProvider } from "./contexts/SettingsContext";
import { isDevelopment } from "./utils/environment";

// Lazy load DemoPage only in development
const DemoPage = isDevelopment()
  ? lazy(() =>
      import("./components/DemoPage").then((module) => ({
        default: module.DemoPage,
      })),
    )
  : null;

function App() {
  return (
    <SettingsProvider>
      <Router>
        <Routes>
          <Route path="/" element={<ProjectSelector />} />
          <Route path="/projects/*" element={<ChatPage />} />
          {DemoPage && (
            <Route
              path="/demo"
              element={
                <Suspense fallback={<div>Loading demo...</div>}>
                  <DemoPage />
                </Suspense>
              }
            />
          )}
        </Routes>
      </Router>
    </SettingsProvider>
  );
}

export default App;
