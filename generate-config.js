const fs = require('fs');
const path = require('path');

// Simple .env parser for local development
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

const configObj = {
    APPWRITE_ENDPOINT: process.env.APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1",
    APPWRITE_PROJECT_ID: process.env.APPWRITE_PROJECT_ID || "",
    APPWRITE_DATABASE_ID: process.env.APPWRITE_DATABASE_ID || "",
    SUPABASE_URL: process.env.SUPABASE_URL || "",
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || "",
    GROQ_API_KEY: process.env.GROQ_API_KEY || "",
    TURNSTILE_SITE_KEY: (process.env.TURNSTILE_SITE_KEY || "0x4AAAAAAEQyiKm40gWQ6_Gx").trim()
};

const configContent = `const config = ${JSON.stringify(configObj, null, 4)};\n\nexport default config;\n`;

const jsDir = path.join(__dirname, 'client', 'JS');
if (!fs.existsSync(jsDir)) {
    fs.mkdirSync(jsDir, { recursive: true });
}
const configPath = path.join(jsDir, 'config.js');

try {
    fs.writeFileSync(configPath, configContent);
    console.log('Successfully generated client/JS/config.js');

    const publicJsDir = path.join(__dirname, 'public', 'JS');
    if (fs.existsSync(publicJsDir)) {
        fs.writeFileSync(path.join(publicJsDir, 'config.js'), configContent);
        console.log('Successfully generated public/JS/config.js');
    }
} catch (error) {
    console.error('Error generating configuration:', error);
    process.exit(1);
}
