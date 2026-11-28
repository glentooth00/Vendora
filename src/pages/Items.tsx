
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { AuthenticatedUser } from "../types";
import "../styles/items.css";

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

interface ItemSummary {
  total_items: number;
  active_items: number;
  inactive_items: number;
}

interface ItemsProps {
  user: AuthenticatedUser;
}

interface ItemForm {
  itemName: string;
  sku: string;
  barcode: string;
  category: string;
  unit: string;
  description: string;
  status: string;
}

const emptyForm: ItemForm = {
  itemName: "",
  sku: "",
  barcode: "",
  category: "",
  unit: "pcs",
  description: "",
  status: "active",
};

export default function Items({ user }: ItemsProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [summary, setSummary] = useState<ItemSummary>({
    total_items: 0,
    active_items: 0,
    inactive_items: 0,
  });

  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [form, setForm] = useState<ItemForm>(emptyForm);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadItems() {
    try {
      setLoading(true);
      setError("");

      const [itemResult, summaryResult] = await Promise.all([
        invoke<Item[]>("get_items"),
        invoke<ItemSummary>("get_item_summary"),
      ]);

      setItems(itemResult);
      setSummary(summaryResult);
    } catch (err) {
      console.error("Could not load item catalog:", err);
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadItems();
  }, []);

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return items;

    return items.filter((item) =>
      [
        item.item_name,
        item.sku ?? "",
        item.barcode ?? "",
        item.category ?? "",
        item.unit,
      ].some((value) => value.toLowerCase().includes(term))
    );
  }, [items, search]);

  function updateField(field: keyof ItemForm, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function openAddModal() {
    setEditingItem(null);
    setForm(emptyForm);
    setError("");
    setSuccess("");
    setShowModal(true);
  }

  function openEditModal(item: Item) {
    setEditingItem(item);

    setForm({
      itemName: item.item_name,
      sku: item.sku ?? "",
      barcode: item.barcode ?? "",
      category: item.category ?? "",
      unit: item.unit,
      description: item.description ?? "",
      status: item.status,
    });

    setError("");
    setSuccess("");
    setShowModal(true);
  }

  function closeModal() {
    if (saving) return;

    setShowModal(false);
    setEditingItem(null);
    setForm(emptyForm);
    setError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!form.itemName.trim()) {
      setError("Please enter an item name.");
      return;
    }

    if (!form.unit.trim()) {
      setError("Please select a unit of measurement.");
      return;
    }

    const item = {
      itemName: form.itemName.trim(),
      sku: form.sku.trim() || null,
      barcode: form.barcode.trim() || null,
      category: form.category.trim() || null,
      unit: form.unit.trim(),
      description: form.description.trim() || null,
      status: form.status,
    };

    try {
      setSaving(true);

      if (editingItem) {
        await invoke("update_item", {
          id: editingItem.id,
          item,
        });

        setSuccess("Item updated successfully.");
      } else {
        await invoke<number>("add_item", {
          item,
          createdBy: user.id,
        });

        setSuccess("Item registered successfully.");
      }

      setShowModal(false);
      setEditingItem(null);
      setForm(emptyForm);

      await loadItems();
    } catch (err) {
      console.error("Could not save item:", err);
      setError(String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="dashboard-content items-page">
      <div className="items-heading">
        <div>
          <div className="items-eyebrow">WORKSPACE / CATALOG</div>
          <h2>Item Catalog</h2>
          <p>
            Register and manage the items available in your business.
          </p>
        </div>

        <button
          className="items-add-button"
          onClick={openAddModal}
          type="button"
        >
          <span>＋</span> Add Item
        </button>
      </div>

      <div className="items-summary">
        <div className="items-summary-card">
          <div className="items-summary-icon total">▤</div>
          <div>
            <span>Total Items</span>
            <strong>{summary.total_items}</strong>
            <small>Registered catalog items</small>
          </div>
        </div>

        <div className="items-summary-card">
          <div className="items-summary-icon active">✓</div>
          <div>
            <span>Active Items</span>
            <strong className="items-active-count">
              {summary.active_items}
            </strong>
            <small>Available for stock entry</small>
          </div>
        </div>

        <div className="items-summary-card">
          <div className="items-summary-icon inactive">Ⅱ</div>
          <div>
            <span>Inactive Items</span>
            <strong className="items-inactive-count">
              {summary.inactive_items}
            </strong>
            <small>Currently unavailable</small>
          </div>
        </div>
      </div>

      {success && (
        <div className="items-success" role="status">
          <span>✓</span>
          {success}
          <button type="button" onClick={() => setSuccess("")}>
            Dismiss
          </button>
        </div>
      )}

      {error && !showModal && (
        <div className="items-error" role="alert">
          {error}
        </div>
      )}

      <div className="items-table-panel">
        <div className="items-table-heading">
          <div>
            <h3>Registered Items</h3>
            <p>View and manage your item catalog.</p>
          </div>

          <div className="items-search">
            <span>⌕</span>
            <input
              type="search"
              placeholder="Search name, SKU, barcode..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>

        <div className="items-table-wrapper">
          <table className="items-table">
            <thead>
              <tr>
                <th>ITEM</th>
                <th>SKU</th>
                <th>BARCODE</th>
                <th>CATEGORY</th>
                <th>UNIT</th>
                <th>STATUS</th>
                <th>ACTION</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="items-empty">
                    Loading item catalog...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="items-empty">
                    <div className="items-empty-icon">▤</div>
                    <strong>
                      {search ? "No matching items" : "No items registered"}
                    </strong>
                    <p>
                      {search
                        ? "Try searching with another name, SKU, or barcode."
                        : "Register your first item to start building your catalog."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="items-name-cell">
                        <strong>{item.item_name}</strong>
                        {item.description && (
                          <small>{item.description}</small>
                        )}
                      </div>
                    </td>

                    <td>{item.sku || "—"}</td>
                    <td>{item.barcode || "—"}</td>
                    <td>{item.category || "Uncategorized"}</td>
                    <td>{item.unit}</td>

                    <td>
                      <span
                        className={`items-status ${
                          item.status.toLowerCase() === "active"
                            ? "active"
                            : "inactive"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>

                    <td>
                      <button
                        type="button"
                        className="items-edit-button"
                        onClick={() => openEditModal(item)}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="items-table-footer">
          <span>
            Showing {filteredItems.length} of {summary.total_items} items
          </span>

          <button
            type="button"
            onClick={() => void loadItems()}
            disabled={loading}
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {showModal && (
        <div className="items-modal-overlay" onMouseDown={closeModal}>
          <div
            className="items-modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="items-modal-header">
              <div>
                <h3>{editingItem ? "Edit Item" : "Add New Item"}</h3>
                <p>
                  {editingItem
                    ? "Update the information for this catalog item."
                    : "Register an item in your business catalog."}
                </p>
              </div>

              <button
                type="button"
                className="items-modal-close"
                onClick={closeModal}
                disabled={saving}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="items-form-body">
                {error && (
                  <div className="items-error" role="alert">
                    {error}
                  </div>
                )}

                <div className="items-form-section">
                  <h4>Basic Information</h4>

                  <div className="items-form-grid">
                    <div className="items-field full">
                      <label htmlFor="itemName">Item Name *</label>
                      <input
                        id="itemName"
                        value={form.itemName}
                        onChange={(event) =>
                          updateField("itemName", event.target.value)
                        }
                        placeholder="Enter item name"
                        maxLength={150}
                        required
                        autoFocus
                      />
                    </div>

                    <div className="items-field">
                      <label htmlFor="itemSku">SKU</label>
                      <input
                        id="itemSku"
                        value={form.sku}
                        onChange={(event) =>
                          updateField("sku", event.target.value)
                        }
                        placeholder="e.g. ITEM-001"
                        maxLength={100}
                      />
                    </div>

                    <div className="items-field">
                      <label htmlFor="itemBarcode">Barcode</label>
                      <input
                        id="itemBarcode"
                        value={form.barcode}
                        onChange={(event) =>
                          updateField("barcode", event.target.value)
                        }
                        placeholder="Enter barcode"
                        maxLength={100}
                      />
                    </div>

                    <div className="items-field">
                      <label htmlFor="itemCategory">Category</label>
                      <input
                        id="itemCategory"
                        value={form.category}
                        onChange={(event) =>
                          updateField("category", event.target.value)
                        }
                        placeholder="e.g. Accessories"
                        maxLength={100}
                      />
                    </div>

                    <div className="items-field">
                      <label htmlFor="itemUnit">Unit *</label>
                      <select
                        id="itemUnit"
                        value={form.unit}
                        onChange={(event) =>
                          updateField("unit", event.target.value)
                        }
                        required
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

                    <div className="items-field full">
                      <label htmlFor="itemDescription">Description</label>
                      <textarea
                        id="itemDescription"
                        value={form.description}
                        onChange={(event) =>
                          updateField("description", event.target.value)
                        }
                        placeholder="Enter an optional item description"
                        rows={3}
                      />
                    </div>

                    <div className="items-field full">
                      <label htmlFor="itemStatus">Status *</label>
                      <select
                        id="itemStatus"
                        value={form.status}
                        onChange={(event) =>
                          updateField("status", event.target.value)
                        }
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="items-form-note">
                  <span>ⓘ</span>
                  Registering an item does not add stock. Use Stock Entry to
                  record incoming inventory.
                </div>
              </div>

              <div className="items-modal-footer">
                <button
                  type="button"
                  className="items-cancel-button"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="items-save-button"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingItem
                      ? "Save Changes"
                      : "Register Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
