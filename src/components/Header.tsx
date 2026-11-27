
import type { AuthenticatedUser } from "../types";

interface HeaderProps {
  user: AuthenticatedUser;
  activePage: string;
  darkMode: boolean;
  onToggleTheme: () => void;
}

function roleLabel(role: string) {
  return role.replace(/_/g, " ").replace(/\b\w/g, (letter) =>
    letter.toUpperCase()
  );
}

export default function Header({
  user,
  activePage,
  darkMode,
  onToggleTheme,
}: HeaderProps) {
  return (
    <header className="dashboard-header">
      <div>
        <span className="header-eyebrow">VENDORA WORKSPACE</span>
        <h1>{activePage}</h1>
      </div>

      <div className="header-user">
        <button
          className="header-theme-button"
          type="button"
          onClick={onToggleTheme}
          title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          aria-label="Toggle theme"
        >
          {darkMode ? "☀" : "☾"}
        </button>

        <div className="user-avatar">
          {user.full_name.charAt(0).toUpperCase()}
        </div>

        <div className="header-user-info">
          <strong>{user.full_name}</strong>
          <span>{roleLabel(user.role)}</span>
        </div>
      </div>
    </header>
  );
}
