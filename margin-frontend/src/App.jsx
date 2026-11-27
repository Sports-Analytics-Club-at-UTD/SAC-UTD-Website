import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Secretary from './pages/Secretary';
import Events from './pages/Events';
import Marketing from './pages/Marketing';
import Projects from './pages/Projects';
import Rnd from './pages/Rnd';
import Finance from './pages/Finance';
import FinanceConfirm from './pages/FinanceConfirm';
import DirectorDashboard from './pages/DirectorDashboard';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/portal" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/secretary" element={<Secretary />} />
        <Route path="/events" element={<Events />} />
        <Route path="/marketing" element={<Marketing />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/rnd" element={<Rnd />} />
        <Route path="/finance" element={<Finance />} />
        <Route path="/finance/requests/:id/confirm" element={<FinanceConfirm />} />
        <Route path="/director" element={<DirectorDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;