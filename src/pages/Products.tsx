
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { AuthenticatedUser } from "../types";

interface Product {
  id: number;
  product_name: string;
  sku: string | null;
  barcode: string | null;
  description: string | null;
  category: string | null;
  cost_price: number | string;
  selling_price: number | string;
  unit: string;
  quantity: number | string;
  minimum_stock: number | string;
  image_path: string | null;
  status: string;
}

interface ProductsProps {
  user: AuthenticatedUser;
}

interface ProductForm {
  productName: string;
  sku: string;
  barcode: string;
  description: string;
  category: string;
  costPrice: string;
  sellingPrice: string;
  unit: string;
  quantity: string;
  minimumStock: string;
}

const emptyForm: ProductForm = {
  productName: "",
  sku: "",
  barcode: "",
  description: "",
  category: "",
  costPrice: "0",
  sellingPrice: "0",
  unit: "pcs",
  quantity: "0",
  minimumStock: "5",
};

function formatAmount(value: number | string) {
  return Number(value || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getStockStatus(product: Product) {
  const quantity = Number(product.quantity);
  const minimum = Number(product.minimum_stock);

  if (quantity <= 0) {
    return { label: "Out of stock", className: "out" };
  }

  if (quantity <= minimum) {
    return { label: "Low stock", className: "low" };
  }

  return { label: "In stock", className: "good" };
}

export default function Products({ user }: ProductsProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadProducts() {
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
    void loadProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return products;

    return products.filter((product) =>
      [
        product.product_name,
        product.sku ?? "",
        product.barcode ?? "",
        product.category ?? "",
      ].some((value) => value.toLowerCase().includes(term))
    );
  }, [products, search]);

  const totalProducts = products.length;
  const lowStockCount = products.filter(
    (product) =>
      Number(product.quantity) > 0 &&
      Number(product.quantity) <= Number(product.minimum_stock)
  ).length;
  const outOfStockCount = products.filter(
    (product) => Number(product.quantity) <= 0
  ).length;

  function updateField(
    field: keyof ProductForm,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function closeModal() {
    if (saving) return;

    setShowModal(false);
    setForm(emptyForm);
    setError("");
  }

  async function handleAddProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.productName.trim()) {
      setError("Please enter a product name.");
      return;
    }

    const costPrice = Number(form.costPrice);
    const sellingPrice = Number(form.sellingPrice);
    const quantity = Number(form.quantity);
    const minimumStock = Number(form.minimumStock);

    if (
      ![costPrice, sellingPrice, quantity, minimumStock].every(
        (value) => Number.isFinite(value) && value >= 0
      )
    ) {
      setError("Prices and stock values must be valid non-negative numbers.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      await invoke<number>("add_product", {
        productName: form.productName.trim(),
        sku: form.sku.trim() || null,
        barcode: form.barcode.trim() || null,
        description: form.description.trim() || null,
        category: form.category.trim() || null,
        costPrice,
        sellingPrice,
        unit: form.unit,
        quantity,
        minimumStock,
        createdBy: user.id,
      });

      setShowModal(false);
      setForm(emptyForm);
      setSuccess("Product added successfully.");

      await loadProducts();
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="dashboard-content products-page">
      <div className="products-heading">
        <div>
          <div className="products-eyebrow">WORKSPACE / CATALOG</div>
          <h2>Products</h2>
          <p>Manage your products, pricing, and stock levels.</p>
        </div>

        <button
          className="product-add-button"
          onClick={() => {
            setError("");
            setSuccess("");
            setShowModal(true);
          }}
        >
          <span>＋</span> Add Product
        </button>
      </div>

      <div className="product-summary">
        <div className="product-summary-card">
          <span>Total Products</span>
          <strong>{totalProducts}</strong>
          <small>Products in your catalog</small>
        </div>

        <div className="product-summary-card">
          <span>Low Stock</span>
          <strong className="summary-warning">{lowStockCount}</strong>
          <small>At or below minimum stock</small>
        </div>

        <div className="product-summary-card">
          <span>Out of Stock</span>
          <strong className="summary-danger">{outOfStockCount}</strong>
          <small>Products with zero quantity</small>
        </div>
      </div>

      {success && (
        <div className="products-success">
          <span>✓</span> {success}
          <button onClick={() => setSuccess("")}>Dismiss</button>
        </div>
      )}

      {error && !showModal && (
        <div className="products-error">{error}</div>
      )}

      <div className="products-table-panel">
        <div className="products-table-heading">
          <div>
            <h3>Product List</h3>
            <p>View and manage your registered products.</p>
          </div>

          <div className="products-search">
            <span>⌕</span>
            <input
              type="search"
              placeholder="Search name, SKU or barcode..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>

        <div className="products-table-wrapper">
          <table className="products-table">
            <thead>
              <tr>
                <th>PRODUCT</th>
                <th>SKU</th>
                <th>CATEGORY</th>
                <th>COST PRICE</th>
                <th>SELLING PRICE</th>
                <th>QUANTITY</th>
                <th>STOCK STATUS</th>
                <th>STATUS</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="products-empty">
                    Loading products...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="products-empty">
                    <div className="products-empty-icon">▤</div>
                    <strong>
                      {search ? "No matching products" : "No products yet"}
                    </strong>
                    <p>
                      {search
                        ? "Try a different search term."
                        : "Add your first product to get started."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  const stock = getStockStatus(product);

                  return (
                    <tr key={product.id}>
                      <td>
                        <div className="product-name-cell">
                          <strong>{product.product_name}</strong>
                          {product.barcode && (
                            <small>{product.barcode}</small>
                          )}
                        </div>
                      </td>
                      <td>{product.sku || "—"}</td>
                      <td>{product.category || "Uncategorized"}</td>
                      <td>₱{formatAmount(product.cost_price)}</td>
                      <td className="product-selling-price">
                        ₱{formatAmount(product.selling_price)}
                      </td>
                      <td>
                        {formatAmount(product.quantity)} {product.unit}
                      </td>
                      <td>
                        <span className={`stock-badge ${stock.className}`}>
                          {stock.label}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`product-status ${
                            product.status.toLowerCase() === "active"
                              ? "active"
                              : "inactive"
                          }`}
                        >
                          {product.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="products-table-footer">
          Showing {filteredProducts.length} of {totalProducts} products
          <button onClick={() => void loadProducts()} disabled={loading}>
            ↻ Refresh
          </button>
        </div>
      </div>

      {showModal && (
        <div className="product-modal-overlay" onMouseDown={closeModal}>
          <div
            className="product-modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="product-modal-header">
              <div>
                <h3>Add Product</h3>
                <p>Enter the details for your new product.</p>
              </div>

              <button
                type="button"
                className="product-modal-close"
                onClick={closeModal}
                disabled={saving}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAddProduct}>
              <div className="product-form-body">
                {error && <div className="products-error">{error}</div>}

                <div className="product-form-section">
                  <h4>Basic Information</h4>

                  <div className="product-form-grid">
                    <div className="product-field full">
                      <label>Product Name *</label>
                      <input
                        value={form.productName}
                        onChange={(event) =>
                          updateField("productName", event.target.value)
                        }
                        placeholder="Enter product name"
                        required
                        autoFocus
                      />
                    </div>

                    <div className="product-field">
                      <label>SKU</label>
                      <input
                        value={form.sku}
                        onChange={(event) =>
                          updateField("sku", event.target.value)
                        }
                        placeholder="e.g. PROD-001"
                      />
                    </div>

                    <div className="product-field">
                      <label>Barcode</label>
                      <input
                        value={form.barcode}
                        onChange={(event) =>
                          updateField("barcode", event.target.value)
                        }
                        placeholder="Enter barcode"
                      />
                    </div>

                    <div className="product-field full">
                      <label>Category</label>
                      <input
                        value={form.category}
                        onChange={(event) =>
                          updateField("category", event.target.value)
                        }
                        placeholder="e.g. Electronics"
                      />
                    </div>

                    <div className="product-field full">
                      <label>Description</label>
                      <textarea
                        value={form.description}
                        onChange={(event) =>
                          updateField("description", event.target.value)
                        }
                        placeholder="Optional product description"
                        rows={3}
                      />
                    </div>
                  </div>
                </div>

                <div className="product-form-section">
                  <h4>Pricing</h4>

                  <div className="product-form-grid">
                    <div className="product-field">
                      <label>Cost Price (₱) *</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.costPrice}
                        onChange={(event) =>
                          updateField("costPrice", event.target.value)
                        }
                        required
                      />
                    </div>

                    <div className="product-field">
                      <label>Selling Price (₱) *</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.sellingPrice}
                        onChange={(event) =>
                          updateField("sellingPrice", event.target.value)
                        }
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="product-form-section">
                  <h4>Initial Inventory</h4>

                  <div className="product-form-grid">
                    <div className="product-field">
                      <label>Unit *</label>
                      <select
                        value={form.unit}
                        onChange={(event) =>
                          updateField("unit", event.target.value)
                        }
                      >
                        <option value="pcs">Pieces (pcs)</option>
                        <option value="box">Box</option>
                        <option value="set">Set</option>
                        <option value="meter">Meter</option>
                        <option value="feet">Feet</option>
                        <option value="kilo">Kilo</option>
                        <option value="pairs">Pairs</option>
                      </select>
                    </div>

                    <div className="product-field">
                      <label>Initial Quantity *</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.quantity}
                        onChange={(event) =>
                          updateField("quantity", event.target.value)
                        }
                        required
                      />
                    </div>

                    <div className="product-field">
                      <label>Minimum Stock Level *</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.minimumStock}
                        onChange={(event) =>
                          updateField("minimumStock", event.target.value)
                        }
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="product-modal-footer">
                <button
                  type="button"
                  className="product-cancel-button"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="product-save-button"
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
