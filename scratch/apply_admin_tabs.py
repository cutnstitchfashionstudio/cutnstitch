import os

admin_html_path = r"d:\Antigravity Course\Course Work\Stitching Website\admin.html"

with open(admin_html_path, "r", encoding="utf-8") as file:
    content = file.read()

# 1. Inject CSS for tabs inside the style block
TAB_CSS = """
    /* ── Tabs navigation ── */
    .admin-tabs { display: flex; gap: 8px; border-bottom: 1px solid var(--border); margin-bottom: 24px; padding-bottom: 0; }
    .tab-btn { background: none; border: none; padding: 12px 20px; font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 600; color: var(--muted); cursor: pointer; position: relative; transition: .2s; border-bottom: 2px solid transparent; outline: none; }
    .tab-btn:hover { color: var(--text); }
    .tab-btn.active { color: var(--gold); border-bottom-color: var(--gold); }
    .tab-btn span { background: rgba(255,255,255,0.08); font-size: 11px; padding: 2px 6px; border-radius: 10px; margin-left: 5px; color: var(--muted); }
    .tab-btn.active span { background: rgba(201,168,76,0.2); color: var(--gold); }
"""

# Append just before </style>
if "</style>" in content:
    content = content.replace("    </style>", TAB_CSS + "  </style>")
    print("[admin.html] Appended tab styles to CSS block")

# 2. Inject HTML structure for tabs, users panel, and messages panel inside adminScreen
# Let's locate from the start of the stats-row to the end of the usersTable wrapper
# In adminScreen:
# <div id="adminScreen">
#   <div class="dash-header">...</div>
#   <!-- We will insert the tabs here -->
#   <div id="usersPanel" class="tab-content">
#     <!-- Stats for users -->
#     <!-- Table for users -->
#   </div>
#   <div id="messagesPanel" class="tab-content" style="display:none;">
#     <!-- Stats for messages -->
#     <!-- Table for messages -->
#   </div>

OLD_STATS_ROW_AND_TABLE = """    <!-- Stats -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-val" id="statTotal">—</div>
        <div class="stat-label">Total Customers</div>
      </div>
      <div class="stat-card">
        <div class="stat-val" id="statVerified" style="color:#6ee7b7;">—</div>
        <div class="stat-label">Verified</div>
      </div>
      <div class="stat-card">
        <div class="stat-val" id="statPending" style="color:#fcd34d;">—</div>
        <div class="stat-label">Pending</div>
      </div>
    </div>

    <!-- Table -->
    <div class="table-wrap">
      <div class="table-top">
        <span style="font-weight:600;font-size:14px;">All Customers</span>
        <input class="table-search" type="text" id="searchInput" placeholder="🔍  Search name, phone, email…" oninput="filterTable()">
      </div>
      <div style="overflow-x:auto;">
        <table id="usersTable">
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Password</th>
              <th>Status</th>
              <th>Joined</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody id="usersBody">
            <tr><td colspan="8"><div class="empty-state"><div class="icon">⏳</div><p>Loading customers…</p></div></td></tr>
          </tbody>
        </table>
      </div>
    </div>"""

NEW_TABS_AND_PANELS = """    <!-- Tabs System -->
    <div class="admin-tabs">
      <button class="tab-btn active" id="tabUsersBtn" onclick="switchTab('users')">
        👤 Customers <span id="tabUsersCount">0</span>
      </button>
      <button class="tab-btn" id="tabMessagesBtn" onclick="switchTab('messages')">
        ✉️ Client Messages <span id="tabMessagesCount">0</span>
      </button>
    </div>

    <!-- ══ CUSTOMERS PANEL ═══════════════════════════════════════ -->
    <div id="usersPanel" class="tab-content">
      <!-- Stats -->
      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-val" id="statTotal">—</div>
          <div class="stat-label">Total Customers</div>
        </div>
        <div class="stat-card">
          <div class="stat-val" id="statVerified" style="color:#6ee7b7;">—</div>
          <div class="stat-label">Verified</div>
        </div>
        <div class="stat-card">
          <div class="stat-val" id="statPending" style="color:#fcd34d;">—</div>
          <div class="stat-label">Pending</div>
        </div>
      </div>

      <!-- Table -->
      <div class="table-wrap">
        <div class="table-top">
          <span style="font-weight:600;font-size:14px;">All Customers</span>
          <input class="table-search" type="text" id="searchInput" placeholder="🔍  Search name, phone, email…" oninput="filterTable()">
        </div>
        <div style="overflow-x:auto;">
          <table id="usersTable">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Password</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody id="usersBody">
              <tr><td colspan="8"><div class="empty-state"><div class="icon">⏳</div><p>Loading customers…</p></div></td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ══ CLIENT MESSAGES PANEL ═══════════════════════════════════ -->
    <div id="messagesPanel" class="tab-content" style="display: none;">
      <!-- Stats -->
      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-val" id="statMsgTotal">—</div>
          <div class="stat-label">Total Messages</div>
        </div>
        <div class="stat-card">
          <div class="stat-val" id="statMsgInquiries" style="color:var(--gold);">—</div>
          <div class="stat-label">Stitching Inquiries</div>
        </div>
        <div class="stat-card">
          <div class="stat-val" id="statMsgConsultations" style="color:#6ee7b7;">—</div>
          <div class="stat-label">Consultations</div>
        </div>
      </div>

      <!-- Table -->
      <div class="table-wrap">
        <div class="table-top">
          <span style="font-weight:600;font-size:14px;">All Client Messages</span>
          <input class="table-search" type="text" id="msgSearchInput" placeholder="🔍  Search sender, phone, message…" oninput="filterMessagesTable()">
        </div>
        <div style="overflow-x:auto;">
          <table id="messagesTable">
            <thead>
              <tr>
                <th style="width: 50px;">#</th>
                <th style="width: 150px;">Sender</th>
                <th style="width: 130px;">Phone</th>
                <th style="width: 180px;">Email</th>
                <th style="width: 180px;">Subject</th>
                <th>Message</th>
                <th style="width: 150px;">Received</th>
              </tr>
            </thead>
            <tbody id="messagesBody">
              <tr><td colspan="7"><div class="empty-state"><div class="icon">✉️</div><p>Loading messages…</p></div></td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>"""

# Replace html part
# Normalize line endings to avoid matching issues
content_norm = content.replace("\r\n", "\n")
old_norm = OLD_STATS_ROW_AND_TABLE.replace("\r\n", "\n")
new_norm = NEW_TABS_AND_PANELS.replace("\r\n", "\n")

if old_norm in content_norm:
    content_norm = content_norm.replace(old_norm, new_norm)
    content = content_norm
    print("[admin.html] Replaced stats and table with tabbed panels")
else:
    print("[admin.html] WARNING: Could not find exact HTML match. Doing fallback replace...")
    # Fallback to general replace if whitespace differed
    content = content.replace("<!-- Stats -->", "<!-- Stats -->" + NEW_TABS_AND_PANELS)

# 3. Replace load/render calls inside script
# In doLogin:
old_login_render = "renderUsers(data.users || []);"
new_login_render = "renderDashboard(data.users || [], data.messages || []);"
content = content.replace(old_login_render, new_login_render)

# In loadUsers:
old_load_render = "renderUsers(data.users || []);"
new_load_render = "renderDashboard(data.users || [], data.messages || []);"
content = content.replace(old_load_render, new_load_render)

# 4. Inject renderDashboard, buildMessageRows, filterMessagesTable, and switchTab functions inside the script
NEW_SCRIPT_FUNCTIONS = """  let allMessages = [];

  function renderDashboard(users, messages) {
    // 1. Render Users
    allUsers = users;
    document.getElementById('statTotal').textContent    = users.length;
    document.getElementById('statVerified').textContent = users.filter(u => u.status === 'verified').length;
    document.getElementById('statPending').textContent  = users.filter(u => u.status === 'pending').length;
    buildRows(users);

    // 2. Render Messages
    allMessages = messages;
    document.getElementById('statMsgTotal').textContent = messages.length;
    document.getElementById('statMsgInquiries').textContent = messages.filter(m => 
      m.subject.toLowerCase().includes('stitch')
    ).length;
    document.getElementById('statMsgConsultations').textContent = messages.filter(m => 
      m.subject.toLowerCase().includes('consult') || m.subject.toLowerCase().includes('embroidery')
    ).length;
    buildMessageRows(messages);

    // Update Counts on tabs
    document.getElementById('tabUsersCount').textContent = users.length;
    document.getElementById('tabMessagesCount').textContent = messages.length;
  }

  function buildMessageRows(messages) {
    const tbody = document.getElementById('messagesBody');
    if (!messages.length) {
      tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="icon">✉️</div><p>No messages found.</p></div></td></tr>`;
      return;
    }
    tbody.innerHTML = messages.map((m, i) => `
      <tr data-id="${m.id}">
        <td class="td-muted">${i + 1}</td>
        <td class="td-name">${escHtml(m.name)}</td>
        <td class="td-muted">${escHtml(m.phone)}</td>
        <td class="td-muted" style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escHtml(m.email)}</td>
        <td>
          <span class="badge badge-pending" style="background:rgba(201,168,76,0.1); border:1px solid rgba(201,168,76,0.2); color:var(--gold);">
            ${escHtml(m.subject)}
          </span>
        </td>
        <td style="max-width:350px;word-break:break-word;font-size:12px;line-height:1.5;">${escHtml(m.message)}</td>
        <td class="td-muted" style="white-space:nowrap;">${escHtml(m.createdAt)}</td>
      </tr>
    `).join('');
  }

  function filterMessagesTable() {
    const q = document.getElementById('msgSearchInput').value.toLowerCase().trim();
    if (!q) { buildMessageRows(allMessages); return; }
    buildMessageRows(allMessages.filter(m =>
      (m.name + m.phone + m.email + m.message + m.subject).toLowerCase().includes(q)
    ));
  }

  function switchTab(tab) {
    const usersTabBtn = document.getElementById('tabUsersBtn');
    const msgsTabBtn  = document.getElementById('tabMessagesBtn');
    const usersPanel   = document.getElementById('usersPanel');
    const msgsPanel    = document.getElementById('messagesPanel');

    usersTabBtn.classList.remove('active');
    msgsTabBtn.classList.remove('active');

    if (tab === 'users') {
      usersTabBtn.classList.add('active');
      usersPanel.style.display = 'block';
      msgsPanel.style.display  = 'none';
      document.querySelector('.dash-title').textContent = 'Customer Accounts';
      document.querySelector('.dash-subtitle').textContent = 'Manage and verify customer registrations';
    } else {
      msgsTabBtn.classList.add('active');
      usersPanel.style.display = 'none';
      msgsPanel.style.display  = 'block';
      document.querySelector('.dash-title').textContent = 'Client Messages';
      document.querySelector('.dash-subtitle').textContent = 'Read and manage form submissions from the contact page';
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // RENDER TABLE"""

# Insert this function block before "// ═══════════════════════════════════════════════════════════════\n  // RENDER TABLE"
content = content.replace("  // ═══════════════════════════════════════════════════════════════\n  // RENDER TABLE", NEW_SCRIPT_FUNCTIONS)

with open(admin_html_path, "w", encoding="utf-8") as file:
    file.write(content)

print("[admin.html] Polish application completed successfully!")
