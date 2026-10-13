// =========================================================
// SUPABASE REST CONFIGURATION (Two-Table Architecture)
// =========================================================
const SUPABASE_URL = "https://wdbdhqjcrvmdynrvudmk.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkYmRocWpjcnZtZHlucnZ1ZG1rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE1MTY1ODcsImV4cCI6MjEwNzA5MjU4N30.njYaG7Ab8FbmqVAJv4INDE8Cpk5VC2FFR48jX3MndKo";

const supabaseHeaders = {
  "Content-Type": "application/json",
  "apikey": SUPABASE_ANON_KEY,
  "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
};

const USERS_URL = `${SUPABASE_URL}/rest/v1/users`;
const CONFESSIONS_URL = `${SUPABASE_URL}/rest/v1/confessions`;

document.addEventListener('DOMContentLoaded', () => {
  const page = document.body.getAttribute('data-page');

  function escapeHtml(text) {
    return (text || '').replace(/[&<>"']/g, (m) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[m]));
  }

  // =========================================================
  // PAGE 1: HOME PAGE (index.html)
  // =========================================================
  if (page === 'home') {
    const activeUser = localStorage.getItem('westprime_user');
    if (activeUser) {
      window.location.href = "confessions.html";
      return;
    }

    const loginTab = document.getElementById('loginTab');
    const registerTab = document.getElementById('registerTab');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    loginTab?.addEventListener('click', () => {
      loginTab.classList.add('active');
      registerTab.classList.remove('active');
      loginForm.classList.remove('hidden');
      registerForm.classList.add('hidden');
    });

    registerTab?.addEventListener('click', () => {
      registerTab.classList.add('active');
      loginTab.classList.remove('active');
      registerForm.classList.remove('hidden');
      loginForm.classList.add('hidden');
    });

    // Login Handler
    loginForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const usernameInput = document.getElementById('loginUsername').value.trim();
      const passwordInput = document.getElementById('loginPassword').value;

      try {
        const res = await fetch(`${USERS_URL}?username=eq.${encodeURIComponent(usernameInput)}`, {
          method: 'GET',
          headers: supabaseHeaders
        });

        const users = await res.json();

        if (!users || users.length === 0) {
          alert("Username does not exist. Please register first!");
          return;
        }

        const user = users[0];
        if (user.password !== passwordInput) {
          alert("Incorrect password!");
          return;
        }

        localStorage.setItem('westprime_user', user.username);
        window.location.href = "confessions.html";
      } catch (err) {
        alert("Connection error during login: " + err.message);
      }
    });

    // Register Handler
    registerForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const usernameInput = document.getElementById('regUsername').value.trim();
      const passwordInput = document.getElementById('regPassword').value;

      try {
        const checkRes = await fetch(`${USERS_URL}?username=eq.${encodeURIComponent(usernameInput)}`, {
          method: 'GET',
          headers: supabaseHeaders
        });

        const existing = await checkRes.json();

        if (existing && existing.length > 0) {
          alert("Username is already taken! Please choose another one.");
          return;
        }

        const insertRes = await fetch(USERS_URL, {
          method: 'POST',
          headers: supabaseHeaders,
          body: JSON.stringify({
            username: usernameInput,
            password: passwordInput,
            created_at: new Date().toISOString()
          })
        });

        if (!insertRes.ok) {
          const errData = await insertRes.json();
          alert("Registration failed: " + (errData.message || insertRes.statusText));
          return;
        }

        alert("Account registered successfully!");
        localStorage.setItem('westprime_user', usernameInput);
        window.location.href = "confessions.html";
      } catch (err) {
        alert("Connection error during registration: " + err.message);
      }
    });
  }

  // =========================================================
  // PAGE 2: CONFESSIONS FEED (confessions.html)
  // =========================================================
  if (page === 'confessions') {
    const activeUser = localStorage.getItem('westprime_user');
    if (!activeUser) {
      window.location.href = "index.html";
      return;
    }

    const userGreeting = document.getElementById('userGreeting');
    if (userGreeting) userGreeting.innerText = `Hi, ${activeUser}`;

    document.getElementById('logoutBtn')?.addEventListener('click', () => {
      localStorage.removeItem('westprime_user');
      window.location.href = "index.html";
    });

    const confessionForm = document.getElementById('confessionForm');
    confessionForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const tag = document.getElementById('postTagInput').value.trim();
      const content = document.getElementById('postContentInput').value.trim();

      try {
        const res = await fetch(CONFESSIONS_URL, {
          method: 'POST',
          headers: supabaseHeaders,
          body: JSON.stringify({
            author: activeUser,
            tag: tag,
            content: content,
            created_at: new Date().toISOString()
          })
        });

        if (!res.ok) {
          const errData = await res.json();
          alert("Failed to publish confession: " + (errData.message || res.statusText));
          return;
        }

        confessionForm.reset();
        alert("Confession published!");
        loadFeed();
      } catch (err) {
        alert("Connection error while posting.");
      }
    });

    const searchInput = document.getElementById('searchInput');
    searchInput?.addEventListener('keyup', () => {
      const queryText = searchInput.value.toLowerCase().trim();
      const cards = document.querySelectorAll('.diary-card');
      cards.forEach(card => {
        card.style.display = card.innerText.toLowerCase().includes(queryText) ? 'block' : 'none';
      });
    });

    async function loadFeed() {
      const feedContainer = document.getElementById('feedContainer');
      if (!feedContainer) return;

      try {
        const res = await fetch(`${CONFESSIONS_URL}?order=created_at.desc`, {
          method: 'GET',
          headers: supabaseHeaders
        });

        const confessions = await res.json();

        feedContainer.innerHTML = '';
        if (!confessions || confessions.length === 0) {
          feedContainer.innerHTML = `<div style="background:white; padding:2rem; border-radius:12px; text-align:center;">No confessions posted yet. Be the first to share one!</div>`;
          return;
        }

        confessions.forEach((data) => {
          const card = document.createElement('div');
          card.className = 'diary-card';
          card.innerHTML = `
            <div class="diary-header">
              <span class="diary-tag">${escapeHtml(data.tag)}</span>
              <span class="diary-time">${data.created_at ? new Date(data.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}</span>
            </div>
            <div class="diary-author">Posted by: ${escapeHtml(data.author || 'Anonymous')}</div>
            <div class="diary-content">${escapeHtml(data.content)}</div>
          `;
          feedContainer.appendChild(card);
        });
      } catch (err) {
        feedContainer.innerHTML = `<div style="background:white; padding:2rem; text-align:center; color:red;">Failed to load feed.</div>`;
      }
    }

    loadFeed();
  }

  // =========================================================
  // PAGE 3: ADMIN DASHBOARD (admin.html)
  // =========================================================
  if (page === 'admin') {
    const ADMIN_PASSWORD = "WheneverIseeuhehe1";

    const adminGate = document.getElementById('adminGate');
    const adminPanel = document.getElementById('adminPanel');
    const adminLoginForm = document.getElementById('adminLoginForm');

    adminLoginForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      const inputPass = document.getElementById('adminPasswordInput').value;

      if (inputPass === ADMIN_PASSWORD) {
        adminGate?.classList.add('hidden');
        adminPanel?.classList.remove('hidden');
        loadAdminFeed();
      } else {
        alert("Incorrect admin password!");
      }
    });

    async function loadAdminFeed() {
      const container = document.getElementById('adminFeedContainer');
      if (!container) return;

      try {
        const res = await fetch(`${CONFESSIONS_URL}?order=created_at.desc`, {
          method: 'GET',
          headers: supabaseHeaders
        });

        const confessions = await res.json();

        container.innerHTML = '';
        if (!confessions || confessions.length === 0) {
          container.innerHTML = `<div style="background:white; padding:2rem; border-radius:12px; text-align:center;">No entries found.</div>`;
          return;
        }

        confessions.forEach((data) => {
          const card = document.createElement('div');
          card.className = 'diary-card';
          card.innerHTML = `
            <div class="diary-header">
              <span class="diary-tag">${escapeHtml(data.tag)}</span>
              <button class="btn btn-danger delete-btn" data-id="${data.id}" style="padding:0.2rem 0.6rem; font-size:0.75rem;">
                <i class="fa-solid fa-trash"></i> Delete
              </button>
            </div>
            <div class="diary-author">Author: ${escapeHtml(data.author || 'Anonymous')}</div>
            <div class="diary-content">${escapeHtml(data.content)}</div>
          `;
          container.appendChild(card);
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            const confessionId = e.currentTarget.getAttribute('data-id');
            if (confirm("Delete this confession?")) {
              const deleteRes = await fetch(`${CONFESSIONS_URL}?id=eq.${confessionId}`, {
                method: 'DELETE',
                headers: supabaseHeaders
              });

              if (deleteRes.ok) {
                loadAdminFeed();
              } else {
                alert("Failed to delete entry.");
              }
            }
          });
        });
      } catch (err) {
        container.innerHTML = `<div style="background:white; padding:2rem; text-align:center; color:red;">Failed to load entries.</div>`;
      }
    }
  }

});
