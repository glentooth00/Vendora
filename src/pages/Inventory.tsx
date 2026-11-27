
import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

interface Product {
  id: number;
  product_name: string;
  sku: string | null;
  barcode: string | null;
  category: string | null;
  unit: string;
  quantity: number | string;
  minimum_stock: number | string;
  selling_price: number | string;
  status: string;
}

type StockFilter = "all" | "in_stock" | "low_stock" | "out_of_stock";

function getQuantity(value: number | string): number {
  return Number(value) || 0;
}

function getStockStatus(quantity: number, minimum: number) {
  if (quantity <= 0) {
    return {
      label: "Out of Stock",
      className: "out",
    };
  }

  if (quantity <= minimum) {
    return {
      label: "Low Stock",
      className: "low",
    };
  }

  return {
    label: "In Stock",
    className: "available",
  };
}

export default function Inventory() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StockFilter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadInventory() {
    try {
      setLoading(true);
      setError("");

      const result = await invoke<Product[]>("get_products");
      setProducts(result);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInventory();
  }, []);

  const activeProducts = products.filter(
    (product) => product.status === "active"
  );

  const totalProducts = activeProducts.length;

  const totalUnits = activeProducts.reduce(
    (total, product) => total + getQuantity(product.quantity),
    0
  );

  const lowStockCount = activeProducts.filter((product) => {
    const quantity = getQuantity(product.quantity);
    const minimum = getQuantity(product.minimum_stock);

    return quantity > 0 && quantity <= minimum;
  }).length;

  const outOfStockCount = activeProducts.filter(
    (product) => getQuantity(product.quantity) <= 0
  ).length;

  const filteredProducts = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    return products.filter((product) => {
      const quantity = getQuantity(product.quantity);
      const minimum = getQuantity(product.minimum_stock);
      const status = getStockStatus(quantity, minimum);

      const matchesSearch =
        product.product_name.toLowerCase().includes(keyword) ||
        (product.sku || "").toLowerCase().includes(keyword) ||
        (product.barcode || "").toLowerCase().includes(keyword) ||
        (product.category || "").toLowerCase().includes(keyword);

      const matchesFilter =
        filter === "all" ||
        (filter === "in_stock" && status.className === "available") ||
        (filter === "low_stock" && status.className === "low") ||
        (filter === "out_of_stock" && status.className === "out");

      return matchesSearch && matchesFilter;
    });
  }, [products, search, filter]);

  return (
    <div className="inventory-page">
      <div className="inventory-header">
        <div>
          <h1>Inventory</h1>
          <p>Monitor stock levels and manage your product inventory.</p>
        </div>

        <button
          className="inventory-refresh-btn"
          onClick={loadInventory}
          disabled={loading}
        >
          <span>↻</span>
          Refresh
        </button>
      </div>

      <div className="inventory-summary">
        <div className="inventory-summary-card">
          <div className="inventory-summary-icon orange">▦</div>
          <div>
            <span>Total Products</span>
            <h2>{totalProducts}</h2>
            <small>Active products</small>
          </div>
        </div>

        <div className="inventory-summary-card">
          <div className="inventory-summary-icon blue">▤</div>
          <div>
            <span>Total Stock Units</span>
            <h2>{totalUnits.toLocaleString()}</h2>
            <small>Combined available quantity</small>
          </div>
        </div>

        <div className="inventory-summary-card">
          <div className="inventory-summary-icon yellow">!</div>
          <div>
            <span>Low Stock</span>
            <h2>{lowStockCount}</h2>
            <small>Products needing restock</small>
          </div>
        </div>

        <div className="inventory-summary-card">
          <div className="inventory-summary-icon red">×</div>
          <div>
            <span>Out of Stock</span>
            <h2>{outOfStockCount}</h2>
            <small>Products with zero quantity</small>
          </div>
        </div>
      </div>

      <div className="inventory-content">
        <div className="inventory-toolbar">
          <div>
            <h2>Stock Overview</h2>
            <p>View and monitor your current product stock.</p>
          </div>

          <div className="inventory-search">
            <span>⌕</span>
            <input
              type="text"
              placeholder="Search product, SKU, barcode..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>

        <div className="inventory-filters">
          {[
            { value: "all", label: "All Products" },
            { value: "in_stock", label: "In Stock" },
            { value: "low_stock", label: "Low Stock" },
            { value: "out_of_stock", label: "Out of Stock" },
          ].map((item) => (
            <button
              key={item.value}
              className={filter === item.value ? "active" : ""}
              onClick={() => setFilter(item.value as StockFilter)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="inventory-error">
            <span>{error}</span>
            <button onClick={loadInventory}>Try again</button>
          </div>
        )}

        <div className="inventory-table-wrapper">
          <table className="inventory-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Current Stock</th>
                <th>Minimum Stock</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="inventory-empty">
                    Loading inventory...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="inventory-empty">
                    {products.length === 0
                      ? "No products found. Add products from the Products page."
                      : "No products match your search or filter."}
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  const quantity = getQuantity(product.quantity);
                  const minimum = getQuantity(product.minimum_stock);
                  const status = getStockStatus(quantity, minimum);

                  return (
                    <tr key={product.id}>
                      <td>
                        <div className="inventory-product-name">
                          <div className="inventory-product-icon">
                            {product.product_name.charAt(0).toUpperCase()}
                          </div>
                          <strong>{product.product_name}</strong>
                        </div>
                      </td>

                      <td>{product.sku || "—"}</td>
                      <td>{product.category || "Uncategorized"}</td>

                      <td>
                        <strong>
                          {quantity.toLocaleString()} {product.unit}
                        </strong>
                      </td>

                      <td>
                        {minimum.toLocaleString()} {product.unit}
                      </td>

                      <td>
                        <span
                          className={`inventory-status ${status.className}`}
                        >
                          {status.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="inventory-table-footer">
          <span>
            Showing {filteredProducts.length} of {products.length} products
          </span>
          <span>Stock data from Products</span>
        </div>
      </div>
    </div>
  );
}
