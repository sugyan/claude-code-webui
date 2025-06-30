import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ProjectSelector } from "./components/ProjectSelector";
import { ChatPage } from "./components/ChatPage";
import { HistoryPage } from "./components/HistoryPage";
import { DemoPage } from "./components/DemoPage";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<ProjectSelector />} />
        <Route
          path="/projects/:projectPath/histories"
          element={<HistoryPage />}
        />
        <Route path="/projects/*" element={<ChatPage />} />
        <Route path="/demo" element={<DemoPage />} />
      </Routes>
    </Router>
  );
}

export default App;
