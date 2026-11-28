
mod auth;
mod database;
mod products;
mod sales;
mod items;

use rust_decimal::Decimal;
use sqlx::MySqlPool;
use tauri::Manager;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! Welcome to Vendora!", name)
}

#[tauri::command]
async fn test_db_connection(
    pool: tauri::State<'_, MySqlPool>,
) -> Result<String, String> {
    let result = sqlx::query_scalar::<_, i32>("SELECT 1")
        .fetch_one(pool.inner())
        .await;

    match result {
        Ok(_) => Ok("Successfully connected to Vendora MySQL database!".to_string()),
        Err(error) => Err(format!("Database query failed: {}", error)),
    }
}

// AUTHENTICATION

#[tauri::command]
async fn has_admin_account(
    pool: tauri::State<'_, MySqlPool>,
) -> Result<bool, String> {
    auth::has_admin_account(pool.inner()).await
}

#[tauri::command]
async fn create_initial_admin(
    full_name: String,
    username: String,
    password: String,
    pool: tauri::State<'_, MySqlPool>,
) -> Result<String, String> {
    auth::create_initial_admin(
        pool.inner(),
        full_name,
        username,
        password,
    )
    .await?;

    Ok("Administrator account created successfully!".to_string())
}

#[tauri::command]
async fn login_user(
    username: String,
    password: String,
    pool: tauri::State<'_, MySqlPool>,
) -> Result<auth::AuthenticatedUser, String> {
    auth::login(pool.inner(), username, password).await
}

// ITEM CATALOG

#[tauri::command]
async fn get_items(
    pool: tauri::State<'_, MySqlPool>,
) -> Result<Vec<items::Item>, String> {
    items::get_items(pool.inner()).await
}

#[tauri::command]
async fn get_available_items(
    pool: tauri::State<'_, MySqlPool>,
) -> Result<Vec<items::Item>, String> {
    items::get_available_items(pool.inner()).await
}

#[tauri::command]
async fn add_item(
    item: items::ItemInput,
    created_by: Option<u64>,
    pool: tauri::State<'_, MySqlPool>,
) -> Result<u64, String> {
    items::add_item(pool.inner(), item, created_by).await
}

#[tauri::command]
async fn update_item(
    id: u64,
    item: items::ItemInput,
    pool: tauri::State<'_, MySqlPool>,
) -> Result<(), String> {
    items::update_item(pool.inner(), id, item).await
}

#[tauri::command]
async fn get_item_summary(
    pool: tauri::State<'_, MySqlPool>,
) -> Result<items::ItemSummary, String> {
    items::get_item_summary(pool.inner()).await
}

// PRODUCTS

#[tauri::command]
async fn get_products(
    pool: tauri::State<'_, MySqlPool>,
) -> Result<Vec<products::Product>, String> {
    products::get_products(pool.inner()).await
}

#[tauri::command]
async fn add_product(
    item_id: u64,
    cost_price: Decimal,
    selling_price: Decimal,
    minimum_stock: Decimal,
    created_by: Option<u64>,
    pool: tauri::State<'_, MySqlPool>,
) -> Result<u64, String> {
    products::add_product(
        pool.inner(),
        item_id,
        cost_price,
        selling_price,
        minimum_stock,
        created_by,
    )
    .await
}

#[tauri::command]
async fn update_product(
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
    pool: tauri::State<'_, MySqlPool>,
) -> Result<(), String> {
    products::update_product(
        pool.inner(),
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
        status,
    )
    .await
}

#[tauri::command]
async fn delete_product(
    id: u64,
    pool: tauri::State<'_, MySqlPool>,
) -> Result<(), String> {
    products::delete_product(pool.inner(), id).await
}

// SALES / POS

#[tauri::command]
async fn get_pos_products(
    pool: tauri::State<'_, MySqlPool>,
) -> Result<Vec<products::Product>, String> {
    sales::get_pos_products(pool.inner()).await
}

#[tauri::command]
async fn get_today_sales(
    pool: tauri::State<'_, MySqlPool>,
) -> Result<Vec<sales::SaleHistory>, String> {
    sales::get_today_sales(pool.inner()).await
}

#[tauri::command]
async fn complete_sale(
    cashier_id: u64,
    items: Vec<sales::SaleItemInput>,
    discount: Decimal,
    amount_paid: Decimal,
    payment_method: String,
    pool: tauri::State<'_, MySqlPool>,
) -> Result<sales::SaleResult, String> {
    sales::complete_sale(
        pool.inner(),
        cashier_id,
        items,
        discount,
        amount_paid,
        payment_method,
    )
    .await
}

// APPLICATION

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            dotenvy::dotenv().ok();

            let database_url = std::env::var("DATABASE_URL")
                .map_err(|error| {
                    std::io::Error::new(
                        std::io::ErrorKind::NotFound,
                        format!("DATABASE_URL is missing: {}", error),
                    )
                })?;

            let pool = tauri::async_runtime::block_on(
                database::create_pool(&database_url)
            )
            .map_err(|error| {
                std::io::Error::other(
                    format!("Failed to connect to MySQL: {}", error)
                )
            })?;

            println!("Vendora database connected successfully!");

            app.manage(pool);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            test_db_connection,

            has_admin_account,
            create_initial_admin,
            login_user,

            get_items,
            get_available_items,
            add_item,
            update_item,
            get_item_summary,

            get_products,
            add_product,
            update_product,
            delete_product,

            get_pos_products,
            complete_sale,
            get_today_sales,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Vendora");
}
