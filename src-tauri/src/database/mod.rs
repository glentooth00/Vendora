use sqlx::mysql::{MySqlPool, MySqlPoolOptions};

pub async fn create_pool(database_url: &str) -> Result<MySqlPool, sqlx::Error> {
    MySqlPoolOptions::new()
        .max_connections(10)
        .min_connections(1)
        .connect(database_url)
        .await
}
