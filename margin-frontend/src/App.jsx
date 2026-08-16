import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Secretary from './pages/Secretary';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/portal" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/secretary" element={<Secretary />} />
      </Routes>
    </Router>
  );
}

export default App;