
/**
 * Utility to handle fetch responses and ensure JSON or clear error message.
 */
export async function handleFetchResponse(response: Response) {
  const contentType = response.headers.get('content-type');
  const text = await response.text();
  
  let data;
  if (contentType && contentType.includes('application/json')) {
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error('Failed to parse JSON response:', text);
      throw new Error(`Invalid JSON response from server: ${text.substring(0, 100)}...`);
    }
  } else {
    // Non-JSON response (likely a 500 error page from Vercel/Nginx)
    console.error('Non-JSON response received:', text);
    throw new Error(`Server error (${response.status}): ${text.substring(0, 200)}...`);
  }
  
  if (!response.ok) {
    throw new Error(data.message || data.error || `Request failed with status ${response.status}`);
  }
  
  return data;
}
