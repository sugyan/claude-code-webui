import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ProjectSelector } from "./components/ProjectSelector";
import { ChatPage } from "./components/ChatPage";
import { DemoPage } from "./components/DemoPage";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<ProjectSelector />} />
        <Route path="/projects/*" element={<ChatPage />} />
        <Route path="/demo" element={<DemoPage />} />
      </Routes>
    </Router>
  );
}

export default App;
