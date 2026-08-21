// The org handle this site's own git history is hosted under —
// confirmed directly from real "Merge pull request #N from
// Sports-Analytics-Club-at-UTD/..." commit messages in this project's
// git log, not guessed. If this org is ever renamed, or if the club's
// actual GitHub presence turns out to be a personal account rather
// than an organization, this is the one place to update — see the
// 404 error message below for exactly what to change in that case.
const GITHUB_ORG = "Sports-Analytics-Club-at-UTD";

/**
 * Public, unauthenticated GitHub REST API call. Deliberately NOT
 * routed through shared/apiClient.js's apiFetch — that helper is
 * specific to OUR Django backend (different base URL, attaches our
 * own auth token). This talks directly to GitHub instead, and needs
 * no authentication for public repo listings.
 *
 * Unauthenticated GitHub API requests are rate-limited to 60/hour per
 * IP — fine for a low-traffic club site, but worth knowing if this
 * page ever starts erroring under real load.
 */
export async function listOrgRepos() {
  const response = await fetch(
    `https://api.github.com/orgs/${GITHUB_ORG}/repos?sort=updated&per_page=100`
  );

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(
        `GitHub org "${GITHUB_ORG}" not found. If the club's repos actually ` +
          `live under a personal GitHub account rather than an organization, ` +
          `update GITHUB_ORG in src/portfolio/githubClient.js and change the ` +
          `URL below from /orgs/{org}/repos to /users/{username}/repos.`
      );
    }
    if (response.status === 403) {
      throw new Error("GitHub API rate limit reached — try again in a bit.");
    }
    throw new Error(`GitHub API request failed (status ${response.status}).`);
  }

  return response.json();
}