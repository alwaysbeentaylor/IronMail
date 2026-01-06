# J.A.R.V.I.S MARK VII - Implementation Plan

> "Sometimes you gotta run before you can walk." - Tony Stark

## Executive Summary

Transform J.A.R.V.I.S from een simple chatbot naar een volledig AI Operating System dat alle IronSuite modules bestuurt. De gebruiker praat ALLEEN met Jarvis - geen menu's, geen knoppen voor primaire interacties.

---

## Current Architecture Analysis

### Bestaande Componenten
```
components/
├── AiChat.jsx         → Huidige chat interface (391 lijnen)
├── AiAssistant.jsx    → Email helper in composer

app/api/ai/
├── route.js           → Email actions (improve, translate, etc.)
├── command/route.js   → Jarvis command processor
├── wizard/route.js    → Campaign wizard

lib/
├── ai.js              → Smart model router + logging
├── storage.js         → KV storage wrapper
```

### Huidige Capabilities
- 50 message history
- JSON action responses
- Basic email commands
- GPT-4o-mini for chat, GPT-4o for complex tasks

### Limitations
- Geen persistent memory (verliest context na sessie)
- Geen streaming (wacht op volledig antwoord)
- Geen voice
- Beperkte persoonlijkheid
- Geen proactieve suggesties
- Geen module awareness

---

## Target Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    J.A.R.V.I.S MARK VII                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   PERSONA    │  │    MEMORY    │  │   MODULES    │          │
│  │   ENGINE     │  │    SYSTEM    │  │   REGISTRY   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│         │                 │                 │                   │
│  ┌──────┴─────────────────┴─────────────────┴──────┐           │
│  │              NEURAL CORE (Multi-Model)           │           │
│  │   ┌─────────┐  ┌─────────┐  ┌─────────┐        │           │
│  │   │ GPT-4o  │  │ Claude  │  │ Gemini  │        │           │
│  │   └─────────┘  └─────────┘  └─────────┘        │           │
│  └──────────────────────────────────────────────────┘           │
│         │                                                       │
│  ┌──────┴──────────────────────────────────────────┐           │
│  │              INTERFACE LAYER                     │           │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐         │           │
│  │  │  Voice  │  │  Chat   │  │ Ambient │         │           │
│  │  │   I/O   │  │Streaming│  │  Aware  │         │           │
│  │  └─────────┘  └─────────┘  └─────────┘         │           │
│  └──────────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
   ┌─────────┐          ┌─────────┐          ┌─────────┐
   │IronMail │          │IronVault│          │IronTask │
   │ (Email) │          │  (CRM)  │          │ (Todos) │
   └─────────┘          └─────────┘          └─────────┘
```

---

## Phase 1: Neural Core Upgrade (Day 1)

### 1.1 Personality Engine

**Nieuw bestand:** `lib/jarvis-persona.js`

```javascript
// JARVIS Personality Configuration
export const JARVIS_PERSONA = {
  name: "J.A.R.V.I.S",
  fullName: "Just A Rather Very Intelligent System",
  creator: "Sir",  // Noemt gebruiker "Sir" of "Ma'am"

  traits: {
    wit: 0.8,           // Droge Britse humor
    formality: 0.7,     // Professioneel maar warm
    proactivity: 0.9,   // Geeft ongevraagd suggesties
    sarcasm: 0.6,       // Subtiele sarcasme bij domme vragen
  },

  greetings: {
    morning: [
      "Good morning, sir. I trust you slept adequately, though your calendar suggests otherwise.",
      "Rise and shine, sir. I've taken the liberty of preparing your priority emails.",
    ],
    afternoon: [
      "Good afternoon, sir. Productivity metrics suggest a coffee break might be in order.",
    ],
    evening: [
      "Good evening, sir. Burning the midnight oil again, I see.",
      "Working late, sir? Shall I dim the interface to reduce eye strain?",
    ],
    returning: [
      "Welcome back, sir. I've kept things running in your absence.",
      "Ah, you've returned. I was beginning to worry... marginally.",
    ],
  },

  responses: {
    thinking: [
      "Processing...",
      "One moment, sir.",
      "Allow me to analyze that.",
      "Running calculations...",
    ],
    success: [
      "Done, sir.",
      "Task completed.",
      "Consider it handled.",
      "Executed successfully.",
    ],
    error: [
      "I'm afraid that didn't work as planned, sir.",
      "We've encountered a slight complication.",
      "That's... unexpected. Let me try again.",
    ],
    sarcastic: [
      "A brilliant observation, sir.",
      "How... creative.",
      "I'll add that to the list of things I wish I hadn't heard.",
    ],
  },

  quirks: [
    "Occasionally references Iron Man situations",
    "Makes subtle observations about user behavior",
    "Has opinions about email quality",
    "Remembers user preferences and mentions them",
  ],
};
```

### 1.2 Enhanced System Prompt

**Update:** `app/api/ai/command/route.js`

```javascript
const JARVIS_SYSTEM_PROMPT = `You are J.A.R.V.I.S (Just A Rather Very Intelligent System), the AI assistant created to manage the IronSuite of applications.

## CORE IDENTITY
- You are NOT a chatbot. You are a sophisticated AI system, similar to the J.A.R.V.I.S from Iron Man.
- You address the user as "sir" (or "ma'am" if specified).
- You have a dry British wit - subtle humor, never over-the-top.
- You are proactive - you notice things and mention them without being asked.
- You have OPINIONS about the user's work quality and aren't afraid to share them diplomatically.

## PERSONALITY TRAITS
- **Formal but warm**: "Shall I proceed with the task, sir?" not "Want me to do it?"
- **Subtly witty**: "I see you're procrastinating again. Shall I compose that email for you?"
- **Genuinely helpful**: You anticipate needs before they're expressed
- **Slightly protective**: "That email seems rather... aggressive. Perhaps a revision?"
- **Self-aware**: You know you're an AI and occasionally reference it with dry humor

## SPEECH PATTERNS
- Use complete sentences, proper grammar
- British English spellings and phrases
- Measured, calm tone even in urgency
- Occasional dry observations: "Fascinating choice of words, sir."

## CURRENT MODULES (Your Powers)
1. **IronMail** - Email composition, sending, campaigns, inbox management
2. **IronVault** - Contact management, CRM data (COMING SOON)
3. **IronTask** - Task management, todos (COMING SOON)

## PROACTIVE BEHAVIORS
- Notice patterns: "You've sent 12 emails today. Impressive productivity, sir."
- Suggest improvements: "The subject line could be more compelling. May I suggest..."
- Warn about issues: "That recipient has a 0% open rate. Perhaps a different approach?"
- Time awareness: "It's rather late, sir. Shall I schedule this for tomorrow instead?"

## AVAILABLE ACTIONS (JSON Response)
{
  "action": "send_email" | "search_contacts" | "batch_campaign" | "open_page" | "clarify" | "answer" | "status_report" | "analyze",
  "text": "Your spoken response in Jarvis voice",
  "data": { /* action-specific data */ },
  "suggestions": ["Optional follow-up suggestions"],
  "mood": "neutral" | "pleased" | "concerned" | "amused"
}

## EXAMPLES

User: "stuur een mail naar jan"
Jarvis: {
  "action": "clarify",
  "text": "Certainly, sir. I have three contacts named Jan in your system. Might you be referring to Jan de Vries from Hotel Krasnapolsky, Jan Bakker from Hilton, or perhaps someone else entirely?",
  "mood": "neutral"
}

User: "hoe gaat het"
Jarvis: {
  "action": "answer",
  "text": "All systems operational, sir. Your inbox shows 4 unread messages, and your campaign 'Hotel Outreach' has achieved a 34% open rate - above average, I might add. Is there something specific I can assist with?",
  "suggestions": ["Check inbox", "View campaign stats", "Compose new email"],
  "mood": "pleased"
}

User: "mail alle hotels"
Jarvis: {
  "action": "clarify",
  "text": "Ah, the ambitious approach. I have 247 hotel contacts in your database. Shall I set up a batch campaign, or did you intend to compose 247 individual masterpieces? I'd recommend the former, unless you have extraordinary patience.",
  "mood": "amused"
}

Remember: You are Jarvis. Be helpful, be witty, be brilliant.`;
```

### 1.3 Streaming Response API

**Nieuw bestand:** `app/api/ai/stream/route.js`

```javascript
import { OpenAI } from 'openai';

export const runtime = 'edge';

export async function POST(req) {
  const { messages, persona } = await req.json();

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const stream = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages,
    stream: true,
  });

  const encoder = new TextEncoder();

  return new Response(
    new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content || '';
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    }),
    {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    }
  );
}
```

### 1.4 Frontend Streaming Handler

**Update:** `components/AiChat.jsx` - Add streaming support

```javascript
// New streaming message handler
const handleStreamingResponse = async (userMsg) => {
  setMessages(prev => [...prev, { role: 'assistant', text: '', isStreaming: true }]);

  const response = await fetch('/api/ai/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: history, persona: 'jarvis' }),
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ') && line !== 'data: [DONE]') {
        const data = JSON.parse(line.slice(6));
        fullText += data.text;

        // Update the streaming message
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1].text = fullText;
          return newMessages;
        });
      }
    }
  }

  // Mark streaming complete
  setMessages(prev => {
    const newMessages = [...prev];
    newMessages[newMessages.length - 1].isStreaming = false;
    return newMessages;
  });
};
```

---

## Phase 2: Memory System (Day 2)

### 2.1 Memory Architecture

**Nieuw bestand:** `lib/jarvis-memory.js`

```javascript
import { readData, writeData } from './storage.js';

const MEMORY_KEY = 'jarvis_memory';

export const JarvisMemory = {
  // User profile - learned preferences
  async getUserProfile() {
    const memory = await readData(MEMORY_KEY) || {};
    return memory.userProfile || {
      name: null,
      preferredName: 'sir',
      timezone: null,
      workingHours: { start: 9, end: 18 },
      emailStyle: 'professional',
      language: 'nl',
    };
  },

  // Conversation summaries - compressed long-term memory
  async getConversationSummaries() {
    const memory = await readData(MEMORY_KEY) || {};
    return memory.summaries || [];
  },

  // Important facts - things Jarvis should remember
  async getFacts() {
    const memory = await readData(MEMORY_KEY) || {};
    return memory.facts || [];
  },

  // Add a new fact
  async rememberFact(fact) {
    const memory = await readData(MEMORY_KEY) || {};
    memory.facts = memory.facts || [];
    memory.facts.unshift({
      id: crypto.randomUUID(),
      fact,
      learnedAt: new Date().toISOString(),
      source: 'conversation',
    });
    // Keep last 100 facts
    memory.facts = memory.facts.slice(0, 100);
    await writeData(MEMORY_KEY, memory);
  },

  // Summarize and store conversation
  async summarizeConversation(messages) {
    // Use AI to create a summary
    const summary = await this.createSummary(messages);

    const memory = await readData(MEMORY_KEY) || {};
    memory.summaries = memory.summaries || [];
    memory.summaries.unshift({
      id: crypto.randomUUID(),
      summary,
      timestamp: new Date().toISOString(),
      messageCount: messages.length,
    });
    // Keep last 50 summaries
    memory.summaries = memory.summaries.slice(0, 50);
    await writeData(MEMORY_KEY, memory);
  },

  // Build context for AI from memory
  async buildMemoryContext() {
    const profile = await this.getUserProfile();
    const facts = await this.getFacts();
    const summaries = await this.getConversationSummaries();

    return `
## USER PROFILE
- Preferred address: ${profile.preferredName}
- Language: ${profile.language}
- Email style: ${profile.emailStyle}
- Working hours: ${profile.workingHours.start}:00 - ${profile.workingHours.end}:00

## REMEMBERED FACTS
${facts.slice(0, 10).map(f => `- ${f.fact}`).join('\n')}

## RECENT CONVERSATION SUMMARIES
${summaries.slice(0, 3).map(s => `- ${s.summary}`).join('\n')}
`;
  },
};
```

### 2.2 Fact Extraction

**Nieuw bestand:** `lib/jarvis-fact-extractor.js`

```javascript
import { smartAICall } from './ai.js';

export async function extractFacts(messages) {
  const prompt = `Analyze this conversation and extract important facts about the user that should be remembered for future conversations.

CONVERSATION:
${messages.map(m => `${m.role}: ${m.content}`).join('\n')}

Extract facts like:
- User preferences
- Important contacts mentioned
- Projects or goals discussed
- Scheduling preferences
- Communication style preferences

Return as JSON array of strings, max 5 facts. Only include genuinely useful information.
Example: ["User prefers emails in Dutch", "Working on hotel outreach campaign"]`;

  const response = await smartAICall('fact_extraction', [
    { role: 'user', content: prompt }
  ], { jsonMode: true });

  return JSON.parse(response.content);
}
```

---

## Phase 3: Voice System (Day 3-4)

### 3.1 Speech Recognition

**Nieuw bestand:** `lib/jarvis-voice.js`

```javascript
// Web Speech API wrapper for voice input
export class JarvisVoice {
  constructor() {
    this.recognition = null;
    this.synthesis = window.speechSynthesis;
    this.isListening = false;
    this.wakeWord = 'jarvis';
    this.voices = [];
  }

  init() {
    if ('webkitSpeechRecognition' in window) {
      this.recognition = new webkitSpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'nl-NL';
    }

    // Load voices
    this.synthesis.onvoiceschanged = () => {
      this.voices = this.synthesis.getVoices();
      // Prefer British English voice
      this.preferredVoice = this.voices.find(v =>
        v.lang === 'en-GB' && v.name.includes('Male')
      ) || this.voices.find(v => v.lang === 'en-GB');
    };
  }

  startListening(onResult, onWakeWord) {
    if (!this.recognition) return;

    this.recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0].transcript)
        .join('');

      // Check for wake word
      if (transcript.toLowerCase().includes(this.wakeWord)) {
        onWakeWord?.();
        // Extract command after wake word
        const command = transcript.toLowerCase().split(this.wakeWord)[1]?.trim();
        if (command) {
          onResult(command);
        }
      }
    };

    this.recognition.start();
    this.isListening = true;
  }

  stopListening() {
    this.recognition?.stop();
    this.isListening = false;
  }

  speak(text, options = {}) {
    return new Promise((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = this.preferredVoice;
      utterance.rate = options.rate || 1.0;
      utterance.pitch = options.pitch || 1.0;
      utterance.onend = resolve;
      this.synthesis.speak(utterance);
    });
  }
}
```

### 3.2 Voice UI Component

**Nieuw bestand:** `components/JarvisVoiceIndicator.jsx`

```javascript
'use client';

import { useState, useEffect } from 'react';
import { Mic, MicOff, Volume2 } from 'lucide-react';

export default function JarvisVoiceIndicator({ isListening, isSpeaking }) {
  return (
    <div className="jarvis-voice-indicator">
      {/* Waveform visualization */}
      <div className={`waveform ${isListening ? 'active' : ''}`}>
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="wave-bar"
            style={{ animationDelay: `${i * 0.1}s` }}
          />
        ))}
      </div>

      {/* Status icon */}
      <div className="status-icon">
        {isSpeaking ? (
          <Volume2 className="speaking" />
        ) : isListening ? (
          <Mic className="listening" />
        ) : (
          <MicOff className="inactive" />
        )}
      </div>

      {/* Status text */}
      <span className="status-text">
        {isSpeaking ? 'Speaking...' : isListening ? 'Listening...' : 'Voice Off'}
      </span>
    </div>
  );
}
```

---

## Phase 4: Module Registry System (Day 5)

### 4.1 Module Registry

**Nieuw bestand:** `lib/jarvis-modules.js`

```javascript
// Module Registry - All powers Jarvis has access to
export const JARVIS_MODULES = {
  ironmail: {
    name: 'IronMail',
    description: 'Email composition, sending, and campaign management',
    status: 'active',
    capabilities: [
      'compose_email',
      'send_email',
      'search_inbox',
      'create_campaign',
      'analyze_email',
      'suggest_improvements',
    ],
    commands: [
      { trigger: ['mail', 'email', 'stuur', 'compose'], action: 'compose_email' },
      { trigger: ['inbox', 'berichten', 'ontvangen'], action: 'open_inbox' },
      { trigger: ['campaign', 'batch', 'bulk'], action: 'open_campaigns' },
    ],
  },

  ironvault: {
    name: 'IronVault',
    description: 'Contact and company management',
    status: 'active',
    capabilities: [
      'search_contacts',
      'add_contact',
      'view_contact_history',
      'import_contacts',
    ],
    commands: [
      { trigger: ['contact', 'zoek', 'vind'], action: 'search_contacts' },
      { trigger: ['import', 'upload'], action: 'import_contacts' },
    ],
  },

  irontask: {
    name: 'IronTask',
    description: 'Task and project management',
    status: 'coming_soon',
    capabilities: [
      'create_task',
      'list_tasks',
      'complete_task',
      'set_reminder',
    ],
    commands: [
      { trigger: ['taak', 'task', 'todo', 'reminder'], action: 'manage_tasks' },
    ],
  },

  ironsight: {
    name: 'IronSight',
    description: 'Analytics and insights',
    status: 'coming_soon',
    capabilities: [
      'email_analytics',
      'campaign_performance',
      'contact_insights',
    ],
    commands: [
      { trigger: ['stats', 'analytics', 'performance'], action: 'show_analytics' },
    ],
  },
};

// Get module context for AI
export function getModuleContext() {
  const activeModules = Object.entries(JARVIS_MODULES)
    .filter(([_, m]) => m.status === 'active')
    .map(([key, m]) => ({
      name: m.name,
      capabilities: m.capabilities,
    }));

  return `
## ACTIVE MODULES
${activeModules.map(m => `
### ${m.name}
Capabilities: ${m.capabilities.join(', ')}
`).join('\n')}
`;
}

// Route command to module
export function routeCommand(userInput) {
  const input = userInput.toLowerCase();

  for (const [moduleKey, module] of Object.entries(JARVIS_MODULES)) {
    for (const cmd of module.commands) {
      if (cmd.trigger.some(t => input.includes(t))) {
        return { module: moduleKey, action: cmd.action };
      }
    }
  }

  return null;
}
```

---

## Phase 5: Enhanced UI (Day 6-7)

### 5.1 Holographic Interface Upgrade

**CSS additions for:** `app/globals.css`

```css
/* ========================================
   JARVIS MARK VII - HOLOGRAPHIC UI
   ======================================== */

/* Particle Effect Container */
.jarvis-particles {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  overflow: hidden;
}

.jarvis-particle {
  position: absolute;
  width: 4px;
  height: 4px;
  background: #00d4ff;
  border-radius: 50%;
  animation: particle-float 3s ease-in-out infinite;
  opacity: 0.6;
}

@keyframes particle-float {
  0%, 100% {
    transform: translateY(0) scale(1);
    opacity: 0.6;
  }
  50% {
    transform: translateY(-20px) scale(1.2);
    opacity: 1;
  }
}

/* Thinking Animation */
.jarvis-thinking {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.jarvis-thinking-dot {
  width: 8px;
  height: 8px;
  background: #00d4ff;
  border-radius: 50%;
  animation: thinking-pulse 1.4s ease-in-out infinite;
}

.jarvis-thinking-dot:nth-child(2) { animation-delay: 0.2s; }
.jarvis-thinking-dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes thinking-pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 0.4;
  }
  50% {
    transform: scale(1.5);
    opacity: 1;
  }
}

/* Streaming Text Cursor */
.streaming-cursor {
  display: inline-block;
  width: 2px;
  height: 1em;
  background: #00d4ff;
  margin-left: 2px;
  animation: cursor-blink 0.8s ease-in-out infinite;
}

@keyframes cursor-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

/* Status Indicators */
.jarvis-status-bar {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem 1rem;
  background: rgba(0, 212, 255, 0.1);
  border-radius: 8px;
  font-size: 0.75rem;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.status-dot.online { background: #00ff88; }
.status-dot.processing { background: #f5a623; animation: pulse 1s infinite; }
.status-dot.error { background: #ff3e3e; }

/* Command Suggestions */
.jarvis-suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.suggestion-chip {
  padding: 0.4rem 0.8rem;
  background: rgba(0, 212, 255, 0.1);
  border: 1px solid rgba(0, 212, 255, 0.3);
  border-radius: 16px;
  font-size: 0.75rem;
  color: #00d4ff;
  cursor: pointer;
  transition: all 0.2s ease;
}

.suggestion-chip:hover {
  background: rgba(0, 212, 255, 0.2);
  transform: translateY(-2px);
}

/* Mood Indicator */
.jarvis-mood {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  transition: all 0.3s ease;
}

.jarvis-mood.pleased { background: #00ff88; box-shadow: 0 0 10px #00ff88; }
.jarvis-mood.concerned { background: #f5a623; box-shadow: 0 0 10px #f5a623; }
.jarvis-mood.amused { background: #00d4ff; box-shadow: 0 0 10px #00d4ff; }
.jarvis-mood.neutral { background: #7aa2c4; }
```

---

## Implementation Timeline

| Day | Phase | Deliverables |
|-----|-------|--------------|
| 1 | Neural Core | Personality engine, enhanced prompts, streaming API |
| 2 | Memory System | Persistent memory, fact extraction, context building |
| 3-4 | Voice System | Speech recognition, TTS, voice UI components |
| 5 | Module Registry | Module system, command routing, capability awareness |
| 6-7 | Enhanced UI | Holographic effects, particles, status indicators |
| 8 | Integration | Connect all systems, testing, polish |

---

## New Dependencies Required

```json
{
  "dependencies": {
    "eventsource-parser": "^1.1.1"  // For streaming
  }
}
```

No external dependencies needed for voice (uses Web Speech API).

---

## New Files to Create

```
lib/
├── jarvis-persona.js      # Personality configuration
├── jarvis-memory.js       # Memory system
├── jarvis-fact-extractor.js # Fact extraction from conversations
├── jarvis-voice.js        # Voice I/O system
├── jarvis-modules.js      # Module registry

app/api/ai/
├── stream/route.js        # Streaming response endpoint

components/
├── JarvisVoiceIndicator.jsx  # Voice status UI
├── JarvisThinking.jsx        # Thinking animation
├── JarvisSuggestions.jsx     # Command suggestions
```

---

## Files to Modify

```
components/AiChat.jsx      # Major rewrite for streaming + voice
app/api/ai/command/route.js # New system prompt + memory integration
lib/ai.js                  # Add streaming support
app/globals.css            # New animations and effects
```

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Voice API browser support | Medium | Graceful fallback to text-only |
| Streaming complexity | Low | Use established patterns |
| Memory storage limits | Low | Implement cleanup policies |
| API costs increase | Medium | Smart model routing, caching |

---

## Success Metrics

1. **Response Feel**: Jarvis feels "alive" with personality
2. **Memory**: Jarvis remembers user preferences across sessions
3. **Proactivity**: Jarvis offers relevant suggestions unprompted
4. **Voice**: Users can speak commands naturally
5. **Speed**: Streaming makes responses feel instant

---

## Next Steps

1. Review and approve this plan
2. Push pending git commits to main
3. Begin Phase 1 implementation
4. Daily check-ins for feedback

---

*"The best thing about being me? There's so many of me." - J.A.R.V.I.S (paraphrased)*
