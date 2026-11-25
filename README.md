# Vendora

**Vendora** is a modern desktop business management and inventory platform built with Rust, Tauri, React, and TypeScript.

Designed for general retail businesses, Vendora aims to simplify daily business operations through an integrated platform for sales, inventory, purchasing, and reporting.

## Overview

Vendora is being developed as a Windows desktop application with local MySQL database support. It is designed to operate independently without requiring an internet connection for normal local operations.

## Technology Stack

| Technology | Purpose |
|---|---|
| Rust | Backend and business logic |
| Tauri 2 | Desktop application framework |
| React | User interface |
| TypeScript | Frontend development |
| MySQL 8 | Database |
| SQLx | Rust database integration |
| Tokio | Asynchronous runtime |

## Planned Features

- [ ] Dashboard and business analytics
- [ ] User authentication and authorization
- [ ] Product and category management
- [ ] Barcode management
- [ ] Inventory and stock monitoring
- [ ] Point of Sale (POS)
- [ ] Sales and transaction history
- [ ] Purchasing and supplier management
- [ ] Purchase orders and stock receiving
- [ ] Sales and inventory reports
- [ ] Light and dark interface themes
- [ ] Windows desktop installer
- [ ] Software licensing and activation

## Project Structure

```text
vendora/
├── src/                 # React frontend
├── src-tauri/           # Rust and Tauri backend
│   ├── src/
│   ├── migrations/
│   └── Cargo.toml
├── public/
├── package.json
├── README.md
└── .gitignore
```

## Development Requirements

- Windows 10/11
- Rust stable (MSVC toolchain)
- Node.js LTS
- npm
- Visual Studio C++ Build Tools
- MySQL 8
- WebView2 Runtime

## Installation

Clone the repository:

```bash
git clone <repository-url>
cd vendora
```

Install frontend dependencies:

```bash
npm install
```

Run the development application:

```bash
npm run tauri dev
```

## Database Configuration

Vendora uses MySQL for local data storage.

Initial database configuration:

| Setting | Value |
|---|---|
| Host | 127.0.0.1 |
| Port | 3306 |
| Database | vendora |
| Username | vendora_app |

Configure the database connection through environment variables. Never commit actual database credentials to version control.

## Building for Windows

Generate the Windows desktop application and installer:

```bash
npm run tauri build
```

Build artifacts are generated inside:

```text
src-tauri/target/release/bundle/
```

## Development Status

**Current Stage:** Initial Development

Vendora is currently under active development. Features, architecture, and implementation details are subject to change.

## License

Proprietary Software.

Copyright © 2026 Vendora. All rights reserved.

Unauthorized redistribution, modification, or commercial resale is prohibited without permission from the copyright owner.