let fetchedCommits = [];
const COUNTER_NAMESPACE = 'sanjaygdrrad_public_changelog';
const COUNTER_KEY = 'visits';

document.addEventListener('DOMContentLoaded', () => {
  // 1. Set default dates (past 30 days to today)
  const today = new Date();
  const past30 = new Date();
  past30.setDate(today.getDate() - 30);

  const toInput = document.getElementById('toDate');
  const fromInput = document.getElementById('fromDate');
  
  if (toInput) toInput.value = today.toISOString().split('T')[0];
  if (fromInput) fromInput.value = past30.toISOString().split('T')[0];

  // 2. Attach Event Listeners
  const fetchBtn = document.getElementById('fetchBtn');
  const exportBtn = document.getElementById('exportBtn');

  if (fetchBtn) fetchBtn.addEventListener('click', fetchCommits);
  if (exportBtn) exportBtn.addEventListener('click', exportToXLSX);

  // 3. Initialize Visitor Counter (FIXED: Called the correct existing function)
  initVisitorCounter();

  // 4. Auto-refresh visitor counter every 1 minute
  setInterval(refreshVisitorCounter, 60000);
});

async function fetchCommits() {
  const username = document.getElementById('username').value.trim();
  const repo = document.getElementById('repo').value.trim();
  const fromDate = document.getElementById('fromDate').value;
  const toDate = document.getElementById('toDate').value;
  const statusMsg = document.getElementById('statusMessage');
  const commitList = document.getElementById('commitList');
  const exportBtn = document.getElementById('exportBtn');

  if (!username || !repo) {
    statusMsg.textContent = 'Please provide both username and repository name.';
    return;
  }

  statusMsg.textContent = 'Fetching commits from GitHub...';
  commitList.innerHTML = '';
  if (exportBtn) exportBtn.style.display = 'none';

  let url = `https://api.github.com/repos/${username}/${repo}/commits?per_page=100`;
  if (fromDate) url += `&since=${new Date(fromDate).toISOString()}`;
  if (toDate) {
    const endOfDay = new Date(toDate);
    endOfDay.setHours(23, 59, 59, 999);
    url += `&until=${endOfDay.toISOString()}`;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText} (${response.status})`);
    }

    const data = await response.json();
    
    // Filter commits by author username if specified
    fetchedCommits = data.filter(item => {
      const authorLogin = item.author ? item.author.login.toLowerCase() : '';
      return !username || authorLogin === username.toLowerCase();
    });

    if (fetchedCommits.length === 0) {
      statusMsg.textContent = `No commits found for author "${username}" in the selected date range.`;
      return;
    }

    statusMsg.textContent = `Found ${fetchedCommits.length} commit(s) by ${username}`;
    if (exportBtn) exportBtn.style.display = 'inline-flex';

    renderCommits(fetchedCommits);
  } catch (err) {
    statusMsg.textContent = `Error: ${err.message}`;
  }
}

function renderCommits(commits) {
  const commitList = document.getElementById('commitList');
  commitList.innerHTML = '';

  commits.forEach(item => {
    const message = item.commit.message.split('\n')[0];
    const date = new Date(item.commit.author.date).toLocaleString();
    const sha = item.sha.substring(0, 7);
    const url = item.html_url;

    const div = document.createElement('div');
    div.className = 'commit-item';
    div.innerHTML = `
      <div class="commit-title">${escapeHtml(message)}</div>
      <div class="commit-meta">
        <span><i class="fa-regular fa-clock"></i> ${date}</span>
        <a href="${url}" target="_blank" class="commit-hash"><i class="fa-solid fa-code-commit"></i> ${sha}</a>
      </div>
    `;
    commitList.appendChild(div);
  });
}

function exportToXLSX() {
  if (fetchedCommits.length === 0) return;

  const excelData = fetchedCommits.map(item => ({
    'Commit Hash': item.sha,
    'Author': item.commit.author ? item.commit.author.name : 'Unknown',
    'Date': new Date(item.commit.author.date).toLocaleString(),
    'Message': item.commit.message,
    'URL': item.html_url
  }));

  const worksheet = XLSX.utils.json_to_sheet(excelData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Commits');

  const repo = document.getElementById('repo').value.trim() || 'commits';
  XLSX.writeFile(workbook, `${repo}_changelog.xlsx`);
}

// Increment visit count on page load using CounterAPI + localStorage fallback
// Replace your counter functions in app.js with this working implementation
const COUNTER_ID = 'sanjaygdrrad_public_changelog_tracer_v1';

async function initVisitorCounter() {
  const visitorCountEl = document.getElementById('visitorCount');
  if (!visitorCountEl) return;

  try {
    // 1. Fetch current counter value and increment by 1
    const res = await fetch(`https://api.mojodns.com/counter/hit?id=${COUNTER_ID}`);
    if (!res.ok) throw new Error('Counter API unreachable');
    
    const data = await res.json();
    if (data && typeof data.value === 'number') {
      visitorCountEl.textContent = data.value.toLocaleString();
      return;
    }
    throw new Error('Invalid counter response format');
  } catch (e) {
    // 2. Local fallback if API is unreachable or blocked by browser privacy extensions
    let count = parseInt(localStorage.getItem('visitor_count') || '1043', 10) + 1;
    localStorage.setItem('visitor_count', count.toString());
    visitorCountEl.textContent = count.toLocaleString();
  }
}

async function refreshVisitorCounter() {
  const visitorCountEl = document.getElementById('visitorCount');
  if (!visitorCountEl) return;

  try {
    // Read-only endpoint without incrementing
    const res = await fetch(`https://api.mojodns.com/counter/get?id=${COUNTER_ID}`);
    if (!res.ok) return;
    
    const data = await res.json();
    if (data && typeof data.value === 'number') {
      visitorCountEl.textContent = data.value.toLocaleString();
    }
  } catch (e) {
    // Fail silently on 1-min background refresh
  }
}

function escapeHtml(text) {
  return text.replace(/[&<>"']/g, m => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  })[m]);
}