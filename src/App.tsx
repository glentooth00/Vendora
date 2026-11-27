
import { useEffect, useState, type FormEvent } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { AuthenticatedUser } from "./types";

import DashboardLayout from "./layouts/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import ModulePlaceholder from "./pages/ModulePlaceholder";
import Products from "./pages/Products";
import Inventory from "./pages/Inventory";
import Sales from "./pages/Sales";
import "./App.css";

type AppMode = "loading" | "setup" | "login" | "dashboard" | "error";

function App() {
  const [mode, setMode] = useState<AppMode>("loading");

  const [user, setUser] = useState<AuthenticatedUser | null>(null);

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activePage, setActivePage] = useState("Dashboard");

  useEffect(() => {
    async function checkSetup() {
      try {
        const adminExists = await invoke<boolean>("has_admin_account");
        setMode(adminExists ? "login" : "setup");
      } catch (error) {
        console.error(error);
        setMessage(String(error));
        setMode("error");
      }
    }

    checkSetup();
  }, []);

  async function handleSetup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (password !== confirmPassword) {
      setMessage("Your passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      await invoke("create_initial_admin", {
        fullName,
        username,
        password,
      });

      setPassword("");
      setConfirmPassword("");
      setMessage("Administrator account created successfully.");
      setMode("login");
    } catch (error) {
      setMessage(String(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSubmitting(true);

    try {
      const authenticatedUser = await invoke<AuthenticatedUser>(
        "login_user",
        { username, password }
      );

      setUser(authenticatedUser);
      setPassword("");
      setActivePage("Dashboard");
      setMode("dashboard");
    } catch (error) {
      console.error("Login failed:", error);
      setMessage(String(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleLogout() {
    setUser(null);
    setUsername("");
    setPassword("");
    setMessage("");
    setMode("login");
  }


  function renderAuthentication() {
    return (
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
            {mode === "setup" && (
              <>
                <div className="welcome-label">
                  <span className="welcome-line" />
                  INITIAL WORKSPACE SETUP
                </div>

                <h2>Create your administrator account</h2>
                <p className="form-subtitle">
                  Set up your administrator credentials to get started.
                </p>

                <form onSubmit={handleSetup}>
                  <div className="form-group">
                    <label htmlFor="fullName">Full name</label>
                    <input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your full name"
                      maxLength={150}
                      autoComplete="name"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="setupUsername">Username</label>
                    <input
                      id="setupUsername"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Create a username"
                      minLength={3}
                      maxLength={50}
                      autoComplete="username"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="setupPassword">Password</label>
                    <div className="password-input">
                      <input
                        id="setupPassword"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Create a strong password"
                        minLength={12}
                        maxLength={128}
                        autoComplete="new-password"
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

                  <div className="form-group">
                    <label htmlFor="confirmPassword">Confirm password</label>
                    <input
                      id="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your password"
                      autoComplete="new-password"
                      required
                    />
                  </div>

                  {message && (
                    <p className="login-message" role="alert">{message}</p>
                  )}

                  <button
                    className="sign-in-button"
                    type="submit"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Creating account..." : "Create administrator"}
                    {!isSubmitting && <span>→</span>}
                  </button>
                </form>
              </>
            )}

            {mode === "login" && (
              <>
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
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        setMessage("");
                      }}
                      placeholder="Enter your username"
                      autoComplete="username"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="password">Password</label>
                    <div className="password-input">
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          setMessage("");
                        }}
                        placeholder="Enter your password"
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
                        onChange={(e) => setRememberMe(e.target.checked)}
                      />
                      <span>Remember me</span>
                    </label>
                    <span className="forgot-password">Forgot password?</span>
                  </div>

                  {message && (
                    <p className="login-message" role="alert">{message}</p>
                  )}

                  <button
                    className="sign-in-button"
                    type="submit"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Signing in..." : "Sign in"}
                    {!isSubmitting && <span>→</span>}
                  </button>
                </form>
              </>
            )}

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
    );
  }

  return (
    <main className={`login-page ${darkMode ? "dark" : ""}`}>
      {mode !== "dashboard" && (
        <button
          className="theme-toggle"
          type="button"
          onClick={() => setDarkMode(!darkMode)}
          aria-label="Toggle theme"
        >
          {darkMode ? "☀" : "☾"}
        </button>
      )}

      {mode === "loading" && (
        <div className="setup-loading">
          <div className="setup-spinner" />
          <p>Preparing your Vendora workspace...</p>
        </div>
      )}

      {mode === "error" && (
        <div className="auth-error">
          <div className="brand-logo">V</div>
          <h2>Unable to initialize Vendora</h2>
          <p>Please check your database connection.</p>
          <p className="login-message">{message}</p>
          <button
            className="sign-in-button"
            onClick={() => window.location.reload()}
          >
            Try again →
          </button>
        </div>
      )}

      {(mode === "setup" || mode === "login") && renderAuthentication()}

      {mode === "dashboard" && user && (
        <DashboardLayout
          user={user}
          activePage={activePage}
          darkMode={darkMode}
          onNavigate={setActivePage}
          onToggleTheme={() => setDarkMode(!darkMode)}
          onLogout={handleLogout}
        >
      {activePage === "Sales" ? (
          <Sales user={user} />
        ) : activePage === "Dashboard" ? (
          <Dashboard user={user} onNavigate={setActivePage} />
        ) : activePage === "Products" ? (
          <Products user={user} />
        ) : activePage === "Inventory" ? (
          <Inventory />
        ) : (
          <ModulePlaceholder
            page={activePage}
            onBack={() => setActivePage("Dashboard")}
          />
        )}
        </DashboardLayout>
      )}
    </main>
  );
}

export default App;
