
// =============================
// Tool Categories Data
// =============================
export const toolCategories = {
  "note-generators": {
    name: "Note Generators",
    icon: "📝",
    description: "Create professional notes quickly and efficiently",
    color: "#10b981",
    tools: [
      { name: "OSAD Note Generator", path: "/tools/osad-note-generator", internal: true  },
      { name: "Alt Text Generator", path: "/tools/alt-text" },
      { name: "Meta Description Tool", path: "/tools/meta-description" },
      { name: "Blog Post Outlines", path: "/tools/blog-outline" },
    ],
  },
  "email-tools": {
    name: "Email Tools",
    icon: "✉️",
    description: "Professional email templates and generators",
    color: "#3b82f6",
    tools: [
      { name: "Escalation Email Generator", path: "/tool/escalation-email", internal: true },
      { name: "OBCX Email Creator", path: "/tool/obcx-email", internal: true },
      { name: "Launch Announcement", path: "/tool/launch-announcement", internal: true },
      { name: "Follow-up Templates", path: "/tool/follow-up" },
    ],
  },
  "code-tools": {
    name: "Code & Development",
    icon: "💻",
    description: "Embed codes and development utilities",
    color: "#8b5cf6",
    tools: [
      { name: "MP3 Embed Generator", path: "/tool/mp3-embed" },
      { name: "QR Code Creator", path: "/tool/qr-code" },
      { name: "HTML Snippet Tools", path: "/tool/html-snippet" },
      { name: "CSS Generator", path: "/tool/css-generator" },
    ],
  },
  "file-tools": {
    name: "File & Media Tools",
    icon: "🗄️",
    description: "Compress, convert, and optimize files",
    color: "#f59e0b",
    tools: [
      { name: "Image Compressor", path: "/tool/image-compressor" },
      { name: "PDF Tools", path: "/tool/pdf-tools" },
      { name: "File Converter", path: "/tool/file-converter" },
      { name: "Batch Processor", path: "/tool/batch-processor" },
    ],
  },
  "business-tools": {
    name: "Business Tools",
    icon: "📊",
    description: "Local business and marketing utilities",
    color: "#ef4444",
    tools: [
      { name: "Business Listing Update", path: "/tool/business-listing", internal: true },
      { name: "Schema Generator", path: "/tool/schema-generator" },
      { name: "Invoice Creator", path: "/tool/invoice-creator" },
      { name: "Report Templates", path: "/tool/report-templates" },
    ],
  },
  "design-tools": {
    name: "Design & Graphics",
    icon: "🎨",
    description: "Visual content and design utilities",
    color: "#ec4899",
    tools: [
      { name: "Logo Placeholder", path: "/tool/logo-placeholder" },
      { name: "Color Palette", path: "/tool/color-palette" },
      { name: "Icon Generator", path: "/tool/icon-generator" },
      { name: "Social Media Templates", path: "/tool/social-templates" },
    ],
  },
};
