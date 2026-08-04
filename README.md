# AutoParts Pro - Vehicle Inventory Management System

A modern, feature-rich inventory management system for auto parts shops built with React, Electron, and SQLite.

![AutoParts Pro](https://img.shields.io/badge/AutoParts-Pro-blue)
![Electron](https://img.shields.io/badge/Electron-22.0.0-47848F?logo=electron)
![React](https://img.shields.io/badge/React-18.2.0-61DAFB?logo=react)
![SQLite](https://img.shields.io/badge/SQLite-3-003B57?logo=sqlite)

## ✨ Features

- **Modern UI with Dark Mode** - Clean, responsive interface with dark/light theme support
- **Parts Management** - Add and track parts with pricing, stock levels, and type (new/used)
- **Stock Control** - Dynamic stock management with price updates and low stock alerts
- **Job Cards System** - Create and manage repair jobs with automatic inventory tracking
- **Real-time Dashboard** - View statistics, charts, and recent activities
- **Low Stock Alerts** - Automatic notifications when parts run low
- **Stock History** - Track all inventory movements with detailed filtering

## 🚀 Getting Started

### Prerequisites

- Node.js 22.16.0 or a newer Node.js 22 release (Electron 37 uses Node.js 22)
- npm 10 or 11

Node.js 24 is not supported by the pinned native database dependency. If you use
a Node version manager, run `nvm use` from the project directory before installing
dependencies.

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/vehicle-inventory-system.git
cd vehicle-inventory-system
```

2. Install dependencies
```bash
npm install
```

3. Rebuild native modules for Electron
```bash
npx electron-rebuild -f -w sqlite3
```

4. Start the application
```bash
npm start
```

## 💻 Development

- `npm start` - Start the development server with hot reload
- `npm run build` - Build the React app for production
- `npm run electron-pack` - Package the Electron app for distribution

## 📦 Building Executables

### Windows (.exe)

1. First, build the React app:
```bash
npm run build
```

2. Then create the Windows executable:
```bash
npm run electron-pack
```

This will create:
- `dist/Vehicle Inventory System Setup {version}.exe` - Windows installer
- `dist/win-unpacked/` - Unpacked Windows application

### macOS (.dmg, .app)

On macOS, run:
```bash
npm run build
npm run electron-pack
```

This will create:
- `dist/Vehicle Inventory System-{version}.dmg` - macOS installer
- `dist/mac/` - macOS application

### Linux (.AppImage, .deb)

On Linux, run:
```bash
npm run build
npm run electron-pack
```

This will create:
- `dist/Vehicle Inventory System-{version}.AppImage` - Linux AppImage
- `dist/` - Other Linux formats based on your configuration

### Build for All Platforms

To build for all platforms from a single machine (requires additional setup):

1. Install required dependencies:
```bash
# For Windows builds on macOS/Linux
brew install --cask wine-stable  # macOS
# or
sudo apt-get install wine  # Linux
```

2. Build for all platforms:
```bash
npm run build
npm run electron-pack -- -mwl  # m=mac, w=windows, l=linux
```

### Important Notes

- **Code Signing**: For distribution, you'll need to sign your executables:
  - Windows: Requires a code signing certificate
  - macOS: Requires an Apple Developer certificate
  - Linux: Optional but recommended

- **Auto-updater**: The build is configured to support auto-updates. Set up a release server or use GitHub releases.

- **Native Dependencies**: SQLite3 needs to be rebuilt for each platform:
```bash
npx electron-rebuild -f -w sqlite3
```

### Troubleshooting Builds

1. **SQLite3 Issues**: If you encounter SQLite3 errors when running the built app:
```bash
npm rebuild sqlite3 --runtime=electron --target=22.0.0 --dist-url=https://atom.io/download/electron
```

2. **Missing Dependencies**: Ensure all native modules are included:
```bash
npm run electron-pack -- --dir  # Test without packaging first
```

3. **Build Fails**: Clear cache and rebuild:
```bash
rm -rf dist/ build/
npm run build
npm run electron-pack
```

## 🏗️ Tech Stack

- **Frontend**: React 18, Tailwind CSS
- **Desktop**: Electron
- **Database**: SQLite3
- **Charts**: Recharts
- **Icons**: React Icons

## 📱 Features Overview

### Dashboard
- Real-time statistics
- Revenue tracking
- Job status overview
- Low stock alerts

### Inventory Management
- Add new parts with detailed information
- Track part types (new/used)
- Manage pricing and profit margins
- Filter and search capabilities

### Job Cards
- Create repair jobs with customer details
- Select parts from inventory
- Automatic stock deduction on job completion
- Job status tracking (pending/completed/cancelled)

### Stock Management
- Add stock with dynamic pricing
- Low stock threshold alerts
- Movement history tracking
- Detailed stock reports

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 👥 Author

Built with ❤️ by Nethusha
