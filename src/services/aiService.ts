
import { supabase } from './supabaseService';

export async function getSleepRecommendation(userData: string): Promise<string> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    // Implement a 30-second client-side timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch('/api/ai/sleep-advice', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`
      },
      body: JSON.stringify({ 
        prompt: `Analyze this sleep data and provide recommendations: ${userData}. Provide a concise analysis including overview, insights, recommendations, and tomorrow's optimization plan.` 
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorText = "";
      try {
        const text = await response.text();
        if (text.includes('<!DOCTYPE html>') || text.includes('<html')) {
          errorText = `Server Error (${response.status}): The request timed out or the server is busy. Please try again in a moment.`;
        } else {
          try {
            const json = JSON.parse(text);
            errorText = json.message || json.error || `API Error: ${response.status}`;
          } catch {
            errorText = text.slice(0, 100) || `API Error: ${response.status}`;
          }
        }
      } catch {
        errorText = `API Error: ${response.status}`;
      }
      console.error('API Error:', response.status, errorText);
      throw new Error(errorText);
    }

    let data;
    const responseText = await response.text();
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse JSON response:', responseText);
      throw new Error('Received an invalid response from the server. Please try again.');
    }
    
    if (Array.isArray(data) && data[0]?.generated_text) {
      return data[0].generated_text;
    }
    
    return data.error || "No recommendation generated.";
  } catch (error) {
    console.error("Error generating recommendation:", error);
    throw error;
  }
}
