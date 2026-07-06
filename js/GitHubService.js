/**
 * Helper to encode UTF-8 string to Base64 (supporting Unicode characters)
 * @param {string} str 
 * @returns {string}
 */
function encodeBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Helper to decode Base64 string to UTF-8 (supporting Unicode characters)
 * @param {string} str 
 * @returns {string}
 */
function decodeBase64(str) {
  const binaryString = atob(str.replace(/\s/g, ''));
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new TextDecoder('utf-8').decode(bytes);
}

export class GitHubService {
  /**
   * Helper to construct request headers
   * @param {Object} config 
   * @returns {Object}
   */
  static getHeaders(config) {
    const headers = {
      'Accept': 'application/vnd.github.v3+json',
      'X-GitHub-Api-Version': '2022-11-28'
    };
    if (config.personalAccessToken) {
      headers['Authorization'] = `token ${config.personalAccessToken}`;
    }
    return headers;
  }

  /**
   * Fetch data from the GitHub repository
   * @param {Object} config 
   * @returns {Promise<{data: Object, sha: string|null}>}
   */
  static async getFile(config) {
    const { githubUsername, repoName, branch, filePath } = config;
    if (!githubUsername || !repoName || !config.personalAccessToken) {
      throw new Error('Konfigurasi GitHub tidak lengkap. Silakan isi username, repository name, dan token.');
    }

    const url = `https://api.github.com/repos/${githubUsername}/${repoName}/contents/${filePath}?ref=${branch}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(config),
        cache: 'no-store' // Avoid caching stale data
      });

      if (response.status === 404) {
        // Return default data structure if file doesn't exist
        return {
          data: this.getDefaultData(),
          sha: null
        };
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`GitHub API Error (${response.status}): ${errorText}`);
      }

      const fileInfo = await response.json();
      const decodedContent = decodeBase64(fileInfo.content);
      const parsedData = JSON.parse(decodedContent);

      return {
        data: parsedData,
        sha: fileInfo.sha
      };
    } catch (error) {
      console.error('Error fetching file from GitHub:', error);
      throw error;
    }
  }

  /**
   * Update or create the file in the GitHub repository
   * @param {Object} config 
   * @param {Object} data 
   * @param {string|null} sha 
   * @returns {Promise<string>} The new SHA code of the file
   */
  static async updateFile(config, data, sha) {
    const { githubUsername, repoName, branch, filePath } = config;
    if (!githubUsername || !repoName || !config.personalAccessToken) {
      throw new Error('Konfigurasi GitHub tidak lengkap. Silakan isi username, repository name, dan token.');
    }

    const url = `https://api.github.com/repos/${githubUsername}/${repoName}/contents/${filePath}`;
    const stringifiedData = JSON.stringify(data, null, 2);
    const base64Content = encodeBase64(stringifiedData);

    const body = {
      message: `Update expense tracker data at ${new Date().toISOString()} [skip ci]`,
      content: base64Content,
      branch: branch
    };

    if (sha) {
      body.sha = sha;
    }

    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          ...this.getHeaders(config),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`GitHub API Error (${response.status}): ${errorText}`);
      }

      const resData = await response.json();
      return resData.content.sha;
    } catch (error) {
      console.error('Error updating file on GitHub:', error);
      throw error;
    }
  }

  /**
   * Returns default data structure matching user specification
   * @returns {Object}
   */
  static getDefaultData() {
    return {
      settings: {
        salary: 6000000,
        budgets: {
          tabungan: 3000000,
          kost: 1000000,
          makan: 565000,
          bensin: 130000,
          sabun: 100000,
          jalanjalan: 300000,
          bucin: 500000,
          cadangan: 405000,
          lainlain: 0
        }
      },
      transactions: {}
    };
  }
}
