
use argon2::{
    Argon2,
    PasswordHash,
    PasswordHasher,
    PasswordVerifier,
};
use serde::Serialize;
use sqlx::MySqlPool;

#[derive(Debug, Serialize)]
pub struct AuthenticatedUser {
    pub id: u64,
    pub full_name: String,
    pub username: String,
    pub role: String,
}

pub async fn has_admin_account(
    pool: &MySqlPool,
) -> Result<bool, String> {
    let count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM users WHERE role = 'administrator'"
    )
    .fetch_one(pool)
    .await
    .map_err(|e| format!("Could not check administrator account: {}", e))?;

    Ok(count > 0)
}

pub async fn create_initial_admin(
    pool: &MySqlPool,
    full_name: String,
    username: String,
    password: String,
) -> Result<(), String> {
    let full_name = full_name.trim().to_string();
    let username = username.trim().to_lowercase();

    if full_name.is_empty() {
        return Err("Full name is required.".to_string());
    }

    if username.is_empty() {
        return Err("Username is required.".to_string());
    }

    if password.len() < 8 {
        return Err("Password must contain at least 8 characters.".to_string());
    }

    // Acquire one connection so GET_LOCK and RELEASE_LOCK
    // execute on the same MySQL session.
    let mut conn = pool
        .acquire()
        .await
        .map_err(|e| format!("Could not connect to database: {}", e))?;

    let lock_result: Option<i64> = sqlx::query_scalar(
        "SELECT GET_LOCK('vendora_initial_admin', 10)"
    )
    .fetch_one(&mut *conn)
    .await
    .map_err(|e| format!("Could not secure administrator setup: {}", e))?;

    if lock_result != Some(1) {
        return Err(
            "Administrator setup is currently locked. Please try again.".to_string()
        );
    }

    let result = create_admin_locked(
        &mut conn,
        full_name,
        username,
        password,
    )
    .await;

    let release_result = sqlx::query(
        "SELECT RELEASE_LOCK('vendora_initial_admin')"
    )
    .execute(&mut *conn)
    .await;

    if let Err(error) = release_result {
        eprintln!("Could not release administrator setup lock: {}", error);
    }

    result
}

async fn create_admin_locked(
    conn: &mut sqlx::pool::PoolConnection<sqlx::MySql>,
    full_name: String,
    username: String,
    password: String,
) -> Result<(), String> {
    let count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM users WHERE role = 'administrator'"
    )
    .fetch_one(&mut **conn)
    .await
    .map_err(|e| format!("Could not check administrator account: {}", e))?;

    if count > 0 {
        return Err("An administrator account already exists.".to_string());
    }

    let password_hash = Argon2::default()
        .hash_password(password.as_bytes())
        .map_err(|e| format!("Could not hash password: {}", e))?
        .to_string();

    sqlx::query(
        r#"
        INSERT INTO users (
            full_name,
            username,
            password_hash,
            role,
            status
        )
        VALUES (?, ?, ?, 'administrator', 'active')
        "#
    )
    .bind(full_name)
    .bind(username)
    .bind(password_hash)
    .execute(&mut **conn)
    .await
    .map_err(|e| format!("Could not create administrator: {}", e))?;

    Ok(())
}

pub async fn login(
    pool: &MySqlPool,
    username: String,
    password: String,
) -> Result<AuthenticatedUser, String> {
    let username = username.trim().to_lowercase();

    let user = sqlx::query_as::<_, UserRecord>(
        r#"
        SELECT
            id,
            full_name,
            username,
            password_hash,
            role,
            status
        FROM users
        WHERE username = ?
        LIMIT 1
        "#
    )
    .bind(username)
    .fetch_optional(pool)
    .await
    .map_err(|e| format!("Login query failed: {}", e))?
    .ok_or_else(|| "Invalid username or password.".to_string())?;

    if user.status != "active" {
        return Err(
            "This account is inactive. Please contact your administrator.".to_string()
        );
    }

    let parsed_hash = PasswordHash::new(&user.password_hash)
        .map_err(|_| "Invalid username or password.".to_string())?;

    Argon2::default()
        .verify_password(password.as_bytes(), &parsed_hash)
        .map_err(|_| "Invalid username or password.".to_string())?;

    sqlx::query(
        "UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?"
    )
    .bind(user.id)
    .execute(pool)
    .await
    .map_err(|e| format!("Could not update login timestamp: {}", e))?;

    Ok(AuthenticatedUser {
        id: user.id,
        full_name: user.full_name,
        username: user.username,
        role: user.role,
    })
}

#[derive(sqlx::FromRow)]
struct UserRecord {
    id: u64,
    full_name: String,
    username: String,
    password_hash: String,
    role: String,
    status: String,
}
