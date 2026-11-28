
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, MySqlPool};

#[derive(Debug, Serialize, FromRow)]
pub struct Item {
    pub id: u64,
    pub item_name: String,
    pub sku: Option<String>,
    pub barcode: Option<String>,
    pub description: Option<String>,
    pub category: Option<String>,
    pub unit: String,
    pub status: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ItemInput {
    pub item_name: String,
    pub sku: Option<String>,
    pub barcode: Option<String>,
    pub description: Option<String>,
    pub category: Option<String>,
    pub unit: String,
    pub status: String,
}

#[derive(Debug, Serialize, FromRow)]
pub struct ItemSummary {
    pub total_items: i64,
    pub active_items: i64,
    pub inactive_items: i64,
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

fn validate_item(item: &ItemInput) -> Result<(), String> {
    if item.item_name.trim().is_empty() {
        return Err("Item name is required.".to_string());
    }

    if item.item_name.trim().len() > 150 {
        return Err("Item name cannot exceed 150 characters.".to_string());
    }

    let unit = item.unit.trim();

    if unit.is_empty() || unit.len() > 30 {
        return Err("Please enter a valid unit of measurement.".to_string());
    }

    if item.status != "active" && item.status != "inactive" {
        return Err("Invalid item status.".to_string());
    }

    if item.sku.as_ref().is_some_and(|v| v.trim().len() > 100) {
        return Err("SKU cannot exceed 100 characters.".to_string());
    }

    if item.barcode.as_ref().is_some_and(|v| v.trim().len() > 100) {
        return Err("Barcode cannot exceed 100 characters.".to_string());
    }

    Ok(())
}

pub async fn get_items(pool: &MySqlPool) -> Result<Vec<Item>, String> {
    sqlx::query_as::<_, Item>(
        r#"
        SELECT
            id,
            item_name,
            sku,
            barcode,
            description,
            category,
            unit,
            status
        FROM items
        ORDER BY item_name ASC
        "#
    )
    .fetch_all(pool)
    .await
    .map_err(|error| format!("Could not load catalog items: {}", error))
}

pub async fn add_item(
    pool: &MySqlPool,
    item: ItemInput,
    created_by: Option<u64>,
) -> Result<u64, String> {
    validate_item(&item)?;

    let result = sqlx::query(
        r#"
        INSERT INTO items (
            item_name,
            sku,
            barcode,
            description,
            category,
            unit,
            status,
            created_by
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        "#
    )
    .bind(item.item_name.trim())
    .bind(clean_optional(item.sku))
    .bind(clean_optional(item.barcode))
    .bind(clean_optional(item.description))
    .bind(clean_optional(item.category))
    .bind(item.unit.trim())
    .bind(item.status)
    .bind(created_by)
    .execute(pool)
    .await
    .map_err(|error| {
        if error.to_string().contains("Duplicate entry") {
            "This SKU or barcode is already registered.".to_string()
        } else {
            format!("Could not register item: {}", error)
        }
    })?;

    Ok(result.last_insert_id())
}

pub async fn update_item(
    pool: &MySqlPool,
    id: u64,
    item: ItemInput,
) -> Result<(), String> {
    validate_item(&item)?;

    let result = sqlx::query(
        r#"
        UPDATE items
        SET
            item_name = ?,
            sku = ?,
            barcode = ?,
            description = ?,
            category = ?,
            unit = ?,
            status = ?
        WHERE id = ?
        "#
    )
    .bind(item.item_name.trim())
    .bind(clean_optional(item.sku))
    .bind(clean_optional(item.barcode))
    .bind(clean_optional(item.description))
    .bind(clean_optional(item.category))
    .bind(item.unit.trim())
    .bind(item.status)
    .bind(id)
    .execute(pool)
    .await
    .map_err(|error| {
        if error.to_string().contains("Duplicate entry") {
            "This SKU or barcode is already registered.".to_string()
        } else {
            format!("Could not update item: {}", error)
        }
    })?;

    if result.rows_affected() == 0 {
        return Err("Item not found or no changes were made.".to_string());
    }

    Ok(())
}

pub async fn get_item_summary(
    pool: &MySqlPool,
) -> Result<ItemSummary, String> {
    sqlx::query_as::<_, ItemSummary>(
        r#"
        SELECT
            COUNT(*) AS total_items,
            COUNT(CASE WHEN status = 'active' THEN 1 END) AS active_items,
            COUNT(CASE WHEN status = 'inactive' THEN 1 END) AS inactive_items
        FROM items
        "#
    )
    .fetch_one(pool)
    .await
    .map_err(|e| format!("Could not load item summary: {}", e))
}


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

