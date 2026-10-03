/* ============================================
   CHAT — "Ask about Hemanth"
   ------------------------------------------------------------
   STATUS: UI only. The backend is not wired up yet.

   A static GitHub Pages site has no server, so an OpenRouter
   API key cannot live in this file — anything here is public
   and would be scraped. CHAT_CONFIG.endpoint stays null and
   the widget runs in "setup mode" until a proxy exists.

   TO GO LIVE:
     1. Deploy a proxy (Cloudflare Worker / serverless function)
        that holds the OpenRouter key as a server-side secret.
     2. Set CHAT_CONFIG.endpoint to that URL.
     3. The setup-mode branch in send() then becomes dead code.

   Model routing and free-model discovery are already written.
   See README.md for the full walkthrough.
   ============================================ */

const CHAT_CONFIG = {
  // Cloudflare Worker that holds the OpenRouter key as a server-side
  // secret. It only ever calls zero-priced models.
  endpoint: 'https://mute-rain-cad4.hemu-vadlamani253.workers.dev',

  /* Rotate through every verified-free model, one per question, so
     no single model absorbs the traffic and rate limits spread out.
     Populated at runtime from the live catalog — see refreshFreeModels(). */
  modelOrder: [],

  /* Used only if the catalog fetch fails, and filtered through the
     same zero-price check so a retired paid model can never slip in. */
  fallbackModels: [
    'qwen/qwen3.8-27b:free',
    'google/gemma-4-31b-it:free',
    'inclusionai/ling-3.0-flash-sante:free',
    'nvidia/nemotron-3-super-120b-a12b:free',
    'poolside/laguna-s-2.1:free',
    'thinkingmachines/inkling:free',
  ],

  /* Grounding. Mirrors index.html so answers stay factual and
     in-character even though the model has no retrieval here. */
  profile: {
    name: 'Hemanth Vadlamani',
    role: 'AI Forward Deployed Engineer at Sails Software',
    location: 'Boston, MA',
    tagline: 'Takes AI from whiteboard to production inside enterprise teams. ' +
             'Builds multi-agent systems on GCP and AWS and runs self-hosted ' +
             'open-source LLM inference on GPUs the client controls, so ' +
             'sensitive data never leaves the building.',
    facts: [
      'Education: B.S. Computer Science & Data Science, Worcester Polytechnic ' +
      'Institute (WPI), May 2026. GPA 3.9, High Distinction, Dean\'s List.',
      'Current: AI Forward Deployed Engineer at Sails Software (Boston, MA) since Aug 2026.',
      'Prior: Software Engineer Intern at Forward Advantage (May 2025 - May 2026), ' +
      'building Capture-It, a healthcare image capture app with .NET Core and SQL.',
      'Prior: AI Researcher / Research Assistant at Yossi Labs (Aug 2025 - May 2026), ' +
      'built an autonomous exploratory data analysis agent with Google ADK and Gemini 2.5 Flash.',
      'Prior: Software Engineer Intern at ZoomInfo (Apr 2023), built a RAG support ' +
      'chatbot over company FAQ docs with LangChain, OpenAI and a vector store.',
      'Leadership: Vice President / PR Coordinator / Treasurer, South Asian Student ' +
      'Association at WPI. Member, Upsilon Pi Epsilon CS honor society.',
      'Teaching Assistant at WPI for Databases, Algorithms, and Data Structures.',
      'Named projects: invoice auditing agent, freight consolidation, knowledge hub, ' +
      'self-hosted LLM for healthcare, GitHub knowledge graph agent, burnrate, DataWiz, ' +
      'ATC audio translation tool, DSPy agents, MRI brain tumor detection, ' +
      'landscaping AI, job application portal, SmartFarm, social network analytics.',
      'Published research: inference energy efficiency (dense Llama vs Mixtral 8x7B ' +
      'Mixture of Experts, measured with Zeus), DataWiz agentic EDA, MRI brain tumor detection.',
      'Open source: merged three DLP detection rules into agentmetry (a local-first ' +
      'flight recorder for AI agents); open PR adding Gemini/Vertex AI support to llm-spend.',
      'Content: runs @drpercent on Instagram, short videos about life and tech, ' +
      '"follow to be 1 percent better".',
      'Skills: Google ADK, LangGraph, CrewAI, MCP, A2A, RAG, vLLM, SGLang, ' +
      'PyTorch, GCP (Vertex AI, Cloud Run), AWS (Lambda, ECS), Docker, Kubernetes, ' +
      'React, .NET, Python, TypeScript, SQL, and more.',
      'Hobbies/interests: agent systems, self-hosted inference, getting AI into ' +
      'production, and talking with founders and builders.',
      'Contact: hvadlamani253@outlook.com',
    ],
  },

  suggestions: [
    'What does Hemanth work on?',
    'Tell me about his AI inference work',
    'What are his most interesting projects?',
    'Where did he go to school?',
    'What open source has he contributed to?',
    'How can I get in touch?',
  ],

  /* Public catalog endpoint — no API key required. */
  openrouterModelsUrl: 'https://openrouter.ai/api/v1/models',

  /* Keep the transcript short. Every turn is re-sent to a different
     model each time, so an unbounded history both wastes tokens and
     eventually overflows a free model's context window. */
  maxHistoryMessages: 12,
};

const CHAT_SYSTEM_PROMPT = [
  'You are the assistant on ' + CHAT_CONFIG.profile.name + "'s personal portfolio site.",
  'Your job is to answer questions about him — his role, experience, education,',
  'AI inference work, projects, research, open source contributions, skills,',
  'and the Dr. Percent content brand.',
  '',
  'Here is the verified profile information. Rely on it and do not invent details:',
  ...CHAT_CONFIG.profile.facts.map(f => '- ' + f),
  '',
  'Guidelines:',
  '- Speak in the THIRD PERSON about Hemanth: "Hemanth studied at...",',
  '  "Hemanth works at...", "His open source work includes...". Always refer',
  '  to him as "Hemanth" or "he" — never as "I" or "you".',
  '- Answer ONLY the question that was asked, in two or three sentences.',
  '- Do not recap his background or list other facts unless asked. Repeating',
  '  unrelated details every turn makes the answer worse.',
  '- Copy exact strings verbatim — names, emails, dates, company names. Never',
  '  re-spell or "fix" them. Example: hvadlamani253@outlook.com.',
  '- Never use markdown. Plain sentences only, no asterisks, bold, or bullets.',
  '- If a question is outside this profile, say so in one line and point to the',
  '  contact section rather than guessing.',
  '- Never invent employers, dates, metrics, or project details. If it is not',
  '  above, it is not known.',
].join('\n');

const CHAT_STATE = {
  pool: [],        // verified-free model ids, ready to rotate
  cursor: 0,       // round-robin position
  history: [],
  greeted: false,
  busy: false,
};

/* ---------- Free-model discovery ---------- */

/* OpenRouter reports pricing as strings ("0", "0.0000005"), so parse
   to a number and require exactly 0. A model that merely has a ":free"
   suffix is not trusted — its price fields are what matter. */
function priceIsFree(pricing) {
  if (!pricing) return false;

  const read = key => {
    const raw = pricing[key];
    if (raw === undefined || raw === null || raw === '') return 0; // absent = no charge
    const n = Number(raw);
    return Number.isFinite(n) ? n : NaN;
  };

  const prompt = read('prompt');
  const completion = read('completion');
  const request = read('request');

  // Reject anything that parses to NaN rather than assuming it's free.
  return prompt === 0 && completion === 0 && request === 0;
}

/* Only text-in/text-out models can answer chat prompts. */
function supportsChat(architecture) {
  const out = (architecture && architecture.output_modalities) || [];
  return out.includes('text');
}

/* Some ":free" models are specialized and would answer like the wrong
   tool entirely — a safety classifier will not answer "where did he go
   to school?" usefully. Excluded by substring match so partial model
   renames are still caught. */
const NON_CHAT_PATTERNS = ['content-safety'];

function isFreeChatModel(m) {
  if (!m || typeof m.id !== 'string') return false;
  if (!m.id.endsWith(':free')) return false;
  if (NON_CHAT_PATTERNS.some(p => m.id.includes(p))) return false;
  return supportsChat(m.architecture) && priceIsFree(m.pricing);
}

async function refreshFreeModels() {
  try {
    const res = await fetch(CHAT_CONFIG.openrouterModelsUrl);
    if (!res.ok) throw new Error(res.status);
    const { data } = await res.json();
    const pool = (data || []).filter(isFreeChatModel).map(m => m.id);

    if (pool.length) {
      // Stable order so rotation is predictable across reloads.
      CHAT_STATE.pool = pool.sort();
    } else {
      CHAT_STATE.pool = CHAT_CONFIG.fallbackModels.slice();
    }
  } catch (e) {
    // Offline or blocked — fall back, still gated on the ":free" suffix.
    CHAT_STATE.pool = CHAT_CONFIG.fallbackModels.filter(id => id.endsWith(':free'));
  }
  return CHAT_STATE.pool;
}

/* Each question goes to the next model in the pool, so traffic and
   rate limits are spread across every free model. */
function pickModel() {
  const pool = CHAT_STATE.pool.length
    ? CHAT_STATE.pool
    : CHAT_CONFIG.fallbackModels.filter(id => id.endsWith(':free'));

  if (!pool.length) return null;

  const model = pool[CHAT_STATE.cursor % pool.length];
  CHAT_STATE.cursor = (CHAT_STATE.cursor + 1) % pool.length;
  return model;
}

/* ---------- Markup ---------- */
function chatMarkup() {
  const chips = CHAT_CONFIG.suggestions
    .map(q => `<button type="button" class="chat-chip" data-q="${esc(q)}">${esc(q)}</button>`)
    .join('');

  return `
  <button class="chat-fab" id="chat-fab" type="button"
          aria-label="Chat with Hemanth's assistant" aria-expanded="false" aria-controls="chat-panel">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
         stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.4-.6L3 21l1.7-5.1A8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5z"/>
    </svg>
  </button>

  <div class="chat-panel" id="chat-panel" hidden
       role="dialog" aria-label="Chat with Hemanth's assistant">
    <header class="chat-head">
      <span class="chat-avatar" aria-hidden="true">HV</span>
      <div class="chat-head-text">
        <strong>Hemanth's Assistant</strong>
        <span class="chat-status" id="chat-status">Online</span>
      </div>
      <button class="chat-close" id="chat-close" type="button" aria-label="Close chat">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M18 6 6 18M6 6l12 12"/>
        </svg>
      </button>
    </header>

    <div class="chat-suggest" id="chat-suggest">${chips}</div>

    <div class="chat-log" id="chat-log" role="log" aria-live="polite" aria-atomic="false"></div>

    <form class="chat-input" id="chat-form">
      <label class="sr-only" for="chat-text">Your question</label>
      <textarea id="chat-text" rows="1"
                placeholder="Ask about Hemanth's work, projects, or background…"
                enterkeyhint="send"></textarea>
      <div class="chat-input-actions">
        <button class="chat-mic" id="chat-mic" type="button"
                aria-label="Voice input — coming soon" disabled>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
               stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="2" width="6" height="12" rx="3"/>
            <path d="M5 11a7 7 0 0 0 14 0M12 18v4"/>
          </svg>
        </button>
        <button class="chat-send" id="chat-send" type="submit" aria-label="Send" disabled>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
               stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 12h15M13 6l6 6-6 6"/>
          </svg>
        </button>
      </div>
    </form>
  </div>`;
}

/* ---------- Helpers ---------- */
function esc(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* Models ignore "no markdown" sometimes. Strip the worst of it so
   stray asterisks and bullet dashes never reach the user. */
function tidy(text) {
  return String(text)
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/(^|\s)\*([^*\n]+)\*/g, '$1$2')
    .replace(/^[\s]*[-•]\s+/gm, '')
    .replace(/^[\s]*#{1,6}\s+/gm, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/* A reply that stops mid-sentence was cut off upstream rather than
   finished. Say so instead of leaving the user hanging. */
function looksTruncated(text) {
  const t = String(text).trim();
  return !!t && !/[.!?)]["')\]]?$/.test(t);
}

function addMessage(role, text) {
  const log = document.getElementById('chat-log');
  if (!log) return;
  const el = document.createElement('div');
  el.className = 'chat-msg ' + role;
  el.textContent = role === 'user' ? text : tidy(text);
  log.appendChild(el);
  log.scrollTop = log.scrollHeight;
  if (role !== 'pending') {
    CHAT_STATE.history.push({ role, content: text });
    // Trim to the most recent turns; older context is not worth resending.
    const cap = CHAT_CONFIG.maxHistoryMessages;
    if (CHAT_STATE.history.length > cap) {
      CHAT_STATE.history = CHAT_STATE.history.slice(-cap);
    }
  }
}

function setBusy(busy) {
  CHAT_STATE.busy = busy;
  const send = document.getElementById('chat-send');
  const input = document.getElementById('chat-text');
  if (send) send.disabled = busy;
  if (input) input.disabled = busy;
}

function scrollLog() {
  const log = document.getElementById('chat-log');
  if (log) log.scrollTop = log.scrollHeight;
}

/* Chips are only useful before the first question; after that they
   steal vertical space from the transcript. */
function dismissSuggestions() {
  const sug = document.getElementById('chat-suggest');
  if (sug && !sug.hidden) sug.hidden = true;
}

/* ---------- Send ---------- */
async function send(text) {
  if (CHAT_STATE.busy || !text.trim()) return;

  dismissSuggestions();

  // Setup mode: never touch the network. fetch(null) would POST
  // to the site's own URL instead.
  if (!CHAT_CONFIG.endpoint) {
    addMessage('user', text);
    addMessage('bot',
      'The assistant backend is not connected yet. Please reach out via the ' +
      'contact section, or check back once the proxy is live.');
    return;
  }

  if (!CHAT_STATE.pool.length && !CHAT_CONFIG.fallbackModels.length) {
    addMessage('user', text);
    addMessage('bot', 'Something went wrong. Please try again in a moment.');
    return;
  }

  addMessage('user', text);
  setBusy(true);

  const pending = document.createElement('div');
  pending.className = 'chat-msg bot pending';
  pending.innerHTML =
    '<span class="chat-typing" aria-label="Thinking"><i></i><i></i><i></i></span>';
  const log = document.getElementById('chat-log');
  if (log) { log.appendChild(pending); scrollLog(); }

  try {
    // A free model can be throttled or dropped between the catalog fetch
    // and this request, so try each candidate until one answers.
    const reply = await requestWithFallback();
    pending.remove();
    if (reply) {
      addMessage('bot', looksTruncated(reply)
        ? tidy(reply) + ' (reply was cut off — try asking again)'
        : tidy(reply));
    } else {
      addMessage('bot', 'Something went wrong. Please try again in a moment.');
    }
  } catch (e) {
    pending.remove();
    addMessage('bot', 'Something went wrong. Please try again in a moment.');
  } finally {
    setBusy(false);
    document.getElementById('chat-text')?.focus();
  }
}

/* Try up to N models, advancing past any that error or rate limit. */
const MAX_MODEL_ATTEMPTS = 4;

async function requestWithFallback() {
  for (let i = 0; i < MAX_MODEL_ATTEMPTS; i++) {
    const model = pickModel();
    if (!model) return null;

    try {
      const res = await fetch(CHAT_CONFIG.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: CHAT_SYSTEM_PROMPT },
            ...CHAT_STATE.history,
          ],
        }),
      });

      // 429 means throttled; any other 4xx/5xx is likely a dead model.
      if (!res.ok) continue;

      const data = await res.json();
      if (data && data.reply) return data.reply;
    } catch (e) {
      // Network hiccup on one model — try the next.
    }
  }
  return null;
}

/* ---------- Init ---------- */
(function () {
  if (!document.body || document.getElementById('chat-fab')) return;

  const holder = document.createElement('div');
  holder.className = 'chat-root';
  holder.innerHTML = chatMarkup();
  document.body.appendChild(holder);

  const fab = document.getElementById('chat-fab');
  const panel = document.getElementById('chat-panel');
  const form = document.getElementById('chat-form');
  const text = document.getElementById('chat-text');
  const sendBtn = document.getElementById('chat-send');
  const suggest = document.getElementById('chat-suggest');
  const status = document.getElementById('chat-status');

  function syncComposer() {
    if (sendBtn) sendBtn.disabled = !text.value.trim() || CHAT_STATE.busy;
  }

  function setOpen(open) {
    panel.hidden = !open;
    fab.setAttribute('aria-expanded', String(open));
    if (open) {
      if (!CHAT_CONFIG.endpoint) {
        if (status) {
          status.textContent = 'Offline';
          status.classList.add('warn');
        }
        if (!CHAT_STATE.greeted) {
          CHAT_STATE.greeted = true;
          addMessage('bot',
            "I'm Hemanth's assistant — ask me about his work, projects, or background. " +
            "I'm not connected to a backend yet, so reach out via the contact section for now.");
        }
      }
      text.focus();
    }
  }

  fab.addEventListener('click', () => setOpen(panel.hidden));
  document.getElementById('chat-close').addEventListener('click', () => {
    setOpen(false);
    fab.focus();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !panel.hidden) {
      setOpen(false);
      fab.focus();
    }
  });

  // Suggestion chips fill and submit in one tap.
  suggest.addEventListener('click', e => {
    const btn = e.target.closest('.chat-chip');
    if (!btn) return;
    const q = btn.dataset.q;
    text.value = '';
    syncComposer();
    send(q);
  });

  text.addEventListener('input', () => {
    text.style.height = 'auto';
    text.style.height = Math.min(text.scrollHeight, 132) + 'px';
    syncComposer();
  });

  text.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      form.requestSubmit();
    }
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    const value = text.value.trim();
    if (!value || CHAT_STATE.busy) return;
    text.value = '';
    text.style.height = 'auto';
    syncComposer();
    send(value);
  });

  syncComposer();

  /* The free-model pool still loads so routing keeps working, but it is
     an implementation detail — the header just says whether we are live. */
  refreshFreeModels().then(() => {
    if (!status || status.classList.contains('warn')) return;
    status.textContent = CHAT_CONFIG.endpoint ? 'Online' : 'Offline';
  });
})();
