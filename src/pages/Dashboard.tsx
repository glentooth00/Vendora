
import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { AuthenticatedUser } from "../types";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface DashboardProps {
  user: AuthenticatedUser;
  onNavigate: (page: string) => void;
}

interface DashboardStats {
  sales_today: number;
  total_products: number;
  inventory_items: number;
  transactions_today: number;
}

interface MonthlySales {
  month_num: number;
  sales: number;
}

interface RecentActivity {
  activity_type: string;
  description: string;
  amount: number;
  created_at: string;
}

interface DashboardData {
  stats: DashboardStats;
  monthly_sales: MonthlySales[];
  recent_activity: RecentActivity[];
}

const months = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
});

const compactPesoFormatter = new Intl.NumberFormat("en-PH", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const numberFormatter = new Intl.NumberFormat("en-PH", {
  maximumFractionDigits: 0,
});

export default function Dashboard({ user, onNavigate }: DashboardProps) {
  const firstName = user.full_name.split(" ")[0];
  const currentYear = new Date().getFullYear();

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadDashboard = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await invoke<DashboardData>("get_dashboard_data", {
          year: selectedYear,
        });

        if (active) {
          setDashboard(result);
        }
      } catch (err) {
        console.error("Failed to load dashboard:", err);

        if (active) {
          setError(String(err));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      active = false;
    };
  }, [selectedYear]);

  const salesData = useMemo(() => {
    return months.map((month, index) => {
      const databaseMonth = dashboard?.monthly_sales?.find(
        (item) => Number(item.month_num) === index + 1
      );

      const sales = Number(databaseMonth?.sales ?? 0);

      return {
        month,
        sales: Number.isFinite(sales) ? sales : 0,
      };
    });
  }, [dashboard]);

  const totalSales = useMemo(
    () => salesData.reduce((total, item) => total + item.sales, 0),
    [salesData]
  );

  const averageSales = totalSales / 12;

  const highestMonth = useMemo(
    () =>
      salesData.reduce((highest, item) =>
        item.sales > highest.sales ? item : highest
      ),
    [salesData]
  );

  const stats = dashboard?.stats;

  const salesTodayValue = Number(stats?.sales_today ?? 0);
  const totalProductsValue = Number(stats?.total_products ?? 0);
  const inventoryItemsValue = Number(stats?.inventory_items ?? 0);
  const transactionsValue = Number(stats?.transactions_today ?? 0);

  const formattedSalesToday = pesoFormatter.format(
    Number.isFinite(salesTodayValue) ? salesTodayValue : 0
  );

  const formattedTotalProducts = numberFormatter.format(
    Number.isFinite(totalProductsValue) ? totalProductsValue : 0
  );

  const formattedInventoryItems = numberFormatter.format(
    Number.isFinite(inventoryItemsValue) ? inventoryItemsValue : 0
  );

  const formattedTransactions = numberFormatter.format(
    Number.isFinite(transactionsValue) ? transactionsValue : 0
  );

  const yearOptions = Array.from(
    { length: 6 },
    (_, index) => currentYear - index
  );

  return (
    <>
      <div className="dashboard-welcome">
        <div>
          <h2>Good day, {firstName}!</h2>
          <p>Here's an overview of your business workspace.</p>
        </div>

        <span className="welcome-date">BUSINESS OVERVIEW</span>
      </div>

      {/* DASHBOARD STATISTICS */}
      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-card-top">
            <span>Sales today</span>
            <span className="stat-icon orange">₱</span>
          </div>
          <h3>{loading ? "..." : formattedSalesToday}</h3>
          <p>Completed sales today</p>
        </div>

        <div className="stat-card">
          <div className="stat-card-top">
            <span>Total products</span>
            <span className="stat-icon blue">▣</span>
          </div>
          <h3>{loading ? "..." : formattedTotalProducts}</h3>
          <p>Registered products</p>
        </div>

        <div className="stat-card">
          <div className="stat-card-top">
            <span>Inventory items</span>
            <span className="stat-icon green">▤</span>
          </div>
          <h3>{loading ? "..." : formattedInventoryItems}</h3>
          <p>Total available stock quantity</p>
        </div>

        <div className="stat-card">
          <div className="stat-card-top">
            <span>Transactions</span>
            <span className="stat-icon purple">▥</span>
          </div>
          <h3>{loading ? "..." : formattedTransactions}</h3>
          <p>Completed transactions today</p>
        </div>
      </div>

      {/* MONTHLY SALES GRAPH */}
      <section className="dashboard-panel sales-chart-panel">
        <div className="sales-chart-header">
          <div className="panel-heading">
            <div className="sales-title-row">
              <h3>Monthly sales</h3>
              <span className="preview-label">LIVE DATA</span>
            </div>
            <p>Sales performance throughout the year</p>
          </div>

          <select
            className="sales-year-select"
            value={selectedYear}
            onChange={(event) => setSelectedYear(Number(event.target.value))}
            aria-label="Select sales year"
          >
            {yearOptions.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        <div className="sales-summary">
          <div className="sales-summary-item">
            <span>Total sales</span>
            <strong>{pesoFormatter.format(totalSales)}</strong>
          </div>

          <div className="sales-summary-item">
            <span>Monthly average</span>
            <strong>{pesoFormatter.format(averageSales)}</strong>
          </div>

          <div className="sales-summary-item">
            <span>Best performing month</span>
            <strong>
              {highestMonth.sales > 0
                ? `${highestMonth.month} · ${pesoFormatter.format(highestMonth.sales)}`
                : "—"}
            </strong>
          </div>
        </div>

        <div className="sales-chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={salesData}
              margin={{ top: 15, right: 15, left: 5, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="var(--chart-grid)"
              />

              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "var(--chart-text)", fontSize: 11 }}
                dy={10}
              />

              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "var(--chart-text)", fontSize: 11 }}
                tickFormatter={(value) =>
                  `₱${compactPesoFormatter.format(value)}`
                }
                width={65}
              />

              <Tooltip
                formatter={(value) => [
                  pesoFormatter.format(Number(value)),
                  "Sales",
                ]}
                labelStyle={{ fontWeight: 600 }}
                contentStyle={{
                  background: "var(--panel-bg)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "9px",
                  color: "var(--text-primary)",
                  boxShadow: "var(--shadow-md)",
                }}
              />

              <Line
                type="monotone"
                dataKey="sales"
                name="Sales"
                stroke="#f97316"
                strokeWidth={3}
                dot={{
                  r: 4,
                  fill: "#f97316",
                  stroke: "var(--panel-bg)",
                  strokeWidth: 2,
                }}
                activeDot={{
                  r: 7,
                  fill: "#f97316",
                  stroke: "var(--panel-bg)",
                  strokeWidth: 3,
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <p className="sales-chart-note">
          {loading
            ? "Loading sales data..."
            : `Showing actual completed sales recorded in ${selectedYear}.`}
        </p>
      </section>

      {/* RECENT ACTIVITY AND QUICK ACCESS */}
      <div className="dashboard-panels">
        <div className="dashboard-panel">
          <div className="panel-heading">
            <h3>Recent activity</h3>
            <p>Your latest business activities</p>
          </div>

          {loading ? (
            <div className="empty-state">
              <div className="empty-state-icon">▤</div>
              <strong>Loading activity...</strong>
              <p>Please wait while we retrieve your latest activities.</p>
            </div>
          ) : error ? (
            <div className="empty-state">
              <div className="empty-state-icon">!</div>
              <strong>Unable to load activity</strong>
              <p>Check your database connection and try again.</p>
            </div>
          ) : dashboard?.recent_activity?.length ? (
            <div className="dashboard-activity-list">
              {dashboard.recent_activity.map((activity, index) => {
                const isSale =
                  activity.activity_type.toLowerCase() === "sale";

                return (
                  <div
                    className="dashboard-activity-item"
                    key={`${activity.created_at}-${index}`}
                  >
                    <div className="dashboard-activity-info">
                      <strong>{activity.description}</strong>
                      <span>
                        {activity.created_at} · {activity.activity_type}
                      </span>
                    </div>

                    <strong className="dashboard-activity-value">
                      {isSale
                        ? pesoFormatter.format(Number(activity.amount) || 0)
                        : `${numberFormatter.format(Number(activity.amount) || 0)} units`}
                    </strong>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">▤</div>
              <strong>No activity yet</strong>
              <p>Your business activities will appear here.</p>
            </div>
          )}
        </div>

        <div className="dashboard-panel quick-actions-panel">
          <div className="panel-heading">
            <h3>Quick access</h3>
            <p>Common workspace sections</p>
          </div>

          {["Products", "Inventory", "Sales", "Suppliers"].map((item) => (
            <button
              className="quick-action"
              key={item}
              onClick={() => onNavigate(item)}
            >
              <span>{item}</span>
              <span>→</span>
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p style={{ color: "var(--text-secondary)", marginTop: 12 }}>
          Dashboard data could not be loaded: {error}
        </p>
      )}
    </>
  );
}
