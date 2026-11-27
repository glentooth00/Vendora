
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, MySqlPool};
use std::collections::BTreeMap;
use std::time::{SystemTime, UNIX_EPOCH};

use crate::products::{self, Product};

// SALE INPUT

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaleItemInput {
    pub product_id: u64,
    pub quantity: Decimal,
}

// SALE RESULT

#[derive(Debug, Serialize)]
pub struct SaleResult {
    pub id: u64,
    pub receipt_no: String,
    pub subtotal: Decimal,
    pub discount: Decimal,
    pub total_amount: Decimal,
    pub amount_paid: Decimal,
    pub change_amount: Decimal,
}

// SALE HISTORY

#[derive(Debug, Serialize, FromRow)]
pub struct SaleHistory {
    pub id: u64,
    pub receipt_no: String,
    pub sale_time: String,
    pub item_count: i64,
    pub item_names: Option<String>,
    pub total_amount: Decimal,
    pub payment_method: String,
    pub status: String,
}

// PRODUCT RECORD FOR CHECKOUT

#[derive(Debug, FromRow)]
struct ProductForSale {
    id: u64,
    product_name: String,
    sku: Option<String>,
    cost_price: Decimal,
    selling_price: Decimal,
    quantity: Decimal,
    status: String,
}

// GET POS PRODUCTS

pub async fn get_pos_products(
    pool: &MySqlPool,
) -> Result<Vec<Product>, String> {
    let products = products::get_products(pool).await?;

    Ok(products
        .into_iter()
        .filter(|product| product.status == "active")
        .collect())
}

// COMPLETE SALE

pub async fn complete_sale(
    pool: &MySqlPool,
    cashier_id: u64,
    items: Vec<SaleItemInput>,
    discount: Decimal,
    amount_paid: Decimal,
    payment_method: String,
) -> Result<SaleResult, String> {

    if items.is_empty() {
        return Err("Your cart is empty.".to_string());
    }

    if discount < Decimal::ZERO {
        return Err("Discount cannot be negative.".to_string());
    }

    if amount_paid < Decimal::ZERO {
        return Err("Payment amount cannot be negative.".to_string());
    }

    if !["cash", "card", "other"].contains(&payment_method.as_str()) {
        return Err("Invalid payment method.".to_string());
    }

    // Combine duplicate products.
    // BTreeMap also ensures products are locked in ID order.

    let mut cart: BTreeMap<u64, Decimal> = BTreeMap::new();

    for item in items {
        if item.quantity <= Decimal::ZERO {
            return Err("Item quantities must be greater than zero.".to_string());
        }

        let entry = cart
            .entry(item.product_id)
            .or_insert(Decimal::ZERO);

        *entry += item.quantity;
    }

    // BEGIN DATABASE TRANSACTION

    let mut tx = pool
        .begin()
        .await
        .map_err(|e| format!("Could not start sale transaction: {}", e))?;

    let mut sale_products = Vec::new();
    let mut subtotal = Decimal::ZERO;

    // VERIFY AND LOCK CURRENT STOCK

    for (product_id, requested_quantity) in &cart {
        let product = sqlx::query_as::<_, ProductForSale>(
            r#"
            SELECT
                id,
                product_name,
                sku,
                cost_price,
                selling_price,
                quantity,
                status
            FROM products
            WHERE id = ?
            FOR UPDATE
            "#
        )
        .bind(*product_id)
        .fetch_optional(&mut *tx)
        .await
        .map_err(|e| format!("Could not retrieve product: {}", e))?
        .ok_or_else(|| format!("Product ID {} was not found.", product_id))?;

        if product.status != "active" {
            return Err(format!(
                "{} is inactive and cannot be sold.",
                product.product_name
            ));
        }

        if product.quantity < *requested_quantity {
            return Err(format!(
                "Insufficient stock for {}. Available: {}, Requested: {}.",
                product.product_name,
                product.quantity,
                requested_quantity
            ));
        }

        let line_total =
            (product.selling_price * *requested_quantity).round_dp(2);

        subtotal += line_total;

        sale_products.push((
            *requested_quantity,
            product,
            line_total,
        ));
    }

    subtotal = subtotal.round_dp(2);

    if discount > subtotal {
        return Err("Discount cannot exceed the subtotal.".to_string());
    }

    let total_amount = (subtotal - discount).round_dp(2);

    if amount_paid < total_amount {
        return Err(format!(
            "Insufficient payment. Amount due: {}.",
            total_amount
        ));
    }

    let stored_amount_paid = if payment_method == "cash" {
        amount_paid
    } else {
        total_amount
    };

    let change_amount = if payment_method == "cash" {
        (amount_paid - total_amount).round_dp(2)
    } else {
        Decimal::ZERO
    };

    // GENERATE RECEIPT NUMBER

    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();

    let receipt_no = format!("VND-{}", timestamp);

    // 1. SAVE SALE HEADER

    let sale_result = sqlx::query(
        r#"
        INSERT INTO sales (
            receipt_no,
            cashier_id,
            subtotal,
            discount,
            total_amount,
            amount_paid,
            change_amount,
            payment_method,
            status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completed')
        "#
    )
    .bind(&receipt_no)
    .bind(cashier_id)
    .bind(subtotal)
    .bind(discount)
    .bind(total_amount)
    .bind(stored_amount_paid)
    .bind(change_amount)
    .bind(&payment_method)
    .execute(&mut *tx)
    .await
    .map_err(|e| format!("Could not save sale: {}", e))?;

    let sale_id = sale_result.last_insert_id();

    // 2. SAVE ITEMS
    // 3. DEDUCT CURRENT STOCK
    // 4. RECORD STOCK MOVEMENTS

    for (requested_quantity, product, line_total) in sale_products {
        let new_quantity = product.quantity - requested_quantity;

        sqlx::query(
            r#"
            INSERT INTO sale_items (
                sale_id,
                product_id,
                product_name,
                sku,
                quantity,
                unit_price,
                cost_price,
                line_total
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            "#
        )
        .bind(sale_id)
        .bind(product.id)
        .bind(&product.product_name)
        .bind(&product.sku)
        .bind(requested_quantity)
        .bind(product.selling_price)
        .bind(product.cost_price)
        .bind(line_total)
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("Could not save sale item: {}", e))?;

        // Deduct from products.quantity.

        let update_result = sqlx::query(
            r#"
            UPDATE products
            SET quantity = ?
            WHERE id = ?
              AND quantity >= ?
            "#
        )
        .bind(new_quantity)
        .bind(product.id)
        .bind(requested_quantity)
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("Could not deduct inventory: {}", e))?;

        if update_result.rows_affected() != 1 {
            return Err(format!(
                "Stock update failed for {}.",
                product.product_name
            ));
        }

        // Record stock-out movement.

        sqlx::query(
            r#"
            INSERT INTO stock_movements (
                product_id,
                movement_type,
                quantity,
                previous_quantity,
                new_quantity,
                reason,
                reference_no,
                created_by
            )
            VALUES (?, 'stock_out', ?, ?, ?, ?, ?, ?)
            "#
        )
        .bind(product.id)
        .bind(requested_quantity)
        .bind(product.quantity)
        .bind(new_quantity)
        .bind(format!("Sale {}", receipt_no))
        .bind(&receipt_no)
        .bind(cashier_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("Could not record stock movement: {}", e))?;
    }

    // 5. COMMIT EVERYTHING

    tx.commit()
        .await
        .map_err(|e| format!("Could not finalize sale: {}", e))?;

    // Return success only after database commit.

    Ok(SaleResult {
        id: sale_id,
        receipt_no,
        subtotal,
        discount,
        total_amount,
        amount_paid: stored_amount_paid,
        change_amount,
    })
}

// GET TODAY'S SALES

pub async fn get_today_sales(
    pool: &MySqlPool,
) -> Result<Vec<SaleHistory>, String> {
    sqlx::query_as::<_, SaleHistory>(
        r#"
        SELECT
            s.id,
            s.receipt_no,

            DATE_FORMAT(
                s.created_at,
                '%h:%i %p'
            ) AS sale_time,

            (
                SELECT COUNT(*)
                FROM sale_items si
                WHERE si.sale_id = s.id
            ) AS item_count,

            (
                SELECT GROUP_CONCAT(
                    si.product_name
                    ORDER BY si.product_name
                    SEPARATOR ', '
                )
                FROM sale_items si
                WHERE si.sale_id = s.id
            ) AS item_names,

            s.total_amount,
            s.payment_method,
            s.status

        FROM sales s

        WHERE s.created_at >= CURDATE()
          AND s.created_at < CURDATE() + INTERVAL 1 DAY

        ORDER BY s.created_at DESC
        "#
    )
    .fetch_all(pool)
    .await
    .map_err(|e| format!("Could not load today's sales: {}", e))
}
