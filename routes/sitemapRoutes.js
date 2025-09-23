// routes/sitemapRoutes.js
const express = require('express');
const router = express.Router();

// Tool categories data - converted to CommonJS format
const toolCategories = {
  "note-generators": {
    name: "Note Generators",
    icon: "📝",
    description: "Create professional notes quickly and efficiently",
    color: "#10b981",
    tools: [
      {
        name: "OSAD Note Generator",
        path: "/error.html?status=coming-soon",
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
        path: "/error.html?status=coming-soon",
        pending: true,
      },
      {
        name: "Blog Post Outlines",
        path: "/error.html?status=coming-soon",
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
        path: "/error.html?status=coming-soon",
        internal: true,
        pending: true,
      },
      { name: "Follow-up Templates", path: "/error.html?status=coming-soon", pending: true },
    ],
  },
  "code-tools": {
    name: "Code & Development",
    icon: "💻",
    description: "Embed codes and development utilities",
    color: "#8b5cf6",
    tools: [
      { name: "Embed Code Generator", path: "/tools/embed-code-generator", internal: true },
      { name: "QR Code Creator", path: "/tools/qr-code-generator", internal: true },
      { name: "HTML Snippet Tools", path: "/error.html?status=coming-soon", pending: true },
      { name: "CSS Generator", path: "/error.html?status=coming-soon", pending: true },
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
        path: "/error.html?status=coming-soon",
        pending: true,
      },
      { name: "PDF Tools", path: "/error.html?status=coming-soon", pending: true },
      { name: "File Converter", path: "/error.html?status=coming-soon", pending: true },
      { name: "Batch Processor", path: "/error.html?status=coming-soon", pending: true },
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
        path: "/error.html?status=coming-soon",
        pending: true,
      },
      { name: "Invoice Creator", path: "/error.html?status=coming-soon", pending: true },
      {
        name: "Report Templates",
        path: "/error.html?status=coming-soon",
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
        path: "/error.html?status=coming-soon",
        pending: true,
      },
      { name: "Color Palette", path: "/error.html?status=coming-soon", pending: true },
      { name: "Icon Generator", path: "/error.html?status=coming-soon", pending: true },
      {
        name: "Social Media Templates",
        path: "/error.html?status=coming-soon",
        pending: true,
      },
    ],
  },
};

// Configuration
const SITE_URL = process.env.SITE_URL || 'https://www.worktoolshub.info';

// Helper function to get all available tools (non-pending)
function getAvailableTools() {
  const tools = [];
  
  Object.values(toolCategories).forEach(category => {
    category.tools.forEach(tool => {
      // Only include tools that aren't pending and don't point to error pages
      if (!tool.pending && !tool.path.includes('error.html')) {
        tools.push({
          path: tool.path,
          name: tool.name,
          category: category.name
        });
      }
    });
  });
  
  // Remove duplicates based on path
  const uniqueTools = tools.filter((tool, index, self) => 
    index === self.findIndex(t => t.path === tool.path)
  );
  
  return uniqueTools;
}

// Sitemap.xml endpoint
router.get('/sitemap.xml', (req, res) => {
  try {
    const now = new Date().toISOString().split('T')[0];
    const availableTools = getAvailableTools();
    
    // Static pages - adjust these based on your actual pages
    const staticPages = [
      { url: '', priority: '1.0', changefreq: 'weekly' }, // Homepage
      { url: '/about', priority: '0.8', changefreq: 'monthly' },
      { url: '/contact', priority: '0.7', changefreq: 'monthly' },
      { url: '/privacy', priority: '0.5', changefreq: 'yearly' },
      { url: '/terms', priority: '0.5', changefreq: 'yearly' },
    ];

    // Tool pages
    const toolPages = availableTools.map(tool => ({
      url: tool.path,
      priority: '0.9',
      changefreq: 'weekly',
      name: tool.name,
      category: tool.category
    }));

    // Generate XML
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
`;

    // Add static pages
    staticPages.forEach(page => {
      xml += `  <url>
    <loc>${SITE_URL}${page.url}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>
`;
    });

    // Add tool pages
    toolPages.forEach(page => {
      xml += `  <url>
    <loc>${SITE_URL}${page.url}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>
`;
    });

    xml += `</urlset>`;

    res.set('Content-Type', 'application/xml');
    res.send(xml);
    
    console.log(`✅ Sitemap generated with ${staticPages.length + toolPages.length} pages`);
    
  } catch (error) {
    console.error('❌ Error generating sitemap:', error);
    res.status(500).send('Error generating sitemap');
  }
});

// Robots.txt endpoint
router.get('/robots.txt', (req, res) => {
  try {
    const pendingTools = Object.values(toolCategories)
      .flatMap(cat => cat.tools)
      .filter(tool => tool.pending);

    const robotsTxt = `User-agent: *
Allow: /

# Main sitemap
Sitemap: ${SITE_URL}/sitemap.xml

# Block error pages and admin paths
Disallow: /error.html
Disallow: /admin/
Disallow: /.git/
Disallow: /node_modules/
Disallow: /api/

# Block coming soon tools (they redirect to error page anyway)
${pendingTools
  .filter(tool => tool.path.includes('error.html'))
  .map(tool => `# Coming soon: ${tool.name}`)
  .join('\n')}

# Crawl-delay for respectful crawling
Crawl-delay: 1

# Popular tools to prioritize crawling
${getAvailableTools()
  .slice(0, 5)
  .map(tool => `# Priority tool: ${tool.name} - ${tool.path}`)
  .join('\n')}
`;

    res.set('Content-Type', 'text/plain');
    res.send(robotsTxt);
    
    console.log('✅ Robots.txt generated');
    
  } catch (error) {
    console.error('❌ Error generating robots.txt:', error);
    res.status(500).send('Error generating robots.txt');
  }
});

// Tools status endpoint (useful for debugging and monitoring)
router.get('/tools-status', (req, res) => {
  try {
    const availableTools = getAvailableTools();
    const pendingTools = Object.values(toolCategories)
      .flatMap(cat => cat.tools)
      .filter(tool => tool.pending);

    const categories = Object.keys(toolCategories).map(key => ({
      id: key,
      name: toolCategories[key].name,
      icon: toolCategories[key].icon,
      available: toolCategories[key].tools.filter(t => !t.pending).length,
      pending: toolCategories[key].tools.filter(t => t.pending).length,
      total: toolCategories[key].tools.length
    }));

    res.json({
      summary: {
        available: availableTools.length,
        pending: pendingTools.length,
        total: availableTools.length + pendingTools.length,
        lastUpdated: new Date().toISOString()
      },
      categories,
      availableTools: availableTools.map(t => ({ 
        name: t.name, 
        path: t.path, 
        category: t.category 
      })),
      pendingTools: pendingTools.map(t => ({ 
        name: t.name, 
        path: t.path 
      })),
      sitemapUrl: `${SITE_URL}/sitemap.xml`,
      robotsUrl: `${SITE_URL}/robots.txt`
    });
    
  } catch (error) {
    console.error('❌ Error getting tools status:', error);
    res.status(500).json({ 
      error: 'Error getting tools status',
      message: error.message 
    });
  }
});

module.exports = router;