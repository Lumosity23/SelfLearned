import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import Home from './pages/Home';
import CoursePresentation from './pages/CoursePresentation';
import CourseReader from './pages/CourseReader';
import FileExplorerPage from './pages/FileExplorerPage';
import Settings from './pages/Settings';
import Graph from './pages/Graph';
import { ToastProvider } from './components/ToastProvider';
import { ThemeProvider } from './components/ThemeContext';

function AppContent() {
  const navigate = useNavigate();
  
  return (
    <ToastProvider onNavigateToCourse={(courseId) => navigate(`/course/${courseId}`)}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/course/:courseId" element={<CoursePresentation />} />
        <Route path="/course/:courseId/read/:submoduleId" element={<CourseReader />} />
        <Route path="/explorer" element={<FileExplorerPage />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/graph" element={<Graph />} />
      </Routes>
    </ToastProvider>
  );
}

function App() {
  return (
    <Router>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </Router>
  );
}

export default App;
