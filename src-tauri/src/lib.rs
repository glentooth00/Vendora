mod database;

use sqlx::MySqlPool;
use tauri::Manager;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! Welcome to Vendora!", name)
}

#[tauri::command]
async fn test_db_connection(pool: tauri::State<'_, MySqlPool>) -> Result<String, String> {
    let result = sqlx::query_scalar::<_, i32>("SELECT 1")
        .fetch_one(pool.inner())
        .await;

    match result {
        Ok(_) => Ok("Successfully connected to Vendora MySQL database!".to_string()),
        Err(error) => Err(format!("Database query failed: {}", error)),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            dotenvy::dotenv().ok();

            let database_url = std::env::var("DATABASE_URL").map_err(|error| {
                std::io::Error::new(
                    std::io::ErrorKind::NotFound,
                    format!("DATABASE_URL is missing: {}", error),
                )
            })?;

            let pool = tauri::async_runtime::block_on(database::create_pool(&database_url))
                .map_err(|error| {
                    std::io::Error::other(format!("Failed to connect to MySQL: {}", error))
                })?;

            println!("Vendora database connected successfully!");

            app.manage(pool);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![greet, test_db_connection])
        .run(tauri::generate_context!())
        .expect("error while running Vendora");
}
