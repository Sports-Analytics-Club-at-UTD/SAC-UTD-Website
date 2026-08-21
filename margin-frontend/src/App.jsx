import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Secretary from './pages/Secretary';
import Events from './pages/Events';
import Marketing from './pages/Marketing';

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
      </Routes>
    </Router>
  );
}

export default App;