(() => {
  const cfg = window.PORTFOLIO_CONFIG || {};
  const ready = cfg.SUPABASE_URL && !cfg.SUPABASE_URL.includes("YOUR_PROJECT_REF")
    && cfg.SUPABASE_PUBLISHABLE_KEY && !cfg.SUPABASE_PUBLISHABLE_KEY.includes("YOUR_SUPABASE");
  const db = ready && window.supabase ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_PUBLISHABLE_KEY) : null;
  const $ = (id) => document.getElementById(id);
  const loginPanel = $("login-panel"), dashboard = $("dashboard");
  function esc(v) { return String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
  function showSetup() {
    if (!db) { $("setup-warning").classList.remove("hidden"); $("setup-warning").textContent = "Supabase is not configured. Edit assets/config.js and add your project URL and publishable key before using Admin."; }
  }
  function showDashboard(user) {
    loginPanel.classList.add("hidden"); dashboard.classList.remove("hidden");
    $("signed-in-as").textContent = `Signed in as ${user.email || "authorized user"}`;
    refresh();
  }
  function showLogin() { dashboard.classList.add("hidden"); loginPanel.classList.remove("hidden"); }
  async function refresh() { await Promise.all([loadProjects(), loadMessages()]); }
  function resetEditor() {
    $("project-form").reset(); $("project-form").elements.id.value = "";
    $("project-editor-title").textContent = "Add a project"; $("cancel-edit").classList.add("hidden");
  }
  async function loadProjects() {
    const target = $("admin-projects"); target.innerHTML = "<p class='muted'>Loading…</p>";
    const { data, error } = await db.from("projects").select("*").order("created_at", { ascending: false });
    if (error) { target.innerHTML = `<p class="status">Cannot read projects: ${esc(error.message)}</p>`; return; }
    if (!data.length) { target.innerHTML = "<p class='muted'>No projects yet. Use the form above to add one.</p>"; return; }
    target.innerHTML = data.map(p => `<article class="admin-item"><div><h3>${esc(p.title)}</h3><p class="muted small">${esc(p.description)}</p><p class="small">${p.published ? "Published" : "Draft"} · ${p.featured ? "Featured" : "Standard"}</p></div><div class="actions"><button class="btn secondary edit-project" data-id="${esc(p.id)}" type="button">Edit</button><button class="btn danger delete-project" data-id="${esc(p.id)}" type="button">Delete</button></div></article>`).join("");
    target.querySelectorAll(".edit-project").forEach(b => b.addEventListener("click", () => editProject(data.find(p => p.id === b.dataset.id))));
    target.querySelectorAll(".delete-project").forEach(b => b.addEventListener("click", () => deleteProject(b.dataset.id)));
  }
  function editProject(p) {
    const f = $("project-form"); f.elements.id.value = p.id; f.elements.title.value = p.title || "";
    f.elements.description.value = p.description || ""; f.elements.technologies.value = (p.technologies || []).join(", ");
    f.elements.project_url.value = p.project_url || ""; f.elements.image_url.value = p.image_url || "";
    f.elements.featured.checked = !!p.featured; $("project-editor-title").textContent = "Edit project";
    $("cancel-edit").classList.remove("hidden"); window.scrollTo({top: 0, behavior: "smooth"});
  }
  async function deleteProject(id) {
    if (!confirm("Delete this project? This cannot be undone.")) return;
    const { error } = await db.from("projects").delete().eq("id", id);
    $("project-status-admin").textContent = error ? `Delete failed: ${error.message}` : "Project deleted.";
    if (!error) await loadProjects();
  }
  $("project-form").addEventListener("submit", async e => {
    e.preventDefault(); const f = e.currentTarget, status = $("project-status-admin");
    const id = f.elements.id.value;
    const payload = {
      title: f.elements.title.value.trim(), description: f.elements.description.value.trim(),
      technologies: f.elements.technologies.value.split(",").map(x => x.trim()).filter(Boolean),
      project_url: f.elements.project_url.value.trim() || null,
      image_url: f.elements.image_url.value.trim() || null,
      featured: f.elements.featured.checked, published: true
    };
    const { error } = id ? await db.from("projects").update(payload).eq("id", id) : await db.from("projects").insert(payload);
    if (error) { status.textContent = `Save failed: ${error.message}`; return; }
    status.textContent = "Project saved."; resetEditor(); await loadProjects();
  });
  $("cancel-edit").addEventListener("click", resetEditor);
  async function loadMessages() {
    const target = $("admin-messages"); target.innerHTML = "<p class='muted'>Loading messages…</p>";
    const { data, error } = await db.from("contact_messages").select("id,name,email,subject,message,created_at").order("created_at", { ascending: false }).limit(100);
    if (error) { target.innerHTML = `<p class="status">Cannot read messages: ${esc(error.message)}</p>`; return; }
    if (!data.length) { target.innerHTML = "<p class='muted'>Your inbox is empty.</p>"; return; }
    target.innerHTML = data.map(m => `<article class="admin-item message-item"><div><h3>${esc(m.subject || "Portfolio enquiry")}</h3><p><strong>${esc(m.name)}</strong> · <a href="mailto:${esc(m.email)}">${esc(m.email)}</a></p><p class="muted small">${esc(new Date(m.created_at).toLocaleString())}</p><p class="message-body">${esc(m.message)}</p></div><button class="btn danger delete-message" data-id="${esc(m.id)}" type="button">Delete</button></article>`).join("");
    target.querySelectorAll(".delete-message").forEach(b => b.addEventListener("click", async () => {
      if (!confirm("Delete this message?")) return;
      const { error: delError } = await db.from("contact_messages").delete().eq("id", b.dataset.id);
      $("messages-status").textContent = delError ? `Delete failed: ${delError.message}` : "Message deleted.";
      if (!delError) await loadMessages();
    }));
  }
  $("login-form").addEventListener("submit", async e => {
    e.preventDefault(); if (!db) return;
    const f = e.currentTarget; $("login-status").textContent = "Signing in…";
    const { data, error } = await db.auth.signInWithPassword({email: f.elements.email.value.trim(), password: f.elements.password.value});
    $("login-status").textContent = error ? "Sign-in failed. Check your email, password, and admin authorization." : "";
    if (!error) showDashboard(data.user);
  });
  $("sign-out").addEventListener("click", async () => { await db.auth.signOut(); showLogin(); });
  $("year")?.textContent && ($("year").textContent = new Date().getFullYear());
  if (db) db.auth.getSession().then(({data}) => { if (data.session) showDashboard(data.session.user); else showLogin(); });
  else showSetup();
})();
