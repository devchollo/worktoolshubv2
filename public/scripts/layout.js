// layout.js

// =============================
// Breadcrumb Builder
// =============================
function buildBreadcrumbs(baseFolder = "", ignoreFolders = []) {
  const container = document.getElementById("breadcrumbs");
  if (!container) return;

  let pathParts = window.location.pathname.split("/").filter(Boolean);

  // Remove base folder if set
  if (baseFolder && pathParts[0] === baseFolder) {
    pathParts.shift();
  }

  // Remove ignored folders
  pathParts = pathParts.filter(part => !ignoreFolders.includes(part));

  // If the last part is index.html or index, drop it
  if (pathParts.length && /^index(\.html)?$/i.test(pathParts[pathParts.length - 1])) {
    pathParts.pop();
  }

  // Always start with Home
  let breadcrumbHTML = `<a href="${baseFolder ? "/" + baseFolder : "/"}">Home</a>`;
  let cumulativePath = baseFolder ? "/" + baseFolder : "";

  pathParts.forEach((part, i) => {
    cumulativePath += "/" + part;
    const isLast = i === pathParts.length - 1;

    // Format nicely
    let label = part.replace(/\.[^/.]+$/, ""); 
    label = label.replace(/[-_]/g, " ");       
    label = label.replace(/\b\w/g, c => c.toUpperCase()); 

    // Special case: "tools" should never be a link
    if (part.toLowerCase() === "tools") {
      breadcrumbHTML += ` &raquo; <span class="bread_link">${label}</span>`;
    } else {
      breadcrumbHTML += isLast
        ? ` &raquo; <span class="bread_link">${label}</span>`
        : ` &raquo; <a href="${cumulativePath}" class="bread_link">${label}</a>`;
    }
  });

  container.innerHTML = breadcrumbHTML;
}

// =============================
// Load external header/footer/templates
// =============================
async function loadTemplate(id, file) {
  try {
    const res = await fetch(file);
    if (!res.ok) throw new Error(`Failed to load ${file}`);
    document.getElementById(id).innerHTML = await res.text();
  } catch (err) {
    console.error(err);
  }
}

// =============================
// Init
// =============================
document.addEventListener("DOMContentLoaded", async () => {
  await loadTemplate("bread", "../components/breadcrumbs.html");
  await loadTemplate("header", "../templates/header.html");
  await loadTemplate("footer", "../templates/footer.html");

  buildBreadcrumbs("", ["public", "views"]);
});
