
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

interface Item {
  id: number;
  item_name: string;
  sku: string | null;
  barcode: string | null;
  description: string | null;
  category: string | null;
  unit: string;
  status: string;
}

interface ProductsProps {
  user: AuthenticatedUser;
}

interface ProductForm {
  costPrice: string;
  sellingPrice: string;
  minimumStock: string;
}

const emptyForm: ProductForm = {
  costPrice: "0",
  sellingPrice: "0",
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
  const [items, setItems] = useState<Item[]>([]);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  const [search, setSearch] = useState("");
  const [itemSearch, setItemSearch] = useState("");
  const [showItemOptions, setShowItemOptions] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<ProductForm>(emptyForm);

  const [loading, setLoading] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);
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

  async function loadAvailableItems() {
    try {
      setLoadingItems(true);
      setError("");

      // This command returns active catalog items that are not
      // already linked to a product.
      const result = await invoke<Item[]>("get_available_items");
      setItems(result);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoadingItems(false);
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

  const filteredItems = useMemo(() => {
    const term = itemSearch.trim().toLowerCase();

    return items.filter((item) => {
      if (item.status.toLowerCase() !== "active") return false;

      if (!term) return true;

      return [
        item.item_name,
        item.sku ?? "",
        item.barcode ?? "",
        item.category ?? "",
      ].some((value) => value.toLowerCase().includes(term));
    });
  }, [items, itemSearch]);

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

  function resetModal() {
    setSelectedItem(null);
    setItemSearch("");
    setShowItemOptions(false);
    setForm(emptyForm);
    setError("");
  }

  function openModal() {
    setError("");
    setSuccess("");
    resetModal();
    setShowModal(true);
    void loadAvailableItems();
  }

  function closeModal() {
    if (saving) return;

    setShowModal(false);
    resetModal();
  }

  function selectItem(item: Item) {
    setSelectedItem(item);
    setItemSearch(item.item_name);
    setShowItemOptions(false);
    setError("");
  }

  async function handleAddProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedItem) {
      setError("Please select an item from the Item Catalog.");
      return;
    }

    const costPrice = Number(form.costPrice);
    const sellingPrice = Number(form.sellingPrice);
    const minimumStock = Number(form.minimumStock);

    if (
      ![costPrice, sellingPrice, minimumStock].every(
        (value) => Number.isFinite(value) && value >= 0
      )
    ) {
      setError("Prices and minimum stock must be valid non-negative numbers.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      await invoke<number>("add_product", {
        itemId: selectedItem.id,
        costPrice,
        sellingPrice,
        minimumStock,
        createdBy: user.id,
      });

      setShowModal(false);
      resetModal();
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
          onClick={openModal}
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
                <p>Select a catalog item and configure its pricing.</p>
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
                  <h4>Item Catalog</h4>

                  <div className="product-form-grid">
                    <div className="product-field full product-item-selector">
                      <label>Select Catalog Item *</label>

                      <input
                        type="text"
                        value={itemSearch}
                        onChange={(event) => {
                          setItemSearch(event.target.value);
                          setSelectedItem(null);
                          setShowItemOptions(true);
                        }}
                        onFocus={() => setShowItemOptions(true)}
                        placeholder="Search item name, SKU or barcode..."
                        autoComplete="off"
                        disabled={loadingItems || saving}
                      />

                      {showItemOptions && (
                        <div className="product-item-options">
                          {loadingItems ? (
                            <div className="product-item-option-empty">
                              Loading catalog items...
                            </div>
                          ) : filteredItems.length === 0 ? (
                            <div className="product-item-option-empty">
                              {items.length === 0
                                ? "No available catalog items. Register an item first."
                                : "No matching catalog items found."}
                            </div>
                          ) : (
                            filteredItems.map((item) => (
                              <button
                                type="button"
                                key={item.id}
                                className="product-item-option"
                                onClick={() => selectItem(item)}
                              >
                                <span>
                                  <strong>{item.item_name}</strong>
                                  <small>
                                    {item.sku
                                      ? `SKU: ${item.sku}`
                                      : "No SKU"}
                                    {item.barcode
                                      ? ` · Barcode: ${item.barcode}`
                                      : ""}
                                  </small>
                                </span>

                                <span className="product-item-option-category">
                                  {item.category || "Uncategorized"}
                                </span>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedItem && (
                    <div className="product-selected-item">
                      <div className="product-selected-item-heading">
                        <span>Selected Catalog Item</span>
                        <strong>{selectedItem.item_name}</strong>
                      </div>

                      <div className="product-selected-item-details">
                        <div>
                          <small>SKU</small>
                          <strong>{selectedItem.sku || "—"}</strong>
                        </div>

                        <div>
                          <small>Barcode</small>
                          <strong>{selectedItem.barcode || "—"}</strong>
                        </div>

                        <div>
                          <small>Category</small>
                          <strong>{selectedItem.category || "—"}</strong>
                        </div>

                        <div>
                          <small>Unit</small>
                          <strong>{selectedItem.unit}</strong>
                        </div>
                      </div>

                      {selectedItem.description && (
                        <p>{selectedItem.description}</p>
                      )}
                    </div>
                  )}
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
                  <h4>Inventory Settings</h4>

                  <div className="product-form-grid">
                    <div className="product-field">
                      <label>Minimum Stock Level *</label>
                      <input
                        type="number"
                        min="0"
                        step="0.001"
                        value={form.minimumStock}
                        onChange={(event) =>
                          updateField("minimumStock", event.target.value)
                        }
                        required
                      />
                    </div>
                  </div>

                  <p className="product-inventory-note">
                    Initial quantity will be zero. Use Stock Entry to record
                    incoming inventory.
                  </p>
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
                  disabled={saving || loadingItems || !selectedItem}
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
