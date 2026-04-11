/**
 * Vercel serverless: POST to dispatch GitHub Actions workflow_dispatch.
 * Env (Vercel → Settings → Environment Variables):
 *   GITHUB_TOKEN — fine-grained PAT with Contents + Actions (workflow dispatch)
 *   GITHUB_REPO — optional, default "rastog18/JobFilter"
 *   GITHUB_WORKFLOW_FILE — optional, default "refresh-ranked-jobs.yml"
 *   TRIGGER_SECRET — optional; if set, client must send header x-trigger-secret with same value
 */
module.exports = async (req, res) => {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  // Quick check that this function deployed (open in browser while debugging).
  if (req.method === "GET") {
    res.status(200).json({
      ok: true,
      hasGithubToken: Boolean(process.env.GITHUB_TOKEN),
      triggerSecretRequired: Boolean(process.env.TRIGGER_SECRET),
      repo: process.env.GITHUB_REPO || "rastog18/JobFilter",
      workflow: process.env.GITHUB_WORKFLOW_FILE || "refresh-ranked-jobs.yml",
      usage: "POST this URL to queue workflow_dispatch (see README).",
    });
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  const expected = process.env.TRIGGER_SECRET;
  if (expected) {
    const got = req.headers["x-trigger-secret"];
    if (got !== expected) {
      res.status(401).json({ ok: false, error: "Unauthorized" });
      return;
    }
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    res.status(503).json({
      ok: false,
      error: "GITHUB_TOKEN is not set. Add it in Vercel project env vars.",
    });
    return;
  }

  const repo = process.env.GITHUB_REPO || "rastog18/JobFilter";
  const workflowFile = process.env.GITHUB_WORKFLOW_FILE || "refresh-ranked-jobs.yml";
  const ref = process.env.GITHUB_WORKFLOW_REF || "main";

  const [owner, repoName] = repo.split("/");
  if (!owner || !repoName) {
    res.status(500).json({ ok: false, error: "Invalid GITHUB_REPO (expected owner/name)" });
    return;
  }

  const url = `https://api.github.com/repos/${owner}/${repoName}/actions/workflows/${encodeURIComponent(
    workflowFile
  )}/dispatches`;

  const gh = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      "User-Agent": "jobfilter-vercel-trigger",
    },
    body: JSON.stringify({ ref }),
  });

  if (gh.status !== 204) {
    const text = await gh.text();
    let detail = text;
    try {
      const j = JSON.parse(text);
      if (j && j.message) detail = j.message;
    } catch {
      /* keep raw */
    }
    res.status(gh.status >= 400 ? gh.status : 502).json({
      ok: false,
      error: detail || `GitHub API error (${gh.status})`,
      github_status: gh.status,
    });
    return;
  }

  res.status(200).json({ ok: true, message: "Workflow dispatch queued" });
};
