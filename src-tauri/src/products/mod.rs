
use rust_decimal::Decimal;
use serde::Serialize;
use sqlx::MySqlPool;

use crate::items::Item;

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

// GET ALL PRODUCTS

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
        "#,
    )
    .fetch_all(pool)
    .await
    .map_err(|error| format!("Could not load products: {}", error))
}

// GET CATALOG ITEMS NOT YET ADDED AS PRODUCTS

pub async fn get_available_items(
    pool: &MySqlPool,
) -> Result<Vec<Item>, String> {
    sqlx::query_as::<_, Item>(
        r#"
        SELECT
            i.id,
            i.item_name,
            i.sku,
            i.barcode,
            i.description,
            i.category,
            i.unit,
            i.status
        FROM items i
        LEFT JOIN products p ON p.item_id = i.id
        WHERE i.status = 'active'
          AND p.id IS NULL
        ORDER BY i.item_name ASC
        "#,
    )
    .fetch_all(pool)
    .await
    .map_err(|error| {
        format!("Could not load available catalog items: {}", error)
    })
}

// ADD PRODUCT FROM EXISTING CATALOG ITEM

pub async fn add_product(
    pool: &MySqlPool,
    item_id: u64,
    cost_price: Decimal,
    selling_price: Decimal,
    minimum_stock: Decimal,
    created_by: Option<u64>,
) -> Result<u64, String> {
    if cost_price < Decimal::ZERO || selling_price < Decimal::ZERO {
        return Err("Product prices cannot be negative.".to_string());
    }

    if minimum_stock < Decimal::ZERO {
        return Err("Minimum stock cannot be negative.".to_string());
    }

    let mut tx = pool
        .begin()
        .await
        .map_err(|error| {
            format!("Could not start product registration: {}", error)
        })?;

    let item = sqlx::query_as::<
        _,
        (
            String,
            Option<String>,
            Option<String>,
            Option<String>,
            Option<String>,
            String,
            String,
        ),
    >(
        r#"
        SELECT
            item_name,
            sku,
            barcode,
            description,
            category,
            unit,
            status
        FROM items
        WHERE id = ?
        FOR UPDATE
        "#,
    )
    .bind(item_id)
    .fetch_optional(&mut *tx)
    .await
    .map_err(|error| {
        format!("Could not retrieve catalog item: {}", error)
    })?;

    let (
        product_name,
        sku,
        barcode,
        description,
        category,
        unit,
        item_status,
    ) = item.ok_or_else(|| {
        "The selected catalog item does not exist.".to_string()
    })?;

    if item_status != "active" {
        return Err(
            "Inactive catalog items cannot be added as products.".to_string()
        );
    }

    let existing_product = sqlx::query_scalar::<_, u64>(
        "SELECT id FROM products WHERE item_id = ? LIMIT 1",
    )
    .bind(item_id)
    .fetch_optional(&mut *tx)
    .await
    .map_err(|error| {
        format!("Could not check existing product: {}", error)
    })?;

    if existing_product.is_some() {
        return Err(
            "This catalog item has already been added as a product.".to_string()
        );
    }

    validate_product(
        &product_name,
        cost_price,
        selling_price,
        Decimal::ZERO,
        minimum_stock,
    )?;

    let result = sqlx::query(
        r#"
        INSERT INTO products (
            item_id,
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
            status,
            created_by
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'active', ?)
        "#,
    )
    .bind(item_id)
    .bind(product_name)
    .bind(sku)
    .bind(barcode)
    .bind(description)
    .bind(category)
    .bind(cost_price)
    .bind(selling_price)
    .bind(unit)
    .bind(minimum_stock)
    .bind(created_by)
    .execute(&mut *tx)
    .await
    .map_err(|error| {
        format!(
            "Could not add product. Check whether its SKU or barcode already exists. Details: {}",
            error
        )
    })?;

    let product_id = result.last_insert_id();

    tx.commit()
        .await
        .map_err(|error| {
            format!("Could not finish product registration: {}", error)
        })?;

    Ok(product_id)
}

// UPDATE PRODUCT

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

    let product_name = product_name.trim().to_string();
    let sku = clean_optional(sku);
    let barcode = clean_optional(barcode);
    let description = clean_optional(description);
    let category = clean_optional(category);
    let unit = unit.trim().to_string();

    if unit.is_empty() || unit.len() > 30 {
        return Err(
            "Please enter a valid unit of measurement.".to_string()
        );
    }

    if status != "active" && status != "inactive" {
        return Err("Invalid product status.".to_string());
    }

    let mut tx = pool
        .begin()
        .await
        .map_err(|error| {
            format!("Could not start product update: {}", error)
        })?;

    let item_id = sqlx::query_scalar::<_, Option<u64>>(
        "SELECT item_id FROM products WHERE id = ?",
    )
    .bind(id)
    .fetch_optional(&mut *tx)
    .await
    .map_err(|error| {
        format!("Could not retrieve linked catalog item: {}", error)
    })?
    .flatten();

    // Keep the catalog identity and product identity synchronized.
    if let Some(item_id) = item_id {
        sqlx::query(
            r#"
            UPDATE items
            SET
                item_name = ?,
                sku = ?,
                barcode = ?,
                description = ?,
                category = ?,
                unit = ?
            WHERE id = ?
            "#,
        )
        .bind(&product_name)
        .bind(&sku)
        .bind(&barcode)
        .bind(&description)
        .bind(&category)
        .bind(&unit)
        .bind(item_id)
        .execute(&mut *tx)
        .await
        .map_err(|error| {
            format!("Could not update catalog item: {}", error)
        })?;
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
        "#,
    )
    .bind(&product_name)
    .bind(&sku)
    .bind(&barcode)
    .bind(&description)
    .bind(&category)
    .bind(cost_price)
    .bind(selling_price)
    .bind(&unit)
    .bind(quantity)
    .bind(minimum_stock)
    .bind(&status)
    .bind(id)
    .execute(&mut *tx)
    .await
    .map_err(|error| {
        format!("Could not update product: {}", error)
    })?;

    if result.rows_affected() == 0 {
        return Err("Product not found.".to_string());
    }

    tx.commit()
        .await
        .map_err(|error| {
            format!("Could not finish product update: {}", error)
        })?;

    Ok(())
}

// DELETE PRODUCT

pub async fn delete_product(
    pool: &MySqlPool,
    id: u64,
) -> Result<(), String> {
    let result = sqlx::query(
        "DELETE FROM products WHERE id = ?"
    )
    .bind(id)
    .execute(pool)
    .await
    .map_err(|error| {
        format!("Could not delete product: {}", error)
    })?;

    if result.rows_affected() == 0 {
        return Err("Product not found.".to_string());
    }

    Ok(())
}
