
import type { AuthenticatedUser } from "../types";

interface SidebarProps {
  user: AuthenticatedUser;
  activePage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
}

const workspaceNavigation = [
  { name: "Dashboard", icon: "▦" },
  { name: "Item Catalog", icon: "▤" },
  { name: "Products", icon: "▣" },
  { name: "Inventory", icon: "▤" },
  { name: "Sales", icon: "▥" },
  { name: "Purchases", icon: "▧" },
  { name: "Suppliers", icon: "♙" },
];

const managementNavigation = [
  { name: "Users", icon: "♧" },
  { name: "Reports", icon: "▥" },
  { name: "Settings", icon: "⚙" },
];

function roleLabel(role: string) {
  return role.replace(/_/g, " ").replace(/\b\w/g, (letter) =>
    letter.toUpperCase()
  );
}

export default function Sidebar({
  user,
  activePage,
  onNavigate,
  onLogout,
}: SidebarProps) {
  return (
    <aside className="dashboard-sidebar">
      <div className="dashboard-brand">
        <div className="brand-logo">V</div>
        <span>Vendora<span>.</span></span>
      </div>

      <div className="sidebar-section-label">WORKSPACE</div>

      <nav className="sidebar-navigation">
        {workspaceNavigation.map((item) => (
          <button
            key={item.name}
            className={`nav-item ${activePage === item.name ? "active" : ""}`}
            onClick={() => onNavigate(item.name)}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.name}
          </button>
        ))}
      </nav>

      <div className="sidebar-section-label management-label">
        MANAGEMENT
      </div>

      <nav className="sidebar-navigation">
        {managementNavigation.map((item) => (
          <button
            key={item.name}
            className={`nav-item ${activePage === item.name ? "active" : ""}`}
            onClick={() => onNavigate(item.name)}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.name}
          </button>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="sidebar-user">
          <div className="user-avatar">
            {user.full_name.charAt(0).toUpperCase()}
          </div>

          <div className="sidebar-user-info">
            <strong>{user.full_name}</strong>
            <span>{roleLabel(user.role)}</span>
          </div>
        </div>

        <button className="logout-button" onClick={onLogout}>
          <span>↪</span> Sign out
        </button>
      </div>
    </aside>
  );
}
