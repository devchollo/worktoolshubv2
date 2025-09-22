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
      {
        name: "OSAD Note Generator",
        path: "/tools/osad-note-generator",
        internal: true,
        pending: true,
      },
      {
        name: "Offline Mods Notes & Email Generator",
        path: "/tools/offline-mods-note-email-generator",
        internal: true,
      },
      { name: "Alt Text Generator", path: "/tools/alt-text", pending: true },
      {
        name: "Meta Description Tool",
        path: "/tools/meta-description",
        pending: true,
      },
      {
        name: "Blog Post Outlines",
        path: "/tools/blog-outline",
        pending: true,
      },
    ],
  },
  "email-tools": {
    name: "Email Tools",
    icon: "✉️",
    description: "Professional email templates and generators",
    color: "#3b82f6",
    tools: [
      {
        name: "Escalation Email Generator",
        path: "/tools/escalation-email-generator",
        internal: true,
      },
      {
        name: "Business Listing Update",
        path: "/tools/business-listing-update",
        internal: true,
      },
      {
        name: "OBCX Email Creator",
        path: "/tools/obcx-email-generator",
        internal: true,
      },
      {
        name: "Offline Mods Notes & Email Generator",
        path: "/tools/offline-mods-note-email-generator",
        internal: true,
      },
      {
        name: "Launch Announcement",
        path: "/tools/launch-announcement",
        internal: true,
        pending: true,
      },
      { name: "Follow-up Templates", path: "/tools/follow-up", pending: true },
    ],
  },
  "code-tools": {
    name: "Code & Development",
    icon: "💻",
    description: "Embed codes and development utilities",
    color: "#8b5cf6",
    tools: [
      { name: "MP3 Embed Generator", path: "/tool/mp3-embed", pending: true },
      { name: "QR Code Creator", path: "/tool/qr-code", pending: true },
      { name: "HTML Snippet Tools", path: "/tool/html-snippet", pending: true },
      { name: "CSS Generator", path: "/tool/css-generator", pending: true },
    ],
  },
  "file-tools": {
    name: "File & Media Tools",
    icon: "🗄️",
    description: "Compress, convert, and optimize files",
    color: "#f59e0b",
    tools: [
      {
        name: "Image Compressor",
        path: "/tool/image-compressor",
        pending: true,
      },
      { name: "PDF Tools", path: "/tool/pdf-tools", pending: true },
      { name: "File Converter", path: "/tool/file-converter", pending: true },
      { name: "Batch Processor", path: "/tool/batch-processor", pending: true },
    ],
  },
  "business-tools": {
    name: "Business Tools",
    icon: "📊",
    description: "Local business and marketing utilities",
    color: "#ef4444",
    tools: [
      {
        name: "Business Listing Update",
        path: "/tools/business-listing-update",
        internal: true,
      },
      {
        name: "Schema Generator",
        path: "/tool/schema-generator",
        pending: true,
      },
      { name: "Invoice Creator", path: "/tool/invoice-creator", pending: true },
      {
        name: "Report Templates",
        path: "/tool/report-templates",
        pending: true,
      },
    ],
  },
  "design-tools": {
    name: "Design & Graphics",
    icon: "🎨",
    description: "Visual content and design utilities",
    color: "#ec4899",
    tools: [
      {
        name: "Logo Placeholder",
        path: "/tool/logo-placeholder",
        pending: true,
      },
      { name: "Color Palette", path: "/tool/color-palette", pending: true },
      { name: "Icon Generator", path: "/tool/icon-generator", pending: true },
      {
        name: "Social Media Templates",
        path: "/tool/social-templates",
        pending: true,
      },
    ],
  },
};
