
import type { ReactNode } from "react";
import type { AuthenticatedUser } from "../types";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";

interface DashboardLayoutProps {
  user: AuthenticatedUser;
  activePage: string;
  darkMode: boolean;
  onNavigate: (page: string) => void;
  onToggleTheme: () => void;
  onLogout: () => void;
  children: ReactNode;
}

export default function DashboardLayout({
  user,
  activePage,
  darkMode,
  onNavigate,
  onToggleTheme,
  onLogout,
  children,
}: DashboardLayoutProps) {
  return (
    <section className={`dashboard-layout ${darkMode ? "dark" : "light"}`}>
      <Sidebar
        user={user}
        activePage={activePage}
        onNavigate={onNavigate}
        onLogout={onLogout}
      />

      <div className="dashboard-main">
        <Header
          user={user}
          activePage={activePage}
          darkMode={darkMode}
          onToggleTheme={onToggleTheme}
        />

        <div className="dashboard-content">
          {children}
        </div>
      </div>
    </section>
  );
}
