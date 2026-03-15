# iOS App Setup Guide

Complete guide to set up and run the Global Notes iOS app locally.

---

## Prerequisites

Before starting, make sure you have these installed on your Mac:

| Tool | Version | How to Install |
|------|---------|---------------|
| **macOS** | 13.0+ (Ventura or later) | - |
| **Xcode** | 15.0+ | Mac App Store |
| **Node.js** | 18+ | `brew install node` |
| **npm** | 9+ | Comes with Node.js |
| **CocoaPods** | 1.14+ | `sudo gem install cocoapods` |
| **Xcode Command Line Tools** | Latest | `xcode-select --install` |

### Verify Installation

```bash
node --version      # Should be 18+
npm --version       # Should be 9+
pod --version       # Should be 1.14+
xcode-select -p     # Should show Xcode path
```

---

## Step-by-Step Setup

### 1. Clone the Repository

```bash
git clone https://github.com/Coder-s-OG-s/Global_Notes-workspace.git
cd Global_Notes-workspace
```

### 2. Install Node Dependencies

```bash
npm install
```

This installs Capacitor CLI, Capacitor Core, and the iOS platform package.

### 3. Create Environment Config

Create a `.env` file in the project root:

```bash
touch .env
```

Add the following (get actual values from the team):

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
GEMINI_API_KEY=
```

### 4. Build the Web App

```bash
npm run build
```

This runs `build.js` which:
- Copies all web assets (HTML, CSS, JS) into the `public/` directory
- Generates `JS/config.js` with your Supabase credentials from `.env`

### 5. Sync with Capacitor

```bash
npx cap sync ios
```

This does two things:
- Copies the built web assets into the iOS project (`ios/App/App/public/`)
- Installs CocoaPods dependencies

> If `cap sync` fails with a CocoaPods error, run manually:
> ```bash
> cd ios/App && pod install && cd ../..
> ```

### 6. Open in Xcode

```bash
npx cap open ios
```

This opens the project in Xcode. You can also open it manually:

```
ios/App/App.xcworkspace
```

> **Important:** Always open the `.xcworkspace` file, NOT the `.xcodeproj`.

### 7. Configure Signing in Xcode

1. Select the **App** target in Xcode
2. Go to **Signing & Capabilities**
3. Select your **Team** (Apple Developer account)
4. Change **Bundle Identifier** if needed (e.g., `com.yourname.globalnotes`)
5. Xcode will auto-create provisioning profiles

### 8. Run on Simulator or Device

- **Simulator:** Select a simulator (e.g., iPhone 15) from the top bar, press `Cmd+R`
- **Physical Device:** Connect via USB, trust the device, select it, press `Cmd+R`

> For physical devices, you need at minimum a free Apple Developer account.

---

## Development Workflow

### Making Changes

When you edit web files (HTML, CSS, JS):

```bash
npm run build          # Rebuild web assets
npx cap sync ios       # Copy to iOS project
```

Then press `Cmd+R` in Xcode to rebuild.

### Live Reload (Optional)

For faster development, add this to `capacitor.config.json`:

```json
{
  "appId": "com.globalnotes.app",
  "appName": "Global Notes",
  "webDir": "public",
  "server": {
    "url": "http://YOUR_LOCAL_IP:8080",
    "cleartext": true
  }
}
```

Find your local IP with `ipconfig getifaddr en0`.

> **Remove the `server` block before building for production.**

### Quick Command Reference

| Action | Command |
|--------|---------|
| Install dependencies | `npm install` |
| Build web app | `npm run build` |
| Sync to iOS | `npx cap sync ios` |
| Open Xcode | `npx cap open ios` |
| Full rebuild | `npm run build && npx cap sync ios` |

---

## OAuth Setup for iOS

The app uses Supabase OAuth (Google & GitHub). For OAuth to work on iOS:

### 1. Add URL Scheme

In Xcode, go to **App Target > Info > URL Types** and add:
- **Identifier:** `com.globalnotes.app`
- **URL Schemes:** `com.globalnotes.app`

### 2. Update Supabase Redirect

In your Supabase Dashboard (Authentication > URL Configuration), add this redirect URL:
```
com.globalnotes.app://login-callback
```

### 3. Update Auth Service (if needed)

The `signInWithProvider` function in `JS/authService.js` uses `window.location.origin` as the redirect URL. On iOS/Capacitor, this may need to be:

```javascript
const redirectUrl = Capacitor.isNativePlatform()
  ? 'com.globalnotes.app://login-callback'
  : window.location.origin;
```

---

## Project Structure

```
Global_Notes-workspace/
├── capacitor.config.json    # Capacitor configuration
├── package.json             # Node dependencies (Capacitor packages)
├── build.js                 # Build script (web -> public/)
├── .env                     # Environment variables (not committed)
├── JS/config.js             # Generated config (not committed)
├── ios/                     # iOS project
│   └── App/
│       ├── App.xcworkspace   # Open THIS in Xcode
│       ├── App.xcodeproj/    # Xcode project config
│       ├── App/
│       │   ├── AppDelegate.swift    # App lifecycle + deep links
│       │   ├── Info.plist           # iOS app configuration
│       │   ├── Assets.xcassets/     # App icons & splash screens
│       │   └── public/             # Web assets (auto-generated)
│       └── Podfile                 # CocoaPods dependencies
├── CSS/                     # Stylesheets
├── JS/                      # JavaScript modules
├── HTML/                    # Additional HTML pages
└── assets/                  # Images, icons
```

---

## Troubleshooting

### "No such module 'Capacitor'"
```bash
cd ios/App && pod install && cd ../..
```

### "Could not find `Capacitor` pod"
Make sure `node_modules` is installed:
```bash
npm install
cd ios/App && pod install && cd ../..
```

### Blank screen on iOS
The web assets aren't copied. Run:
```bash
npm run build && npx cap sync ios
```

### OAuth not working on iOS
1. Check URL schemes are configured in Xcode
2. Verify redirect URL in Supabase dashboard
3. Check `AppDelegate.swift` handles the callback URL

### Build fails with signing error
1. Open Xcode > App target > Signing & Capabilities
2. Select your development team
3. If bundle ID conflicts, change it to something unique

### CocoaPods version mismatch
```bash
sudo gem install cocoapods
cd ios/App && pod repo update && pod install && cd ../..
```

---

## Building for Production

1. In Xcode, select **Product > Archive**
2. Once archived, click **Distribute App**
3. Choose **App Store Connect** or **Ad Hoc** distribution
4. Follow the signing and upload prompts

> You need a paid Apple Developer account ($99/year) for App Store distribution.
