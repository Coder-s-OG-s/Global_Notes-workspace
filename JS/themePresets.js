
export const THEME_PRESETS = {
    "classic-blue": {
        name: "Classic Blue",
        icon: "",
        light: {
            background: "linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)",
            border: "#3b82f6",
            text: "#1e3a8a",
            accent: "#2563eb"
        },
        dark: {
            background: "linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)",
            border: "#60a5fa",
            text: "#e0f2fe",
            accent: "#3b82f6"
        }
    },

    "elegant-purple": {
        name: "Elegant Purple",
        icon: "",
        light: {
            background: "linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)",
            border: "#9333ea",
            text: "#581c87",
            accent: "#a855f7"
        },
        dark: {
            background: "linear-gradient(135deg, #581c87 0%, #6b21a8 100%)",
            border: "#c084fc",
            text: "#f3e8ff",
            accent: "#9333ea"
        }
    },

    "forest-green": {
        name: "Forest Green",
        icon: "",
        light: {
            background: "linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)",
            border: "#16a34a",
            text: "#14532d",
            accent: "#22c55e"
        },
        dark: {
            background: "linear-gradient(135deg, #14532d 0%, #166534 100%)",
            border: "#86efac",
            text: "#dcfce7",
            accent: "#16a34a"
        }
    },

    "sunset-orange": {
        name: "Sunset Orange",
        icon: "",
        light: {
            background: "linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%)",
            border: "#ea580c",
            text: "#7c2d12",
            accent: "#f97316"
        },
        dark: {
            background: "linear-gradient(135deg, #7c2d12 0%, #9a3412 100%)",
            border: "#fdba74",
            text: "#ffedd5",
            accent: "#ea580c"
        }
    },

    "ocean-teal": {
        name: "Ocean Teal",
        icon: "",
        light: {
            background: "linear-gradient(135deg, #ccfbf1 0%, #99f6e4 100%)",
            border: "#0d9488",
            text: "#134e4a",
            accent: "#14b8a6"
        },
        dark: {
            background: "linear-gradient(135deg, #134e4a 0%, #115e59 100%)",
            border: "#5eead4",
            text: "#ccfbf1",
            accent: "#0d9488"
        }
    },

    "rose-gold": {
        name: "Rose Gold",
        icon: "",
        light: {
            background: "linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)",
            border: "#db2777",
            text: "#831843",
            accent: "#ec4899"
        },
        dark: {
            background: "linear-gradient(135deg, #831843 0%, #9f1239 100%)",
            border: "#f9a8d4",
            text: "#fce7f3",
            accent: "#db2777"
        }
    },

    "slate-gray": {
        name: "Slate Gray",
        icon: "",
        light: {
            background: "linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)",
            border: "#475569",
            text: "#1e293b",
            accent: "#64748b"
        },
        dark: {
            background: "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
            border: "#cbd5e1",
            text: "#f1f5f9",
            accent: "#475569"
        }
    },

    "crimson-red": {
        name: "Crimson Red",
        icon: "",
        light: {
            background: "linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)",
            border: "#dc2626",
            text: "#7f1d1d",
            accent: "#ef4444"
        },
        dark: {
            background: "linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)",
            border: "#fca5a5",
            text: "#fee2e2",
            accent: "#dc2626"
        }
    }
};

// Get theme object by ID
export function getTheme(themeId) {
    return THEME_PRESETS[themeId] || THEME_PRESETS["classic-blue"];
}

// Get all theme IDs
export function getAllThemeIds() {
    return Object.keys(THEME_PRESETS);
}

// Get theme name for display
export function getThemeName(themeId) {
    const theme = getTheme(themeId);
    return theme.name;
}

// Get theme icon
export function getThemeIcon(themeId) {
    const theme = getTheme(themeId);
    return theme.icon;
}
