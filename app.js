const form = document.getElementById("search-form");
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  resultsEl.innerHTML = "";
  statusEl.textContent = "Fetching…";

  let username = document.getElementById("username").value.trim();
  let repoInput = document.getElementById("repo").value.trim();
  const since = document.getElementById("since").value; // YYYY-MM-DD
  const until = document.getElementById("until").value;

  // Allow "owner/repo" or just "repo" (assume same owner)
  let owner, repo;
  if (repoInput.includes("/")) {
    [owner, repo] = repoInput.split("/");
  } else {
    owner = username;
    repo = repoInput;
  }

  // GitHub API uses ISO dates; we take the whole day
  const sinceISO = since + "T00:00:00Z";
  const untilISO = until + "T23:59:59Z";

  try {
    const commits = await fetchAllCommits(owner, repo, username, sinceISO, untilISO);
    statusEl.textContent = `Found ${commits.length} commit(s) by ${username}`;
    renderCommits(commits);
  } catch (err) {
    statusEl.textContent = "Error: " + err.message;
  }
});

async function fetchAllCommits(owner, repo, author, since, until) {
  const all = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const url = new URL(`https://api.github.com/repos/${owner}/${repo}/commits`);
    url.searchParams.set("author", author);
    url.searchParams.set("since", since);
    url.searchParams.set("until", until);
    url.searchParams.set("per_page", perPage);
    url.searchParams.set("page", page);

    const res = await fetch(url, {
      headers: {
        "Accept": "application/vnd.github+json",
        // Optional: add a personal access token later to raise rate limit
        // "Authorization": "Bearer YOUR_TOKEN"
      }
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || res.statusText);
    }

    const data = await res.json();
    if (data.length === 0) break;

    all.push(...data);
    if (data.length < perPage) break;
    page++;
  }
  return all;
}

function renderCommits(commits) {
  resultsEl.innerHTML = commits.map(c => {
    const date = new Date(c.commit.author.date).toLocaleString();
    const msg = c.commit.message.split("\n")[0];
    return `
      <div class="commit">
        <time>${date}</time><br>
        <strong>${msg}</strong><br>
        <a href="${c.html_url}" target="_blank" rel="noopener">${c.sha.slice(0, 7)}</a>
      </div>
    `;
  }).join("");
}