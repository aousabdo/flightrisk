import { useState, useCallback } from 'react';

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

const MODELS = {
  'llama-3.3-70b-versatile': 'Llama 3.3 70B (Recommended)',
  'llama-3.1-8b-instant': 'Llama 3.1 8B (Faster)',
};

function getSettings() {
  try {
    const raw = localStorage.getItem('flightrisk-settings');
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

export function useGroq() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [response, setResponse] = useState(null);

  const askGroq = useCallback(async (prompt, context) => {
    const settings = getSettings();
    const apiKey = settings.groqApiKey;
    if (!apiKey) {
      const err = 'Groq API key not configured. Go to Settings to add your key.';
      setError(err);
      throw new Error(err);
    }

    const model = settings.groqModel || 'llama-3.3-70b-versatile';

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const res = await fetch(GROQ_ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content: 'You are an HR analytics expert. Analyze employee data and provide actionable insights. Be concise and specific with numbers. Format your responses with clear structure using bullet points when listing items.',
            },
            {
              role: 'user',
              content: `Context: ${context}\n\nQuestion: ${prompt}`,
            },
          ],
          temperature: 0.3,
          max_tokens: 1024,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error?.message || `API error: ${res.status}`);
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || 'No response received.';
      setResponse(content);
      return content;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const testConnection = useCallback(async () => {
    const settings = getSettings();
    const apiKey = settings.groqApiKey;
    if (!apiKey) throw new Error('No API key configured');

    const model = settings.groqModel || 'llama-3.3-70b-versatile';

    const res = await fetch(GROQ_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'user', content: 'Say "Connection successful!" in exactly those words.' },
        ],
        temperature: 0,
        max_tokens: 20,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error?.message || `API error: ${res.status}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || 'Connected';
  }, []);

  return { askGroq, testConnection, loading, error, response, setError };
}

export { MODELS };
