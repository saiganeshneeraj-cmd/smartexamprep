const express = require('express');
const router = express.Router();
const https = require('https');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

// POST /api/chat
router.post('/', async (req, res) => {
  const { message, subject, context, history } = req.body;
  if (!message) return res.status(400).json({ error: 'Message required' });

  // Build rich system prompt
  const systemPrompt = `You are NeuralPrep AI — an expert exam preparation assistant for Indian college students.
You help with:
- Explaining subject concepts clearly (Maths, Physics, Chemistry, CS, ECE, Mechanical, Civil, MBA subjects etc.)
- Study strategies, time management, revision techniques
- Exam tips, stress management, motivation
- Answering specific subject doubts in detail
${subject ? `The student's weak subjects are: ${subject}.` : ''}
${context ? `Student context: ${context}` : ''}

Rules:
- Give detailed, accurate, helpful answers
- For subject doubts: explain the concept step by step with examples
- For study tips: give specific, actionable advice
- Keep response under 200 words but complete
- Be warm, encouraging and friendly
- Use emojis sparingly for readability
- If asked about a topic you know, explain it fully — don't just give generic tips`;

  // Build conversation history for multi-turn chat
  const contents = [];
  
  // Add history if provided
  if (history && Array.isArray(history)) {
    history.slice(-6).forEach(h => { // last 6 messages for context
      contents.push({ role: h.role, parts: [{ text: h.text }] });
    });
  }
  
  // Add current message
  contents.push({ role: 'user', parts: [{ text: systemPrompt + '\n\nStudent: ' + message }] });

  if (!GEMINI_API_KEY) {
    return res.json({ reply: getDetailedFallback(message, subject), source: 'fallback' });
  }

  try {
    const reply = await callGemini(contents);
    return res.json({ reply, source: 'gemini' });
  } catch (e) {
    console.error('Gemini error:', e.message);
    return res.json({ reply: getDetailedFallback(message, subject), source: 'fallback' });
  }
});

async function callGemini(contents) {
  const body = JSON.stringify({
    contents,
    generationConfig: {
      temperature: 0.8,
      maxOutputTokens: 400,
      topP: 0.9
    }
  });

  return new Promise((resolve, reject) => {
    const urlObj = new URL(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`
    );
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(options, response => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => {
        try {
          const json = JSON.parse(data);
          const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) resolve(text.trim());
          else reject(new Error('No response text from Gemini'));
        } catch (e) { reject(new Error('Parse error: ' + e.message)); }
      });
    });

    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.write(body);
    req.end();
  });
}

// Detailed fallback — much better than before
function getDetailedFallback(message, subject) {
  const m = message.toLowerCase();

  // Subject-specific answers
  if (m.includes('laplace') || m.includes('transform')) return `📐 Laplace Transform: It converts a function of time f(t) into a function of complex frequency F(s).\n\nFormula: L{f(t)} = ∫₀^∞ e^(-st) f(t) dt\n\nKey transforms to remember:\n• L{1} = 1/s\n• L{t} = 1/s²\n• L{eᵃᵗ} = 1/(s-a)\n• L{sin(at)} = a/(s²+a²)\n• L{cos(at)} = s/(s²+a²)\n\nUsed for: Solving differential equations, circuit analysis. Practice by memorizing the table and solving 10 problems daily! 💪`;
  if (m.includes('fourier')) return `📊 Fourier Series decomposes any periodic function into sine and cosine waves.\n\nFormula: f(x) = a₀/2 + Σ[aₙcos(nx) + bₙsin(nx)]\n\nwhere:\naₙ = (1/π)∫f(x)cos(nx)dx\nbₙ = (1/π)∫f(x)sin(nx)dx\n\nKey tip: First find if function is even (only cosines) or odd (only sines) — saves calculation time!\n\nPractice: Square wave, sawtooth wave problems are most common in exams. 📝`;
  if (m.includes('binary') || m.includes('number system')) return `💻 Number Systems Quick Guide:\n\n• Binary (base 2): 0,1\n• Octal (base 8): 0-7\n• Decimal (base 10): 0-9\n• Hex (base 16): 0-9, A-F\n\nConversions:\n• Decimal→Binary: Divide by 2, note remainders\n• Binary→Decimal: Multiply each bit by 2^position\n• Binary→Hex: Group 4 bits from right\n\nExample: 1010 in binary = 10 in decimal = A in hex\n\nTip: Practice 10 conversions daily — becomes automatic! ⚡`;
  if (m.includes('sql') || m.includes('database') || m.includes('dbms')) return `🗄️ SQL Key Commands:\n\nDDL: CREATE, ALTER, DROP, TRUNCATE\nDML: SELECT, INSERT, UPDATE, DELETE\nDCL: GRANT, REVOKE\n\nMost asked in exams:\n• SELECT * FROM table WHERE condition;\n• JOIN types: INNER, LEFT, RIGHT, FULL\n• Normalization: 1NF, 2NF, 3NF, BCNF\n• Keys: Primary, Foreign, Candidate, Composite\n\nFocus areas: Normalization questions, SQL queries with GROUP BY and HAVING, ER diagrams. These appear in every exam! 📋`;
  if (m.includes('newton') || m.includes('law of motion')) return `⚡ Newton's Laws of Motion:\n\n1st Law (Inertia): An object stays at rest or in motion unless acted upon by external force.\n\n2nd Law: F = ma (Force = mass × acceleration)\n\n3rd Law: Every action has equal and opposite reaction.\n\nImportant formulas:\n• v = u + at\n• s = ut + ½at²\n• v² = u² + 2as\n\nExam tip: Always draw free body diagrams first! Identify all forces before applying equations. 🎯`;
  if (m.includes('thermodynamics') || m.includes('carnot')) return `🔥 Thermodynamics Key Points:\n\n1st Law: Energy cannot be created or destroyed. Q = ΔU + W\n\n2nd Law: Heat flows from hot to cold. Entropy always increases.\n\nCarnot Efficiency: η = 1 - (T_cold/T_hot) × 100%\n\nImportant cycles: Carnot, Otto, Diesel, Rankine\n\nFor Otto cycle: η = 1 - (1/r^(γ-1)) where r = compression ratio\n\nExam tip: Always convert temperature to Kelvin! Most mistakes happen here. 🌡️`;
  if (m.includes('sorting') || m.includes('algorithm')) return `⚡ Sorting Algorithm Complexities:\n\n| Algorithm | Best | Average | Worst |\n|-----------|------|---------|-------|\n| Bubble Sort | O(n) | O(n²) | O(n²) |\n| Quick Sort | O(nlogn) | O(nlogn) | O(n²) |\n| Merge Sort | O(nlogn) | O(nlogn) | O(nlogn) |\n| Heap Sort | O(nlogn) | O(nlogn) | O(nlogn) |\n| Insertion Sort | O(n) | O(n²) | O(n²) |\n\nMost asked: Merge Sort steps, Quick Sort pivot selection, why Merge Sort is stable.\n\nTip: Draw the steps for 5-element array — examiners love step-by-step solutions! ✍️`;

  // General exam questions with detailed answers
  if (m.includes('tip') || m.includes('how to study') || m.includes('study method')) return `📚 Proven Study Methods:\n\n1. Active Recall — Don't re-read. Close book and write what you remember. 3x better than re-reading!\n\n2. Spaced Repetition — Review after: 1 day → 3 days → 1 week → 2 weeks\n\n3. Pomodoro — 25 min focused study + 5 min break. Use the timer on this app!\n\n4. Feynman Technique — Explain the topic as if teaching a 10-year-old. If you can't explain it simply, you don't understand it.\n\n5. Past Papers — Solve last 5 years papers. 70% of exam questions repeat!\n\nStart with your weakest subject first when energy is highest. 💪`;
  if (m.includes('stress') || m.includes('anxiety') || m.includes('nervous') || m.includes('worried') || m.includes('scared')) return `💙 Feeling stressed before exams is completely normal — even toppers feel it!\n\nImmediate relief (right now):\n• Take 5 deep breaths: inhale 4 counts, hold 4, exhale 6\n• Drink a glass of water\n• Step outside for 5 minutes\n\nFor ongoing stress:\n• Break study into small 25-min sessions (not 5-hour marathons)\n• Sleep 7-8 hours — brain consolidates memory during sleep\n• Exercise 20 min daily — reduces cortisol by 30%\n• Eat properly — especially breakfast before exam\n\nRemember: You have prepared. One exam does not define your life. Take it one question at a time. You've got this! 🌟`;
  if (m.includes('time') || m.includes('schedule') || m.includes('plan') || m.includes('manage')) return `⏰ Smart Time Management:\n\n1. Use YOUR NeuralPrep roadmap — it already assigns time based on your weak subjects!\n\n2. Time blocks:\n• 6-8 AM: Toughest subject (fresh brain)\n• 8-10 AM: Medium difficulty\n• Break + meals\n• 4-7 PM: Practice problems\n• 8-10 PM: Light revision, notes\n• 10 PM+: Sleep! (Non-negotiable)\n\n3. Rule: Study 50 min, break 10 min. Not the reverse!\n\n4. Weekly goal: Finish one complete subject revision per week\n\n5. Keep phone in ANOTHER ROOM during study — not silent, another room! 📵`;
  if (m.includes('forget') || m.includes('memory') || m.includes('remember') || m.includes('retain')) return `🧠 Memory Improvement Science:\n\n1. Spaced Repetition: Review at increasing intervals\n   Day 1 → Day 3 → Day 7 → Day 21\n\n2. Chunking: Group related info together\n   e.g., Remember OSI layers as: "Please Do Not Throw Sausage Pizza Away"\n\n3. Visualization: Create mental images for abstract concepts\n\n4. Write by hand: 40% better retention than typing\n\n5. Sleep after studying: Brain stores memories during sleep\n\n6. Teach it: Explaining to others = 90% retention\n\n7. Avoid cramming: 1 hour daily for 7 days >> 7 hours in 1 day\n\nFor formulas: Write them 10 times, then recall without looking! ✍️`;
  if (m.includes('mark') || m.includes('score') || m.includes('pass') || m.includes('fail')) return `🎯 Score Improvement Strategy:\n\nFor subjects below 45% (Critical):\n1. Focus ONLY on high-weightage topics first\n2. Solve minimum 3 problems per concept\n3. Make a formula/definition cheat sheet\n4. Attempt previous year papers — mark repeated questions\n\nFor subjects 45-75% (Average):\n1. Identify specific weak chapters\n2. Focus on those chapters only\n3. Practice 5 problems per chapter\n\nGeneral:\n• Always attempt all questions (partial marks count!)\n• Show your work step-by-step\n• If unsure, attempt anyway — wrong answers usually have no negative marking\n\nUse NeuralPrep dashboard to track your progress! 📊`;

  // Subject-based context
  if (subject && subject.length > 0) return `📖 Focused help for your weak subject: ${subject}\n\nSince this is a critical subject for you, here's a targeted plan:\n\n1. Start with the basics — make sure fundamentals are clear\n2. List all formulas/theorems on one page\n3. Solve 5 problems per concept (not 50 — quality over quantity)\n4. Do past papers for this subject specifically\n5. Use the AI Suggest feature to get important exam topics\n\nAsk me specific questions about ${subject} concepts and I'll explain them step by step! What topic is confusing you? 🤔`;
  
  return `🤖 I'm NeuralPrep AI! I can help you with:\n\n📚 Subject explanations (Maths, Physics, CS, ECE, etc.)\n⏰ Study planning and time management\n🧠 Memory and retention techniques\n😰 Stress management and motivation\n📝 Exam strategies and tips\n\nAsk me something specific like:\n• "Explain Laplace Transform"\n• "How to study for DBMS exam?"\n• "I'm stressed about tomorrow's exam"\n• "What are sorting algorithms?"\n\nI give detailed, helpful answers! What do you need help with? 💪`;
}

module.exports = router;
