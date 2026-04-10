
import { supabase } from './supabaseService';

export interface GroqResponse {
  text: string;
  error?: string;
}

export async function generateWithGroq(prompt: string, model: string = "llama-3.3-70b-versatile"): Promise<string> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    // Implement a 30-second client-side timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch('/api/ai/groq', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`
      },
      body: JSON.stringify({ prompt, model }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorMessage = `API Error: ${response.status}`;
      try {
        const text = await response.text();
        // If it's an HTML response (like Cloudflare 504), don't show the whole HTML
        if (text.includes('<!DOCTYPE html>') || text.includes('<html')) {
          errorMessage = `Server Error (${response.status}): The request timed out or the server is busy. Please try again in a moment.`;
        } else {
          try {
            const errorData = JSON.parse(text);
            errorMessage = errorData.error || errorMessage;
          } catch (e) {
            console.error("Non-JSON error response:", text);
            errorMessage = `Server error (${response.status})`;
          }
        }
      } catch (e) {
        // Ignore text parsing error
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data.reply || "No response generated.";
  } catch (error: any) {
    console.error("Error generating with Groq:", error);
    throw error;
  }
}

export async function* generateWithGroqStream(prompt: string, model: string = "llama-3.3-70b-versatile"): AsyncGenerator<string> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch('/api/ai/groq', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`
      },
      body: JSON.stringify({ prompt, model, stream: true }),
    });

    if (!response.ok) {
      let errorMessage = `API Error: ${response.status}`;
      try {
        const text = await response.text();
        try {
          const errorData = JSON.parse(text);
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          console.error("Non-JSON error response:", text);
          errorMessage = `Server error (${response.status})`;
        }
      } catch (e) {
        // Ignore text parsing error
      }
      throw new Error(errorMessage);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No reader available");

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.trim() === "") continue;
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') return;
          try {
            const parsed = JSON.parse(data);
            if (parsed.text) yield parsed.text;
          } catch (e) {
            console.error("Error parsing SSE data:", e);
          }
        }
      }
    }
  } catch (error: any) {
    console.error("Error in Groq stream:", error);
    throw error;
  }
}
