
import { useState, type FormEvent } from "react";
import "./App.css";

function App() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [message, setMessage] = useState("");

  function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Login authentication will be connected in the next step.");
  }

  return (
    <main className={`login-page ${darkMode ? "dark" : ""}`}>
      <button
        className="theme-toggle"
        type="button"
        onClick={() => setDarkMode(!darkMode)}
        aria-label="Toggle theme"
      >
        {darkMode ? "☀" : "☾"}
      </button>

      <section className="login-layout">
        <div className="brand-panel">
          <div className="brand-content">
            <div className="brand-logo">V</div>
            <h1>Vendora<span>.</span></h1>
            <p className="brand-tagline">Sell smarter. Manage better.</p>

            <div className="brand-divider" />

            <h2>Your business,<br />beautifully managed.</h2>
            <p className="brand-description">
              Take control of your products, inventory, sales, and business
              operations with one powerful platform.
            </p>
          </div>

          <div className="brand-footer">
            <span>VENDORA BUSINESS MANAGEMENT</span>
            <span>© 2026 Vendora</span>
          </div>
        </div>

        <div className="form-panel">
          <div className="mobile-brand">
            <div className="brand-logo">V</div>
            <span>Vendora<span className="orange-dot">.</span></span>
          </div>

          <div className="login-form-container">
            <div className="welcome-label">
              <span className="welcome-line" />
              WELCOME BACK
            </div>

            <h2>Sign in to your account</h2>
            <p className="form-subtitle">
              Enter your credentials to access your workspace.
            </p>

            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label htmlFor="username">Username</label>
                <input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(event) => {
                    setUsername(event.target.value);
                    setMessage("");
                  }}
                  autoComplete="username"
                  required
                />
              </div>

              <div className="form-group">
                <div className="password-label">
                  <label htmlFor="password">Password</label>
                </div>

                <div className="password-input">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setMessage("");
                    }}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    className="show-password"
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <div className="form-options">
                <label className="remember-option">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                  />
                  <span>Remember me</span>
                </label>
                <span className="forgot-password">Forgot password?</span>
              </div>

              <button className="sign-in-button" type="submit">
                Sign in <span>→</span>
              </button>

              {message && (
                <p className="login-message" role="status">
                  {message}
                </p>
              )}
            </form>

            <div className="security-note">
              <span className="security-icon">⌑</span>
              Your workspace is protected and secure.
            </div>
          </div>

          <div className="form-footer">
            <span>Designed for better business management.</span>
            <span>Vendora v0.1.0</span>
          </div>
        </div>
      </section>
    </main>
  );
}

export default App;
