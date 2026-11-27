use rust_decimal::Decimal;
use serde::Serialize;
use sqlx::MySqlPool;

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct Product {
    pub id: u64,
    pub product_name: String,
    pub sku: Option<String>,
    pub barcode: Option<String>,
    pub description: Option<String>,
    pub category: Option<String>,
    pub cost_price: Decimal,
    pub selling_price: Decimal,
    pub unit: String,
    pub quantity: Decimal,
    pub minimum_stock: Decimal,
    pub image_path: Option<String>,
    pub status: String,
}

fn clean_optional(value: Option<String>) -> Option<String> {
    value.and_then(|v| {
        let trimmed = v.trim().to_string();

        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed)
        }
    })
}

fn validate_product(
    product_name: &str,
    cost_price: Decimal,
    selling_price: Decimal,
    quantity: Decimal,
    minimum_stock: Decimal,
) -> Result<(), String> {
    if product_name.trim().is_empty() {
        return Err("Product name is required.".to_string());
    }

    if product_name.trim().len() > 150 {
        return Err("Product name cannot exceed 150 characters.".to_string());
    }

    if cost_price < Decimal::ZERO || selling_price < Decimal::ZERO {
        return Err("Product prices cannot be negative.".to_string());
    }

    if quantity < Decimal::ZERO || minimum_stock < Decimal::ZERO {
        return Err("Product quantities cannot be negative.".to_string());
    }

    Ok(())
}

pub async fn get_products(pool: &MySqlPool) -> Result<Vec<Product>, String> {
    sqlx::query_as::<_, Product>(
        r#"
        SELECT
            id,
            product_name,
            sku,
            barcode,
            description,
            category,
            cost_price,
            selling_price,
            unit,
            quantity,
            minimum_stock,
            image_path,
            status
        FROM products
        ORDER BY product_name ASC
        "#
    )
    .fetch_all(pool)
    .await
    .map_err(|error| format!("Could not load products: {}", error))
}

pub async fn add_product(
    pool: &MySqlPool,
    product_name: String,
    sku: Option<String>,
    barcode: Option<String>,
    description: Option<String>,
    category: Option<String>,
    cost_price: Decimal,
    selling_price: Decimal,
    unit: String,
    quantity: Decimal,
    minimum_stock: Decimal,
    created_by: Option<u64>,
) -> Result<u64, String> {
    validate_product(
        &product_name,
        cost_price,
        selling_price,
        quantity,
        minimum_stock,
    )?;

    let unit = unit.trim().to_string();

    if unit.is_empty() || unit.len() > 30 {
        return Err("Please enter a valid unit of measurement.".to_string());
    }

    let result = sqlx::query(
        r#"
        INSERT INTO products (
            product_name,
            sku,
            barcode,
            description,
            category,
            cost_price,
            selling_price,
            unit,
            quantity,
            minimum_stock,
            created_by
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        "#
    )
    .bind(product_name.trim())
    .bind(clean_optional(sku))
    .bind(clean_optional(barcode))
    .bind(clean_optional(description))
    .bind(clean_optional(category))
    .bind(cost_price)
    .bind(selling_price)
    .bind(unit)
    .bind(quantity)
    .bind(minimum_stock)
    .bind(created_by)
    .execute(pool)
    .await
    .map_err(|error| format!("Could not add product. Check whether its SKU or barcode already exists. Details: {}", error))?;

    Ok(result.last_insert_id())
}

pub async fn update_product(
    pool: &MySqlPool,
    id: u64,
    product_name: String,
    sku: Option<String>,
    barcode: Option<String>,
    description: Option<String>,
    category: Option<String>,
    cost_price: Decimal,
    selling_price: Decimal,
    unit: String,
    quantity: Decimal,
    minimum_stock: Decimal,
    status: String,
) -> Result<(), String> {
    validate_product(
        &product_name,
        cost_price,
        selling_price,
        quantity,
        minimum_stock,
    )?;

    let unit = unit.trim().to_string();

    if unit.is_empty() || unit.len() > 30 {
        return Err("Please enter a valid unit of measurement.".to_string());
    }

    if status != "active" && status != "inactive" {
        return Err("Invalid product status.".to_string());
    }

    let result = sqlx::query(
        r#"
        UPDATE products
        SET
            product_name = ?,
            sku = ?,
            barcode = ?,
            description = ?,
            category = ?,
            cost_price = ?,
            selling_price = ?,
            unit = ?,
            quantity = ?,
            minimum_stock = ?,
            status = ?
        WHERE id = ?
        "#
    )
    .bind(product_name.trim())
    .bind(clean_optional(sku))
    .bind(clean_optional(barcode))
    .bind(clean_optional(description))
    .bind(clean_optional(category))
    .bind(cost_price)
    .bind(selling_price)
    .bind(unit)
    .bind(quantity)
    .bind(minimum_stock)
    .bind(status)
    .bind(id)
    .execute(pool)
    .await
    .map_err(|error| format!("Could not update product: {}", error))?;

    if result.rows_affected() == 0 {
        return Err("Product not found.".to_string());
    }

    Ok(())
}

pub async fn delete_product(
    pool: &MySqlPool,
    id: u64,
) -> Result<(), String> {
    let result = sqlx::query("DELETE FROM products WHERE id = ?")
        .bind(id)
        .execute(pool)
        .await
        .map_err(|error| format!("Could not delete product: {}", error))?;

    if result.rows_affected() == 0 {
        return Err("Product not found.".to_string());
    }

    Ok(())
}