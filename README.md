# Global-Notes-Workspace
Because they lack a central location to store, arrange, and conveniently retrieve notes, people frequently misplace or forget crucial information. By developing a persistent, searchable workspace that enables users to tag, edit, and store notes indefinitely, this project addresses that issue. 

## ✨ Features

- **User Authentication**
  - Login / Sign-up flow
  - Basic authorization checks before accessing the workspace

- **Persistent Notes**
  - Notes stored in browser LocalStorage in JSON format
  - Automatic loading of saved notes on page refresh

- **Search & Filter**
  - Search notes by text
  - Filter and sort using tags and other criteria

- **Folders & Organization**
  - Group notes into folders using the folder manager

- **Formatting & Media**
  - Basic text formatting toolbar (bold, italic, etc.)
  - Support for attaching or handling media (via `mediaManager.js`)

- **Import / Export**
  - Export notes as JSON
  - Import notes from JSON files

- **Theming**
  - Theme manager (e.g., light / dark mode support)

---

## 🛠 Tech Stack

- **Frontend:** HTML, CSS, JavaScript
- **Storage:** `localStorage` (JSON-based persistence)

---

## 📁 Project Structure

├── CSS
│   ├── index.css         
│   ├── signup.css       
│   └── styles.css        
├── HTML
│   └── signup.html       
├── JS
│   ├── authButtons.js        
│   ├── authPage.js           
│   ├── constants.js         
│   ├── eventHandlers.js      
│   ├── exportImport.js       
│   ├── filterSearchSort.js  
│   ├── folderManager.js      
│   ├── formattingToolbar.js  
│   ├── loginPage.js          
│   ├── mediaManager.js      
│   ├── noteManager.js        
│   ├── noteOperations.js     
│   ├── notesApp.js       
│   ├── renderer.js         
│   ├── storage.js            
│   ├── themeManager.js       
│   └── utilities.js          
├── index.html            
└── LICENSE                # Project license

----

Component-wise Feature Explanation

Login / Signup Page
Allows users to sign in to access their notes workspace. Handles basic validation and authorization before entering the app.

Notes Workspace
Main dashboard where users can create, view, edit, delete, and manage notes.

Note Editor
Provides typing area and formatting toolbar for writing rich notes with styling options.

Search & Filter System
Allows users to quickly search notes by text, tags, or sorting options.

Folders Manager
Enables grouping notes into folders for organized categorization.

Tags Feature
Users can assign tags to notes for better filtering and quick organization.

Import / Export Notes
Export notes as a JSON file and import them back when needed, enabling backups.

Media Manager
Allows users to attach files or images inside notes if required.

Theme Manager
Switches between different UI themes (e.g., light/dark mode).

LocalStorage-based Persistence
Ensures notes are saved permanently even after page refresh or closing browser.

Renderer Component
Updates UI dynamically whenever a note or folder changes.

Storage Component
Converts notes to JSON and stores/retrieves from LocalStorage.

Event Handlers System
Connects UI events like button clicks, key inputs, note selection, etc., to functional logic.

Utilities
Provides reusable helper functions used throughout the app.

----

How Each Section of the UI Works

Side Navigation Panel
Shows folders and quick operations for accessing stored notes.

Notes List Panel
Displays titles of all saved notes for quick selection.

Editor Panel
Opens the selected note for reading or editing.

Toolbar
Provides formatting options (Bold, Italic, Underline, etc.).

Search Bar
Filters notes in real-time as the user types.

Add Note / Delete / Save Buttons
Manages CRUD operations on notes with single-click convenience.
