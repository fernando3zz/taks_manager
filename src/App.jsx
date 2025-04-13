import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ProtectedRoute from "./components/ProtectedRoute"; // Import ProtectedRoute

function App() {
  return (
    <Router>
      {/* Definisikan rute aplikasi */}
      <Routes>
        {/* Rute untuk halaman login */}
        <Route path="/" element={<Login />} />
        
        {/* Rute untuk halaman dashboard yang dilindungi */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
      </Routes>
    </Router>
  );
}

export default App;
