# 🌐 Global Notes Workspace

A high-performance, persistent, and searchable workspace for organizing thoughts, projects, and daily notes. Designed for productivity with a clean interface, offline-first capabilities, and seamless organization.

## ✨ Features

- **User Authentication**: Secure Login/Sign-up flow with Supabase (Cloud) or Guest mode (Local).
- **Offline-First Persistence**: Notes are stored in browser LocalStorage and synced to the cloud when online.
- **Advanced Search & Filter**: Real-time search across all notes with tag-based filtering.
- **Organization**: Group notes into folders and labels for a streamlined workflow.
- **Rich Editor**: Formatting toolbar (bold, italic, etc.), media attachments, and sketch support.
- **Import / Export**: Portability with JSON-based import and export.
- **Theming**: Premium AMOLED Dark, Nature Green, and minimal themes.

---

## 🚀 Getting Started

Follow these steps to set up the project on your local machine.

### 1. Prerequisites
- **Node.js** (v14 or higher recommended)
- **npm** (comes with Node.js)

### 2. Installation
Clone the repository and install the necessary dependencies:
```bash
git clone https://github.com/Ayush-Patel-56/Global-Notes-Workspace.git
cd Global-Notes-Workspace
npm install
```

### 3. Configuration
The project requires a `JS/config.js` file to handle environment variables. You can generate a default (Local Mode) configuration by running:
```bash
node generate-config.js
```
*Note: This will create a config file that allows the app to run in **Offline Mode**. To enable cloud sync and OAuth, you must provide Supabase credentials in a `.env` file before running the script.*

### 4. Running the Project
Start the local development server:
```bash
npm start
```
The application will be available at [http://localhost:3000](http://localhost:3000).

---

## 🛠 Tech Stack

- **Core**: HTML5, Vanilla CSS3, JavaScript (ES6+ Modules)
- **Frameworks**: Capacitor (Mobile support), Supabase (Auth & Database)
- **Utilities**: LZ-String (Compression), QR CODE (Sharing)

---

## 📁 Project Structure

```text
├── CSS/                # Layout and theme styles
├── HTML/               # Secondary pages (Auth, etc.)
├── JS/                 # Modular application logic
│   ├── notesApp.js     # Entry point
│   ├── renderer.js     # UI Rendering logic
│   └── ...             # Feature-specific modules
├── assets/             # Images and branding
├── index.html          # Main application housing
├── server.js           # Lightweight local server
└── sw.js               # Service worker for PWA support
```

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📜 License

Distributed under the ISC License. See `LICENSE` for more information.
