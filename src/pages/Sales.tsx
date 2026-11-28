
import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./Sales.css";

type IconName =
  | "search"
  | "plus"
  | "minus"
  | "trash"
  | "cart"
  | "card"
  | "cash"
  | "package"
  | "refresh"
  | "check"
  | "close";

interface IconProps {
  size?: number;
  className?: string;
}

const iconPaths: Record<IconName, string> = {
  search: "M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16ZM21 21l-4.35-4.35",
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  trash: "M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m5 4v6m4-6v6",
  cart: "M3 3h2l2.4 12.5a2 2 0 0 0 2 1.5h8.8a2 2 0 0 0 2-1.6L22 8H6M10 21h.01M18 21h.01",
  card: "M2 5h20v14H2zM2 10h20",
  cash: "M3 6h18v12H3zM7 10a2 2 0 1 0 0 4m10-4a2 2 0 1 1 0 4m-5-3v2",
  package: "m12 3 9 5-9 5-9-5 9-5Zm-9 5v9l9 5 9-5V8M12 13v9",
  refresh: "M20 7v5h-5M4 17v-5h5m-4-3a8 8 0 0 1 13.7-2L20 12M4 12l1.3 5A8 8 0 0 0 19 15",
  check: "M22 11.1V12a10 10 0 1 1-5.9-9.1M22 4 12 14l-3-3",
  close: "M18 6 6 18M6 6l12 12",
};

function Icon({
  name,
  size = 24,
  className,
}: IconProps & { name: IconName }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={iconPaths[name]} />
    </svg>
  );
}

const Search = (props: IconProps) => <Icon name="search" {...props} />;
const Plus = (props: IconProps) => <Icon name="plus" {...props} />;
const Minus = (props: IconProps) => <Icon name="minus" {...props} />;
const Trash2 = (props: IconProps) => <Icon name="trash" {...props} />;
const ShoppingCart = (props: IconProps) => <Icon name="cart" {...props} />;
const CreditCard = (props: IconProps) => <Icon name="card" {...props} />;
const Banknote = (props: IconProps) => <Icon name="cash" {...props} />;
const Package = (props: IconProps) => <Icon name="package" {...props} />;
const RefreshCw = (props: IconProps) => <Icon name="refresh" {...props} />;
const CheckCircle2 = (props: IconProps) => <Icon name="check" {...props} />;
const X = (props: IconProps) => <Icon name="close" {...props} />;

// TYPES

interface Product {
  id: number;
  product_name: string;
  sku: string | null;
  barcode: string | null;
  category: string | null;
  selling_price: number;
  cost_price: number;
  quantity: number;
  unit: string;
  image_path: string | null;
  status: string;
}

interface AuthenticatedUser {
  id: number;
  full_name: string;
  username: string;
  role: string;
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface SaleResult {
  id: number;
  receipt_no: string;
  subtotal: number;
  discount: number;
  total_amount: number;
  amount_paid: number;
  change_amount: number;
}

interface SaleHistory {
  id: number;
  receipt_no: string;
  sale_time: string;
  item_count: number;
  item_names: string | null;
  total_amount: number;
  payment_method: string | null;
  status: string | null;
}

interface SalesProps {
  user: AuthenticatedUser;
}

type PaymentMethod = "cash" | "card" | "other";

const money = (amount: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(amount);

// SALES COMPONENT

export default function Sales({ user }: SalesProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);

  const [todaySales, setTodaySales] = useState<SaleHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [discount, setDiscount] = useState("0");
  const [amountPaid, setAmountPaid] = useState("");
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("cash");

  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<SaleResult | null>(null);

  // LOAD PRODUCTS

  const loadProducts = async () => {
    setLoading(true);
    setError("");

    try {
      const result = await invoke<Product[]>("get_pos_products");
      setProducts(result);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  // LOAD TODAY'S SALES

  const loadTodaySales = async () => {
    setHistoryLoading(true);

    try {
      const result = await invoke<SaleHistory[]>("get_today_sales");
      setTodaySales(result);
    } catch (err) {
      setError(String(err));
    } finally {
      setHistoryLoading(false);
    }
  };

  // INITIAL LOAD

  useEffect(() => {
    loadProducts();
    loadTodaySales();
  }, []);

  // CATEGORIES

  const categories = useMemo(() => {
    const values = products
      .map((product) => product.category)
      .filter((value): value is string => Boolean(value));

    return ["All", ...Array.from(new Set(values)).sort()];
  }, [products]);

  // FILTER PRODUCTS

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();

    return products.filter((product) => {
      const matchesSearch =
        !term ||
        product.product_name.toLowerCase().includes(term) ||
        (product.sku ?? "").toLowerCase().includes(term) ||
        (product.barcode ?? "").toLowerCase().includes(term);

      const matchesCategory =
        category === "All" || product.category === category;

      return (
        matchesSearch &&
        matchesCategory &&
        product.status === "active"
      );
    });
  }, [products, search, category]);


const filteredTodaySales = useMemo(() => {
  const term = historySearch.trim().toLowerCase();

  if (!term) return todaySales;

  return todaySales.filter((sale) => {
    const searchableText = [
      sale.receipt_no,
      sale.item_names ?? "",
      sale.payment_method ?? "",
      sale.status ?? "",
      sale.sale_time,
    ]
      .join(" ")
      .toLowerCase();

    return searchableText.includes(term);
  });
}, [todaySales, historySearch]);
  // TOTALS

  const subtotal = cart.reduce(
    (sum, item) => sum + item.product.selling_price * item.quantity,
    0
  );

  const discountValue = Math.max(0, Number(discount) || 0);
  const total = Math.max(0, subtotal - discountValue);
  const paid = Math.max(0, Number(amountPaid) || 0);
  const change = Math.max(0, paid - total);

  // CART FUNCTIONS

  const addToCart = (product: Product) => {
    if (product.quantity <= 0) return;

    setCart((current) => {
      const existing = current.find(
        (item) => item.product.id === product.id
      );

      if (existing) {
        if (existing.quantity >= product.quantity) return current;

        return current.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [...current, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: number, amount: number) => {
    setCart((current) =>
      current
        .map((item) => {
          if (item.product.id !== productId) return item;

          const nextQuantity = item.quantity + amount;

          if (nextQuantity <= 0) return null;

          if (nextQuantity > item.product.quantity) {
            return item;
          }

          return { ...item, quantity: nextQuantity };
        })
        .filter((item): item is CartItem => item !== null)
    );
  };

  const removeFromCart = (productId: number) => {
    setCart((current) =>
      current.filter((item) => item.product.id !== productId)
    );
  };

  const clearCart = () => {
    setCart([]);
    setDiscount("0");
    setAmountPaid("");
  };

  // CHECKOUT

  const handleCheckout = async () => {
    if (cart.length === 0) {
      setError("Please add products to your cart.");
      return;
    }

    if (discountValue > subtotal) {
      setError("Discount cannot exceed the subtotal.");
      return;
    }

    if (paid < total) {
      setError("Payment amount is insufficient.");
      return;
    }

    setCheckingOut(true);
    setError("");

    try {
      const result = await invoke<SaleResult>("complete_sale", {
        cashierId: user.id,
        items: cart.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
        })),
        discount: discountValue,
        amountPaid: paid,
        paymentMethod,
      });

      // Show success only after backend confirms the sale.
      setSuccess(result);

      clearCart();

      // Refresh stock and sales history.
      await Promise.all([
        loadProducts(),
        loadTodaySales(),
      ]);
    } catch (err) {
      setError(String(err));
      await loadProducts();
    } finally {
      setCheckingOut(false);
    }
  };

  // RENDER

  return (
    <div className="sales-page">
      <div className="sales-header">
        <div>
          <h1>Point of Sale</h1>
          <p>Process transactions and manage customer purchases.</p>
        </div>

        <button
          className="sales-refresh"
          onClick={loadProducts}
          disabled={loading}
          title="Refresh products"
        >
          <RefreshCw size={17} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="sales-alert sales-alert-error">
          <span>{error}</span>
          <button onClick={() => setError("")}>
            <X size={17} />
          </button>
        </div>
      )}

      <div className="sales-workspace">
        <section className="sales-products-panel">
          <div className="sales-search">
            <Search size={19} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search product name, SKU or barcode..."
            />

            {search && (
              <button onClick={() => setSearch("")}>
                <X size={17} />
              </button>
            )}
          </div>

          <div className="sales-categories">
            {categories.map((item) => (
              <button
                key={item}
                className={category === item ? "active" : ""}
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="sales-product-heading">
            <div>
              <h2>Products</h2>
              <span>{filteredProducts.length} products available</span>
            </div>
          </div>

          {loading ? (
            <div className="sales-empty">
              <RefreshCw className="sales-spin" size={28} />
              <p>Loading products...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="sales-empty">
              <Package size={35} />
              <p>No products found.</p>
            </div>
          ) : (
            <div className="sales-product-grid">
              {filteredProducts.map((product) => {
                const cartItem = cart.find(
                  (item) => item.product.id === product.id
                );

                const outOfStock = product.quantity <= 0;

                return (
                  <button
                    key={product.id}
                    className={`sales-product-card ${
                      outOfStock ? "out-of-stock" : ""
                    }`}
                    onClick={() => addToCart(product)}
                    disabled={outOfStock}
                  >
                    <div className="sales-product-image">
                      {product.image_path ? (
                        <img
                          src={product.image_path}
                          alt={product.product_name}
                        />
                      ) : (
                        <Package size={31} />
                      )}

                      {cartItem && (
                        <span className="sales-cart-count">
                          {cartItem.quantity}
                        </span>
                      )}
                    </div>

                    <div className="sales-product-info">
                      <strong>{product.product_name}</strong>
                      <span>{product.sku || "No SKU"}</span>

                      <div className="sales-product-bottom">
                        <strong>{money(product.selling_price)}</strong>
                        <span>
                          {outOfStock
                            ? "Out of stock"
                            : `${product.quantity} ${product.unit} left`}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <aside className="sales-cart-panel">
          <div className="sales-cart-header">
            <div>
              <h2>
                <ShoppingCart size={20} />
                Current Sale
              </h2>
              <span>
                {cart.reduce((sum, item) => sum + item.quantity, 0)} items
              </span>
            </div>

            <button
              className="sales-clear-button"
              onClick={clearCart}
              disabled={cart.length === 0}
            >
              Clear
            </button>
          </div>

          <div className="sales-cart-items">
            {cart.length === 0 ? (
              <div className="sales-cart-empty">
                <ShoppingCart size={38} />
                <strong>Your cart is empty</strong>
                <span>Select products to start a sale.</span>
              </div>
            ) : (
              cart.map((item) => (
                <div className="sales-cart-item" key={item.product.id}>
                  <div className="sales-cart-item-info">
                    <strong>{item.product.product_name}</strong>
                    <span>{money(item.product.selling_price)} each</span>

                    <div className="sales-quantity-controls">
                      <button
                        onClick={() => updateQuantity(item.product.id, -1)}
                      >
                        <Minus size={13} />
                      </button>

                      <span>{item.quantity}</span>

                      <button
                        onClick={() => updateQuantity(item.product.id, 1)}
                        disabled={item.quantity >= item.product.quantity}
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                  </div>

                  <div className="sales-cart-item-total">
                    <strong>
                      {money(item.product.selling_price * item.quantity)}
                    </strong>

                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      title="Remove item"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="sales-payment-section">
            <div className="sales-summary-row">
              <span>Subtotal</span>
              <strong>{money(subtotal)}</strong>
            </div>

            <div className="sales-discount-row">
              <label htmlFor="sales-discount">Discount (₱)</label>
              <input
                id="sales-discount"
                type="number"
                min="0"
                max={subtotal}
                step="0.01"
                value={discount}
                onChange={(event) => setDiscount(event.target.value)}
              />
            </div>

            <div className="sales-total-row">
              <span>Total Amount</span>
              <strong>{money(total)}</strong>
            </div>

            <div className="sales-payment-label">
              Payment Method
            </div>

            <div className="sales-payment-methods">
              <button
                className={paymentMethod === "cash" ? "active" : ""}
                onClick={() => setPaymentMethod("cash")}
              >
                <Banknote size={17} />
                Cash
              </button>

              <button
                className={paymentMethod === "card" ? "active" : ""}
                onClick={() => setPaymentMethod("card")}
              >
                <CreditCard size={17} />
                Card
              </button>

              <button
                className={paymentMethod === "other" ? "active" : ""}
                onClick={() => setPaymentMethod("other")}
              >
                Other
              </button>
            </div>

            <label className="sales-amount-label" htmlFor="sales-paid">
              Amount Tendered (₱)
            </label>

            <input
              id="sales-paid"
              className="sales-paid-input"
              type="number"
              min="0"
              step="0.01"
              value={amountPaid}
              onChange={(event) => setAmountPaid(event.target.value)}
              placeholder="Enter payment amount"
            />

            {paymentMethod === "cash" && (
              <div className="sales-change-row">
                <span>Change</span>
                <strong>{money(change)}</strong>
              </div>
            )}

            <button
              className="sales-checkout-button"
              onClick={handleCheckout}
              disabled={
                cart.length === 0 ||
                checkingOut ||
                paid < total
              }
            >
              {checkingOut ? (
                <>
                  <RefreshCw className="sales-spin" size={18} />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle2 size={19} />
                  Complete Sale
                </>
              )}
            </button>

            <p className="sales-cashier">
              Cashier: <strong>{user.full_name}</strong>
            </p>
          </div>
        </aside>
      </div>


    {/* TODAY'S SALES HISTORY */}
    <section className="sales-history-section">
    <div className="sales-history-header">
        <div>
        <h2>Today's Sales History</h2>
        <p>Transactions completed today</p>
        </div>

        <button
        className="sales-refresh"
        onClick={loadTodaySales}
        disabled={historyLoading}
        >
        <RefreshCw
            size={16}
            className={historyLoading ? "sales-spin" : ""}
        />
        Refresh
        </button>
    </div>

    <div className="sales-history-summary">
        <div>
        <span>Total Transactions</span>
        <strong>{todaySales.length}</strong>
        </div>

        <div>
        <span>Total Sales Today</span>
        <strong>
            {money(
            todaySales.reduce((sum, sale) => {
                const amount = Number(sale.total_amount);
                return sum + (Number.isFinite(amount) ? amount : 0);
            }, 0)
            )}
        </strong>
        </div>
    </div>

    {/* SEARCH SALES HISTORY */}
    <div className="sales-history-search">
        <Search size={18} />

        <input
        type="text"
        value={historySearch}
        onChange={(event) => setHistorySearch(event.target.value)}
        placeholder="Search receipt number, product name, payment or status..."
        />

        {historySearch && (
        <button
            type="button"
            onClick={() => setHistorySearch("")}
            title="Clear search"
        >
            <X size={17} />
        </button>
        )}
    </div>

    {historyLoading && todaySales.length === 0 ? (
        <div className="sales-history-empty">
        <RefreshCw className="sales-spin" size={22} />
        <p>Loading sales history...</p>
        </div>
    ) : todaySales.length === 0 ? (
        <div className="sales-history-empty">
        <ShoppingCart size={30} />
        <strong>No sales recorded today</strong>
        <p>Completed transactions will appear here.</p>
        </div>
    ) : filteredTodaySales.length === 0 ? (
        <div className="sales-history-empty">
        <Search size={30} />
        <strong>No matching transactions</strong>
        <p>Try searching with another receipt number or product name.</p>
        </div>
    ) : (
        <div className="sales-history-table-wrapper">
        <table className="sales-history-table">
            <thead>
            <tr>
                <th>Receipt No.</th>
                <th>Time</th>
                <th>Items</th>
                <th>Item Names</th>
                <th>Payment</th>
                <th>Total</th>
                <th>Status</th>
            </tr>
            </thead>

            <tbody>
            {filteredTodaySales.map((sale) => (
                <tr key={sale.id}>
                <td>
                    <strong>{sale.receipt_no}</strong>
                </td>

                <td>{sale.sale_time}</td>

                <td>{sale.item_count}</td>

                <td className="sales-history-item-names">
                    {sale.item_names || "No item details"}
                </td>

                <td>
                    <span className="sales-payment-badge">
                    {(sale.payment_method || "N/A").toUpperCase()}
                    </span>
                </td>

                <td>
                    <strong>
                    {money(Number(sale.total_amount) || 0)}
                    </strong>
                </td>

                <td>
                    <span
                    className={`sales-status-badge ${
                        sale.status === "completed"
                        ? "completed"
                        : "voided"
                    }`}
                    >
                    {sale.status || "Unknown"}
                    </span>
                </td>
                </tr>
            ))}
            </tbody>
        </table>
        </div>
    )}

    <p className="sales-history-count">
        Showing {filteredTodaySales.length} of {todaySales.length} transactions
    </p>
    </section>

      {/* SUCCESS POPUP */}

      {success && (
        <div className="sales-modal-backdrop">
          <div className="sales-success-modal">
            <div className="sales-success-icon">
              <CheckCircle2 size={38} />
            </div>

            <h2>Sale Completed!</h2>
            <p>Your transaction has been saved successfully.</p>

            <div className="sales-receipt-details">
              <div>
                <span>Receipt Number</span>
                <strong>{success.receipt_no}</strong>
              </div>

              <div>
                <span>Subtotal</span>
                <strong>{money(success.subtotal)}</strong>
              </div>

              <div>
                <span>Discount</span>
                <strong>{money(success.discount)}</strong>
              </div>

              <div>
                <span>Total Paid</span>
                <strong>{money(success.amount_paid)}</strong>
              </div>

              <div>
                <span>Change</span>
                <strong>{money(success.change_amount)}</strong>
              </div>
            </div>

            <button
              className="sales-checkout-button"
              onClick={() => setSuccess(null)}
            >
              New Sale
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
