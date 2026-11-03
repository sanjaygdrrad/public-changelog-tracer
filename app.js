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
async function initVisitorCounter() {
  try {
    const res = await fetch(`https://api.counterapi.dev/v1/${COUNTER_NAMESPACE}/${COUNTER_KEY}/up`);
    if (!res.ok) throw new Error('API failed');
    const data = await res.json();
    if (data && data.count !== undefined) {
      document.getElementById('visitorCount').textContent = data.count.toLocaleString();
      return;
    }
  } catch (e) {
    // Fallback: Local Storage Counter if remote API fails
    let localCount = parseInt(localStorage.getItem('page_visits') || '1042', 10) + 1;
    localStorage.setItem('page_visits', localCount);
    document.getElementById('visitorCount').textContent = localCount.toLocaleString();
  }
}

// Read-only refresh every 1 minute
async function refreshVisitorCounter() {
  try {
    const res = await fetch(`https://api.counterapi.dev/v1/${COUNTER_NAMESPACE}/${COUNTER_KEY}`);
    if (!res.ok) throw new Error('API failed');
    const data = await res.json();
    if (data && data.count !== undefined) {
      document.getElementById('visitorCount').textContent = data.count.toLocaleString();
    }
  } catch (e) {
    // Fail silently on background refresh
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
// let fetchedCommits = [];

// document.addEventListener('DOMContentLoaded', () => {
//   // Set default dates (past 30 days to today)
//   const today = new Date();
//   const past30 = new Date();
//   past30.setDate(today.getDate() - 30);

//   document.getElementById('toDate').value = today.toISOString().split('T')[0];
//   document.getElementById('fromDate').value = past30.toISOString().split('T')[0];

//   document.getElementById('fetchBtn').addEventListener('click', fetchCommits);
//   document.getElementById('exportBtn').addEventListener('click', exportToXLSX);

//   // Initialize Visitor Counter via CountAPI
//   loadVisitorCount();
// });

// async function fetchCommits() {
//   const username = document.getElementById('username').value.trim();
//   const repo = document.getElementById('repo').value.trim();
//   const fromDate = document.getElementById('fromDate').value;
//   const toDate = document.getElementById('toDate').value;
//   const statusMsg = document.getElementById('statusMessage');
//   const commitList = document.getElementById('commitList');
//   const exportBtn = document.getElementById('exportBtn');

//   if (!username || !repo) {
//     statusMsg.textContent = 'Please provide both username and repository name.';
//     return;
//   }

//   statusMsg.textContent = 'Fetching commits from GitHub...';
//   commitList.innerHTML = '';
//   exportBtn.style.display = 'none';

//   let url = `https://api.github.com/repos/${username}/${repo}/commits?per_page=100`;
//   if (fromDate) url += `&since=${new Date(fromDate).toISOString()}`;
//   if (toDate) {
//     const endOfDay = new Date(toDate);
//     endOfDay.setHours(23, 59, 59, 999);
//     url += `&until=${endOfDay.toISOString()}`;
//   }

//   try {
//     const response = await fetch(url);
//     if (!response.ok) {
//       throw new Error(`GitHub API error: ${response.statusText} (${response.status})`);
//     }

//     const data = await response.json();
    
//     // Filter commits by author username if specified
//     fetchedCommits = data.filter(item => {
//       const authorLogin = item.author ? item.author.login.toLowerCase() : '';
//       return !username || authorLogin === username.toLowerCase();
//     });

//     if (fetchedCommits.length === 0) {
//       statusMsg.textContent = `No commits found for author "${username}" in the selected date range.`;
//       return;
//     }

//     statusMsg.textContent = `Found ${fetchedCommits.length} commit(s) by ${username}`;
//     exportBtn.style.display = 'inline-flex';

//     renderCommits(fetchedCommits);
//   } catch (err) {
//     statusMsg.textContent = `Error: ${err.message}`;
//   }
// }

// function renderCommits(commits) {
//   const commitList = document.getElementById('commitList');
//   commitList.innerHTML = '';

//   commits.forEach(item => {
//     const message = item.commit.message.split('\n')[0];
//     const date = new Date(item.commit.author.date).toLocaleString();
//     const sha = item.sha.substring(0, 7);
//     const url = item.html_url;

//     const div = document.createElement('div');
//     div.className = 'commit-item';
//     div.innerHTML = `
//       <div class="commit-title">${escapeHtml(message)}</div>
//       <div class="commit-meta">
//         <span><i class="fa-regular fa-clock"></i> ${date}</span>
//         <a href="${url}" target="_blank" class="commit-hash"><i class="fa-solid fa-code-commit"></i> ${sha}</a>
//       </div>
//     `;
//     commitList.appendChild(div);
//   });
// }

// function exportToXLSX() {
//   if (fetchedCommits.length === 0) return;

//   const excelData = fetchedCommits.map(item => ({
//     'Commit Hash': item.sha,
//     'Author': item.commit.author.name,
//     'Date': new Date(item.commit.author.date).toLocaleString(),
//     'Message': item.commit.message,
//     'URL': item.html_url
//   }));

//   const worksheet = XLSX.utils.json_to_sheet(excelData);
//   const workbook = XLSX.utils.book_new();
//   XLSX.utils.book_append_sheet(workbook, worksheet, 'Commits');

//   const repo = document.getElementById('repo').value.trim() || 'commits';
//   XLSX.writeFile(workbook, `${repo}_changelog.xlsx`);
// }

// // failureproof, zero-config Visitor Counter logic
// const COUNTER_NAMESPACE = 'sanjaygdrrad_public_changelog';
// const COUNTER_KEY = 'visits';

// async function initVisitorCounter() {
//   try {
//     // Uses countapi.com (reliable v1 endpoint)
//     const res = await fetch(`https://api.countapi.xyz/hit/${COUNTER_NAMESPACE}/${COUNTER_KEY}`);
//     const data = await res.json();
//     if (data && data.value) {
//       document.getElementById('visitorCount').textContent = data.value.toLocaleString();
//     } else {
//       throw new Error('Invalid response');
//     }
//   } catch (e) {
//     // Client-side fallback stored in localStorage so it still increments for you locally!
//     let localCount = parseInt(localStorage.getItem('page_visits') || '1042', 10) + 1;
//     localStorage.setItem('page_visits', localCount);
//     document.getElementById('visitorCount').textContent = localCount.toLocaleString();
//   }
// }

// async function refreshVisitorCounter() {
//   try {
//     const res = await fetch(`https://api.countapi.xyz/get/${COUNTER_NAMESPACE}/${COUNTER_KEY}`);
//     const data = await res.json();
//     if (data && data.value) {
//       document.getElementById('visitorCount').textContent = data.value.toLocaleString();
//     }
//   } catch (e) {
//     // Fail silently on background refresh
//   }
// }

// // EVERY 1 MINUTE: Read current total without incrementing using /read
// async function readVisitorCount() {
//   try {
//     const res = await fetch(`https://api.counterapi.dev/v1/${COUNTER_NAMESPACE}/${COUNTER_KEY}`);
//     if (!res.ok) throw new Error('API request failed');
//     const data = await res.json();

//     if (data && data.count !== undefined) {
//       document.getElementById('visitorCount').textContent = data.count.toLocaleString();
//     }
//   } catch (err) {
//     // Fail silently on background auto-refresh
//   }
// }

// function escapeHtml(text) {
//   return text.replace(/[&<>"']/g, m => ({
//     '&': '&amp;',
//     '<': '&lt;',
//     '>': '&gt;',
//     '"': '&quot;',
//     "'": '&#039;'
//   })[m]);
// }


// const form = document.getElementById("search-form");
// const statusEl = document.getElementById("status");
// const resultsEl = document.getElementById("results");

// form.addEventListener("submit", async (e) => {
//   e.preventDefault();
//   resultsEl.innerHTML = "";
//   statusEl.textContent = "Fetching…";

//   let username = document.getElementById("username").value.trim();
//   let repoInput = document.getElementById("repo").value.trim();
//   const since = document.getElementById("since").value; // YYYY-MM-DD
//   const until = document.getElementById("until").value;

//   // Allow "owner/repo" or just "repo" (assume same owner)
//   let owner, repo;
//   if (repoInput.includes("/")) {
//     [owner, repo] = repoInput.split("/");
//   } else {
//     owner = username;
//     repo = repoInput;
//   }

//   // GitHub API uses ISO dates; we take the whole day
//   const sinceISO = since + "T00:00:00Z";
//   const untilISO = until + "T23:59:59Z";

//   try {
//     const commits = await fetchAllCommits(owner, repo, username, sinceISO, untilISO);
//     statusEl.textContent = `Found ${commits.length} commit(s) by ${username}`;
//     renderCommits(commits);
//   } catch (err) {
//     statusEl.textContent = "Error: " + err.message;
//   }
// });

// async function fetchAllCommits(owner, repo, author, since, until) {
//   const all = [];
//   let page = 1;
//   const perPage = 100;

//   while (true) {
//     const url = new URL(`https://api.github.com/repos/${owner}/${repo}/commits`);
//     url.searchParams.set("author", author);
//     url.searchParams.set("since", since);
//     url.searchParams.set("until", until);
//     url.searchParams.set("per_page", perPage);
//     url.searchParams.set("page", page);

//     const res = await fetch(url, {
//       headers: {
//         "Accept": "application/vnd.github+json",
//         // Optional: add a personal access token later to raise rate limit
//         // "Authorization": "Bearer YOUR_TOKEN"
//       }
//     });

//     if (!res.ok) {
//       const body = await res.json().catch(() => ({}));
//       throw new Error(body.message || res.statusText);
//     }

//     const data = await res.json();
//     if (data.length === 0) break;

//     all.push(...data);
//     if (data.length < perPage) break;
//     page++;
//   }
//   return all;
// }

// function renderCommits(commits) {
//   resultsEl.innerHTML = commits.map(c => {
//     const date = new Date(c.commit.author.date).toLocaleString();
//     const msg = c.commit.message.split("\n")[0];
//     return `
//       <div class="commit">
//         <time>${date}</time><br>
//         <strong>${msg}</strong><br>
//         <a href="${c.html_url}" target="_blank" rel="noopener">${c.sha.slice(0, 7)}</a>
//       </div>
//     `;
//   }).join("");
// }