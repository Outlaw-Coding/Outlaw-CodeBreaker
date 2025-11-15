// ai.js - AI Communication Module
// Compatible with LM Studio running on localhost:1234
const AI_URL = "http://localhost:1234/v1/chat/completions";

async function askAI(prompt, chatHistory = []) {
  try {
    const messages = [...chatHistory, { role: "user", content: prompt }];
    
    console.log('🤖 Sending request to LM Studio:', {
      url: AI_URL,
      messageCount: messages.length,
      promptLength: prompt.length
    });
    
    const res = await fetch(AI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "local-model",
        messages: messages,
        max_tokens: 4096,
        temperature: 0.7,
        stream: false
      })
    });
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    
    const data = await res.json();
    console.log('✅ Response received from LM Studio');
    return data.choices[0].message.content;
  } catch (e) {
    console.error('❌ AI Error:', e);
    return `[AI OFFLINE: ${e.message}]\n\nMake sure LM Studio is running on localhost:1234`;
  }
}