// ========================================
// TAG & COLOR UTILITIES
// ========================================
const TAG_COLORS = {
  work: "#6aa6ff",
  personal: "#ff85a1",
  ideas: "#faca6b",
  todo: "#88ffc3",
  remote: "#b084ff",
};

export function getTagColor(tag) {
  if (!tag) return "#0f1526";
  return TAG_COLORS[tag.toLowerCase()] || "#4f6b95";
}

// ========================================
// DATE UTILITIES
// ========================================
export function toLocalDateString(dateLike) {
  if (!dateLike) return "";
  const parsed = new Date(dateLike);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString("en-CA");
}

export function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

// ========================================
// HTML ESCAPING UTILITY
// ========================================
export function escapeHtml(str = "") {
  return String(str).replace(/[&<>"']/g, (ch) => {
    switch (ch) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return ch;
    }
  });
}