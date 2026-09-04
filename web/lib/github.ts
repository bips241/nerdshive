/**
 * GitHub API Helper & Proof-of-Work Stats Aggregator
 * Provides cached lookups for public repositories, star counts, and verified language distributions.
 */

export interface GitHubStats {
  username: string;
  publicRepos: number;
  followers: number;
  totalStars: number;
  topLanguages: string[];
  featuredRepos: Array<{
    name: string;
    description: string;
    stars: number;
    forks: number;
    language: string;
    url: string;
  }>;
}

export function extractGitHubUsername(repoOrProfileUrl?: string): string | null {
  if (!repoOrProfileUrl) return null;
  const clean = repoOrProfileUrl.trim().replace(/^https?:\/\//, '').replace(/^www\./, '');
  if (!clean.includes('github.com')) return null;

  const parts = clean.split('github.com/')[1]?.split('/');
  if (parts && parts[0]) {
    return parts[0].trim();
  }
  return null;
}

export async function fetchGitHubProofOfWork(repoOrProfileUrl?: string): Promise<GitHubStats | null> {
  const username = extractGitHubUsername(repoOrProfileUrl);
  if (!username) return null;

  try {
    const headers: HeadersInit = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'NerdShive-Platform',
    };

    // 1. Fetch user summary
    const userRes = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, {
      headers,
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!userRes.ok) {
      return null;
    }
    const userData = await userRes.json();

    // 2. Fetch top repositories
    const reposRes = await fetch(
      `https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=6`,
      {
        headers,
        next: { revalidate: 3600 },
      }
    );

    let featuredRepos: GitHubStats['featuredRepos'] = [];
    let totalStars = 0;
    const languageCounts: { [key: string]: number } = {};

    if (reposRes.ok) {
      const reposData = await reposRes.json();
      if (Array.isArray(reposData)) {
        featuredRepos = reposData.map((repo: any) => {
          const stars = repo.stargazers_count || 0;
          totalStars += stars;
          if (repo.language) {
            languageCounts[repo.language] = (languageCounts[repo.language] || 0) + 1;
          }
          return {
            name: repo.name,
            description: repo.description || 'Open source project repository',
            stars,
            forks: repo.forks_count || 0,
            language: repo.language || 'Code',
            url: repo.html_url,
          };
        });
      }
    }

    const topLanguages = Object.entries(languageCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([lang]) => lang);

    return {
      username: userData.login,
      publicRepos: userData.public_repos || 0,
      followers: userData.followers || 0,
      totalStars,
      topLanguages,
      featuredRepos,
    };
  } catch (error) {
    console.error('GitHub API error:', error);
    return null;
  }
}
