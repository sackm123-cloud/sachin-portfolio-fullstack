(() => {
  const cfg = window.PORTFOLIO_CONFIG || {};
  const ready = cfg.SUPABASE_URL && !cfg.SUPABASE_URL.includes("YOUR_PROJECT_REF")
    && cfg.SUPABASE_PUBLISHABLE_KEY && !cfg.SUPABASE_PUBLISHABLE_KEY.includes("YOUR_SUPABASE");
  const client = ready && window.supabase
    ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_PUBLISHABLE_KEY)
    : null;
  const $ = (id) => document.getElementById(id);
  $("year").textContent = new Date().getFullYear();

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[ch]));
  }
  function safeUrl(value) {
    try { const url = new URL(value); return ["https:", "http:"].includes(url.protocol) ? url.href : ""; }
    catch { return ""; }
  }
  function renderProject(p) {
    const technologies = Array.isArray(p.technologies) ? p.technologies : [];
    const image = safeUrl(p.image_url);
    const link = safeUrl(p.project_url);
    return `<article class="project-card">
      ${image ? `<img class="project-image" src="${escapeHtml(image)}" alt="" loading="lazy">` : `<div class="project-image image-placeholder">PROJECT / ${escapeHtml(p.featured ? "FEATURED" : "BUILD")}</div>`}
      <div class="project-content"><div class="project-meta">${p.featured ? '<span class="featured-label">FEATURED</span>' : ''}</div>
      <h3>${escapeHtml(p.title)}</h3><p>${escapeHtml(p.description)}</p>
      <div class="tag-list">${technologies.map(t => `<span>${escapeHtml(t)}</span>`).join("")}</div>
      ${link ? `<a class="text-link" href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">View project ↗</a>` : ""}</div></article>`;
  }
  async function loadProjects() {
    const grid = $("project-grid"), status = $("project-status");
    if (!client) { status.textContent = "Supabase is not configured yet. Follow README.md to connect your database."; return; }
    const { data, error } = await client.from("projects").select("id,title,description,technologies,project_url,image_url,featured,created_at").eq("published", true).order("featured", { ascending: false }).order("created_at", { ascending: false });
    if (error) { status.textContent = "Projects could not load. Check the database setup and public read policy."; console.error(error); return; }
    if (!data.length) { status.textContent = "No published projects yet. Add projects through Admin."; return; }
    status.textContent = ""; grid.innerHTML = data.map(renderProject).join("");
  }
  $("contact-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget, status = $("contact-status");
    if (!client) { status.textContent = "Contact form is not configured yet. Please try again later."; return; }
    const f = new FormData(form);
    if (String(f.get("website") || "").trim()) { status.textContent = "Message could not be sent."; return; }
    const payload = {
      name: String(f.get("name") || "").trim(),
      email: String(f.get("email") || "").trim(),
      subject: String(f.get("subject") || "").trim() || "Portfolio enquiry",
      message: String(f.get("message") || "").trim()
    };
    if (!payload.name || !payload.email || payload.message.length < 10) { status.textContent = "Please check the form fields."; return; }
    const button = form.querySelector("button[type=submit]"); button.disabled = true; status.textContent = "Sending…";
    const { error } = await client.from("contact_messages").insert(payload);
    button.disabled = false;
    if (error) { status.textContent = "Could not send the message. Please try again later."; console.error(error); }
    else { form.reset(); status.textContent = "Message sent. Thank you for getting in touch."; }
  });
  loadProjects();
})();
