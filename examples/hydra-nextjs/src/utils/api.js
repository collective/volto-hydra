export async function fetchContent(apiPath, { token = null, path = '' } = {}) {
    // Construct the full URL
    const url = `${apiPath}/++api++/${path ? `${path}` : ''}`;
  
    // Set up the headers
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  
    try {
      const response = await fetch(url, { headers });
      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      // console.error('Failed to fetch content:', error);
      // throw error;
    }
  }
  