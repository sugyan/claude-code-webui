import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import { ProjectSelector } from "./components/ProjectSelector";
import { ChatPage } from "./components/ChatPage";
import { EnterBehaviorProvider } from "./contexts/EnterBehaviorContext";
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
    <EnterBehaviorProvider>
      <Router>
        <Routes>
          <Route path="/" element={<ProjectSelector />} />
          <Route path="/projects/*" element={<ChatPage />} />
          {isDevelopment() && DemoPage && (
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
    </EnterBehaviorProvider>
  );
}

export default App;
