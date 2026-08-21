import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../src/shared/AuthContext";
import { ApiError } from "../src/shared/apiClient";

/** ⚠️ DEV HARNESS ONLY — see DevHomePage.jsx for why. */
export default function DevLoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

  const redirectTo = location.state?.from?.pathname || "/";

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      await login(username, password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? "Invalid username or password." : "Couldn't reach the server.");
    }
  }

  return (
    <div style={{ fontFamily: "sans-serif", padding: 40, background: "#fff", minHeight: "100vh" }}>
      <p style={{ background: "#ffe58a", padding: 12, fontSize: 13, marginBottom: 24 }}>
        Dev harness login page — placeholder for local testing only.
      </p>
      <h1>Log in</h1>
      <form onSubmit={handleSubmit} style={{ maxWidth: 300 }}>
        <div style={{ marginBottom: 12 }}>
          <label>
            Username
            <br />
            <input value={username} onChange={(e) => setUsername(e.target.value)} />
          </label>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>
            Password
            <br />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
        </div>
        {error && <p style={{ color: "red" }}>{error}</p>}
        <button type="submit">Log in</button>
      </form>
    </div>
  );
}
