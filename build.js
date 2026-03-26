const fs = require('fs');
const path = require('path');

// Helper to copy recursively
function copyRecursiveSync(src, dest) {
    const exists = fs.existsSync(src);
    const stats = exists && fs.statSync(src);
    const isDirectory = exists && stats.isDirectory();
    if (isDirectory) {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest);
        }
        fs.readdirSync(src).forEach(childItemName => {
            copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
        });
    } else {
        fs.copyFileSync(src, dest);
    }
}

const distDir = path.join(__dirname, 'public');

console.log(`Building to ${distDir}...`);

// 1. Clean/Create dist
if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir);

// 2. Parsers for .env (if local)
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            process.env[key.trim()] = value.trim();
        }
    });
}

// 3. Copy Static Assets
const itemsToCopy = ['index.html', 'app.html', 'sw.js', 'manifest.json', 'sitemap.xml', 'robots.txt', 'CSS', 'JS', 'HTML', 'assets', 'vercel.json', 'assets/images/app-mockup.png'];
itemsToCopy.forEach(item => {
    const src = path.join(__dirname, item);
    const dest = path.join(distDir, item);
    if (fs.existsSync(src)) {
        copyRecursiveSync(src, dest);
    } else {
        console.warn(`Warning: source file/dir not found: ${src}`);
    }
});

// 4. Generate Config in DIST
// 4. Generate Config in DIST
const configContent = `const config = {
    APPWRITE_ENDPOINT: '${process.env.APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1"}',
    APPWRITE_PROJECT_ID: '${process.env.APPWRITE_PROJECT_ID || "69c4c59f000adafed590"}',
    APPWRITE_DATABASE_ID: '${process.env.APPWRITE_DATABASE_ID || "public"}',
    SUPABASE_URL: '${process.env.SUPABASE_URL || ""}',
    SUPABASE_ANON_KEY: '${process.env.SUPABASE_ANON_KEY || ""}',
    GEMINI_API_KEY: '${process.env.GEMINI_API_KEY || ""}'
};

export default config;
`;

// Ensure JS dir exists in dist (it should from copy, but safety check)
const distJsDir = path.join(distDir, 'JS');
if (!fs.existsSync(distJsDir)) {
    fs.mkdirSync(distJsDir);
}

const configPath = path.join(distJsDir, 'config.js');
try {
    fs.writeFileSync(configPath, configContent);
    console.log('Successfully generated dist/JS/config.js');
    console.log('Build Complete.');
} catch (error) {
    console.error('Error generating configuration:', error);
    process.exit(1);
}
