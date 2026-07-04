'use client';

import { useState, useEffect, useRef } from 'react';

const STEP_LABELS = [
  'Searching Serper.dev for company information',
  'Crawling website pages — home, about, products, contact',
  'Collecting additional information from public sources',
  'Analyzing data with AI via OpenRouter',
  'Generating insights & identifying competitors',
];

const EXAMPLE_COMPANIES = ['notion.so', 'Figma', 'Linear', 'Vercel', 'Stripe'];

const DEFAULT_MODELS = [
  { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
  { id: 'google/gemini-3.5-flash', name: 'Gemini 3.5 Flash' },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini' },
  { id: 'openai/gpt-4o', name: 'GPT-4o' },
  { id: 'anthropic/claude-sonnet-4.5', name: 'Claude Sonnet 4.5' },
  { id: 'anthropic/claude-haiku-4.5', name: 'Claude Haiku 4.5' },
  { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B' },
  { id: 'deepseek/deepseek-chat', name: 'DeepSeek V3' },
  { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1' },
];

function IconSearch() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="M16 16l4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
      <path d="M4 12l6 6L20 6" stroke="#0e1a14" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconCheckGreen() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M4 12l6 6L20 6" stroke="#34d399" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconDownload() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path d="M12 3v13m0 0l-5-5m5 5l5-5M4 20h16" stroke="#1a1206" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconWarning() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M12 9v4m0 4h.01M10.3 3.9L2.7 17.5a1.8 1.8 0 001.55 2.7h15.5a1.8 1.8 0 001.55-2.7L13.7 3.9a1.8 1.8 0 00-3.4 0z" stroke="#6b6f78" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconMenu() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconPlus() {
  return <span className="plus">+</span>;
}

export default function HomePage() {
  const [sidebarTab, setSidebarTab] = useState('api');
  const [orKey, setOrKey] = useState('');
  const [serperKey, setSerperKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('google/gemini-2.5-flash');
  const [models, setModels] = useState(DEFAULT_MODELS);
  const [featuredModels, setFeaturedModels] = useState(DEFAULT_MODELS);
  const [apiSaved, setApiSaved] = useState(false);

  const [botToken, setBotToken] = useState('');
  const [channelId, setChannelId] = useState('');
  const [applicantName, setApplicantName] = useState('');
  const [applicantEmail, setApplicantEmail] = useState('');
  const [discordSaved, setDiscordSaved] = useState(false);

  const [entries, setEntries] = useState([]);
  const [queryInput, setQueryInput] = useState('');
  const [isResearching, setIsResearching] = useState(false);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [showConfigWarning, setShowConfigWarning] = useState(false);

  const contentRef = useRef(null);
  const inputRef = useRef(null);
  const warnTimeoutRef = useRef(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('research-config');
      if (saved) {
        const cfg = JSON.parse(saved);
        if (cfg.orKey) setOrKey(cfg.orKey);
        if (cfg.serperKey) setSerperKey(cfg.serperKey);
        if (cfg.model) setSelectedModel(cfg.model);
        if (cfg.orKey && cfg.serperKey) setApiSaved(true);
      }
      const discord = localStorage.getItem('discord-config');
      if (discord) {
        const dc = JSON.parse(discord);
        if (dc.botToken) setBotToken(dc.botToken);
        if (dc.channelId) setChannelId(dc.channelId);
        if (dc.applicantName) setApplicantName(dc.applicantName);
        if (dc.applicantEmail) setApplicantEmail(dc.applicantEmail);
        if (dc.botToken && dc.channelId) setDiscordSaved(true);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchModels(orKey);
  }, [orKey]);

  async function fetchModels(key) {
    try {
      const headers = {};
      if (key) {
        headers['x-openrouter-key'] = key;
      }
      const res = await fetch('/api/models', { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.featured && data.featured.length > 0) {
          setFeaturedModels(data.featured);
        }
        if (data.models && data.models.length > 0) {
          setModels(data.models);
        }
      }
    } catch {}
  }

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [entries]);

  function handleSaveConfig() {
    if (!orKey.trim() || !serperKey.trim()) return;
    localStorage.setItem('research-config', JSON.stringify({
      orKey: orKey.trim(),
      serperKey: serperKey.trim(),
      model: selectedModel,
    }));
    setApiSaved(true);
  }

  function handleSaveDiscord() {
    localStorage.setItem('discord-config', JSON.stringify({
      botToken: botToken.trim(),
      channelId: channelId.trim(),
      applicantName: applicantName.trim(),
      applicantEmail: applicantEmail.trim(),
    }));
    setDiscordSaved(true);
  }

  function handleNewResearch() {
    setEntries([]);
    setQueryInput('');
    setMobileOpen(false);
  }

  function attemptResearch(rawQuery) {
    const query = (rawQuery || '').trim();
    if (!query || isResearching) return;

    if (!apiSaved || !orKey.trim() || !serperKey.trim()) {
      setShowConfigWarning(true);
      setSidebarTab('api');
      setMobileOpen(true);
      if (warnTimeoutRef.current) clearTimeout(warnTimeoutRef.current);
      warnTimeoutRef.current = setTimeout(() => setShowConfigWarning(false), 3200);
      return;
    }

    startResearch(query);
  }

  async function startResearch(query) {
    const id = Date.now() + '-' + Math.random().toString(36).slice(2, 7);
    const newEntry = {
      id,
      query,
      status: 'researching',
      stepIndex: 0,
      data: null,
      error: null,
      discordStatus: 'idle',
    };

    setEntries(prev => [...prev, newEntry]);
    setQueryInput('');
    setIsResearching(true);
    setMobileOpen(false);

    try {
      const response = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          openrouterKey: orKey.trim(),
          serperKey: serperKey.trim(),
          model: selectedModel,
        }),
      });

      if (!response.ok) {
        throw new Error(`Research failed: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6));
              handleSSEEvent(id, event);
            } catch {}
          }
        }
      }
    } catch (err) {
      updateEntry(id, {
        status: 'error',
        error: err.message || 'Something went wrong. Please try again.',
      });
    } finally {
      setIsResearching(false);
    }
  }

  function handleSSEEvent(id, event) {
    switch (event.type) {
      case 'step':
        updateEntry(id, { stepIndex: event.index });
        break;
      case 'result':
        updateEntry(id, {
          status: 'done',
          data: event.data,
          stepIndex: STEP_LABELS.length,
          discordStatus: 'checking',
        });
        handleDiscordAutoSend(id, event.data);
        break;
      case 'error':
        updateEntry(id, {
          status: 'error',
          error: event.message || 'Research failed.',
        });
        break;
    }
  }

  function updateEntry(id, patch) {
    setEntries(prev =>
      prev.map(e => (e.id === id ? { ...e, ...patch } : e))
    );
  }

  async function handleDiscordAutoSend(entryId, reportData) {
    const isConnected = discordSaved && botToken.trim() && channelId.trim() && applicantName.trim() && applicantEmail.trim();
    if (!isConnected) {
      updateEntry(entryId, { discordStatus: 'not_connected' });
      return;
    }

    updateEntry(entryId, { discordStatus: 'sending' });

    try {
      const { generatePDFBlob } = await import('./lib/pdfGenerator');
      const pdfBase64 = generatePDFBlob(reportData);

      const res = await fetch('/api/discord', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken: botToken.trim(),
          channelId: channelId.trim(),
          applicantName: applicantName.trim(),
          applicantEmail: applicantEmail.trim(),
          companyName: reportData.companyName,
          companyWebsite: reportData.website,
          pdfBase64,
        }),
      });

      if (res.ok) {
        updateEntry(entryId, { discordStatus: 'sent' });
      } else {
        updateEntry(entryId, { discordStatus: 'error' });
      }
    } catch {
      updateEntry(entryId, { discordStatus: 'error' });
    }
  }

  async function handleDownloadPDF(data) {
    try {
      const { generatePDF } = await import('./lib/pdfGenerator');
      generatePDF(data);
    } catch (err) {
      alert('Could not generate PDF: ' + (err.message || err));
    }
  }

  function retryEntry(id) {
    const entry = entries.find(e => e.id === id);
    if (!entry) return;
    setEntries(prev => prev.filter(e => e.id !== id));
    attemptResearch(entry.query);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      attemptResearch(queryInput);
    }
  }

  function handleTextareaInput(e) {
    setQueryInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px';
  }

  function renderSteps(entry) {
    return STEP_LABELS.map((label, i) => {
      const isDone = entry.stepIndex > i;
      const isActive = entry.stepIndex === i;
      const circleClass = isDone ? 'done' : isActive ? 'active' : 'pending';
      const labelClass = isDone ? 'done' : isActive ? 'active' : 'pending';

      return (
        <div className="step-row" key={i}>
          <div className={`step-circle ${circleClass}`}>
            {isDone ? (
              <IconCheck />
            ) : isActive ? (
              <div className="step-spin" />
            ) : (
              <span className="step-num">{i + 1}</span>
            )}
          </div>
          <div className={`step-label ${labelClass}`}>{label}</div>
        </div>
      );
    });
  }

  function renderDiscordPill(entry) {
    const status = entry.discordStatus || 'idle';

    if (status === 'not_connected') {
      return (
        <div className="discord-pill not-connected">
          <IconWarning />
          <span className="discord-pill-text">Discord not connected</span>
          <button className="discord-configure-link" onClick={() => { setSidebarTab('discord'); setMobileOpen(true); }}>
            Configure →
          </button>
        </div>
      );
    }
    if (status === 'sending' || status === 'checking') {
      return (
        <div className="discord-pill sending">
          <div className="mini-spin" />
          <span className="discord-pill-text" style={{ color: '#a5a8f7' }}>Sending report to Discord…</span>
        </div>
      );
    }
    if (status === 'sent') {
      return (
        <div className="discord-pill sent">
          <IconCheckGreen />
          <span className="discord-pill-text" style={{ color: '#34d399' }}>Sent to Discord</span>
        </div>
      );
    }
    if (status === 'error') {
      return (
        <div className="discord-pill not-connected">
          <span className="discord-pill-text" style={{ color: '#f87171' }}>Discord send failed</span>
        </div>
      );
    }
    return null;
  }

  function renderEntry(entry) {
    return (
      <div className="entry" key={entry.id}>
        <div className="entry-query-row">
          <div className="entry-query-bubble">{entry.query}</div>
        </div>

        {entry.status === 'researching' && (
          <div className="researching-card">
            <div className="researching-title">RESEARCHING · {entry.query}</div>
            {renderSteps(entry)}
          </div>
        )}

        {entry.status === 'error' && (
          <div className="error-card">
            <div className="error-text">Research failed — {entry.error}</div>
            <button className="retry-btn" onClick={() => retryEntry(entry.id)}>Retry</button>
          </div>
        )}

        {entry.status === 'done' && entry.data && (
          <div className="report-card">
            <div className="report-head">
              <div>
                <div className="report-company-name">{entry.data.companyName}</div>
                <a href={entry.data.website} target="_blank" rel="noopener noreferrer" className="report-website">
                  {entry.data.website}
                </a>
              </div>
              <div className="report-complete-badge">RESEARCH COMPLETE</div>
            </div>

            <div className="report-grid">
              <div className="report-stat">
                <div className="report-stat-label">PHONE</div>
                <div className="report-stat-value">{entry.data.phone || 'Not publicly listed'}</div>
              </div>
              <div className="report-stat">
                <div className="report-stat-label">ADDRESS</div>
                <div className="report-stat-value">{entry.data.address || 'Not publicly listed'}</div>
              </div>
            </div>

            {entry.data.summary && (
              <div className="report-section">
                <div className="report-section-title summary">COMPANY SUMMARY</div>
                <div className="summary-text">{entry.data.summary}</div>
              </div>
            )}

            {entry.data.products && entry.data.products.length > 0 && (
              <div className="report-section">
                <div className="report-section-title products">PRODUCTS & SERVICES</div>
                <div className="chip-row">
                  {entry.data.products.map((p, i) => (
                    <div className="product-chip" key={i}>{p}</div>
                  ))}
                </div>
              </div>
            )}

            {entry.data.painPoints && entry.data.painPoints.length > 0 && (
              <div className="report-section">
                <div className="report-section-title pain">AI-GENERATED PAIN POINTS</div>
                {entry.data.painPoints.map((p, i) => (
                  <div className="pain-row" key={i}>
                    <div className="pain-dot" />
                    <div className="pain-text">{p}</div>
                  </div>
                ))}
              </div>
            )}

            {entry.data.competitors && entry.data.competitors.length > 0 && (
              <div className="report-section">
                <div className="report-section-title competitors">COMPETITORS</div>
                <div className="competitor-grid">
                  {entry.data.competitors.map((c, i) => (
                    <div className="competitor-card" key={i}>
                      <div className="competitor-name">{c.name}</div>
                      <div className="competitor-site">{c.website}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="report-actions">
              <button className="download-btn" onClick={() => handleDownloadPDF(entry.data)}>
                <IconDownload />
                Download PDF Report
              </button>
              {renderDiscordPill(entry)}
            </div>
          </div>
        )}
      </div>
    );
  }

  const hasEntries = entries.length > 0;

  return (
    <div className="app">
      <div className={`backdrop ${mobileOpen ? 'visible' : ''}`} onClick={() => setMobileOpen(false)} />

      <div className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="sidebar-head">
          <div className="sidebar-brand">
            <div className="sidebar-brand-icon">
              <IconSearch />
            </div>
            <div>
              <div className="sidebar-brand-name">Research Assistant</div>
              <div className="sidebar-brand-sub">COMPANY INTELLIGENCE</div>
            </div>
          </div>
        </div>

        <div className="new-research-wrap">
          <button className="btn-outline" onClick={handleNewResearch}>
            <IconPlus /> New Research
          </button>
        </div>

        <div className="tabs">
          <button className={`tab-btn ${sidebarTab === 'api' ? 'active' : ''}`} onClick={() => setSidebarTab('api')}>
            API
          </button>
          <button className={`tab-btn ${sidebarTab === 'discord' ? 'active' : ''}`} onClick={() => setSidebarTab('discord')}>
            DISCORD
          </button>
        </div>

        <div className="sidebar-scroll">
          {sidebarTab === 'api' && (
            <div>
              <div className="field-label">OPENROUTER API KEY</div>
              <input
                type="password"
                className="field-input mono"
                placeholder="sk-or-v1-..."
                value={orKey}
                onChange={e => { setOrKey(e.target.value); setApiSaved(false); }}
              />

              <div className="field-label">SERPER.DEV API KEY</div>
              <input
                type="password"
                className="field-input mono"
                placeholder="Your Serper key..."
                value={serperKey}
                onChange={e => { setSerperKey(e.target.value); setApiSaved(false); }}
              />

              <div className="field-label">AI MODEL</div>
              <select
                className="field-input"
                value={selectedModel}
                onChange={e => setSelectedModel(e.target.value)}
              >
                <optgroup label="Featured Models">
                  {featuredModels.map(m => (
                    <option key={`feat-${m.id}`} value={m.id}>{m.name}</option>
                  ))}
                </optgroup>
                {models.length > featuredModels.length && (
                  <optgroup label="All OpenRouter Models">
                    {models
                      .filter(m => !featuredModels.some(f => f.id === m.id))
                      .map(m => (
                        <option key={`all-${m.id}`} value={m.id}>{m.name}</option>
                      ))}
                  </optgroup>
                )}
              </select>

              <button className="btn-gold" onClick={handleSaveConfig}>
                {apiSaved ? 'Saved ✓' : 'Save Configuration'}
              </button>
            </div>
          )}

          {sidebarTab === 'discord' && (
            <div>
              <div className="discord-callout">
                <div className="discord-callout-title">Discord Bot Integration</div>
                <div className="discord-callout-body">
                  After research completes, the report auto-sends to your configured channel.
                </div>
              </div>

              <div className="field-label">BOT TOKEN</div>
              <input
                type="password"
                className="field-input mono"
                placeholder="Bot token..."
                value={botToken}
                onChange={e => { setBotToken(e.target.value); setDiscordSaved(false); }}
              />

              <div className="field-label">CHANNEL ID</div>
              <input
                className="field-input mono"
                placeholder="000000000000000000"
                value={channelId}
                onChange={e => { setChannelId(e.target.value); setDiscordSaved(false); }}
              />

              <div className="applicant-heading">APPLICANT DETAILS</div>

              <div className="field-label-plain">Full Name</div>
              <input
                className="field-input"
                placeholder="Your full name"
                value={applicantName}
                onChange={e => { setApplicantName(e.target.value); setDiscordSaved(false); }}
              />

              <div className="field-label-plain">Email Address</div>
              <input
                className="field-input"
                placeholder="email@example.com"
                value={applicantEmail}
                onChange={e => { setApplicantEmail(e.target.value); setDiscordSaved(false); }}
              />

              <button className="btn-purple" onClick={handleSaveDiscord}>
                {discordSaved ? 'Saved ✓' : 'Save Discord Config'}
              </button>
            </div>
          )}

          <div className="how-it-works">
            <div className="how-it-works-title">HOW IT WORKS</div>
            {[
              'Enter a company name or URL',
              'Serper.dev searches and crawls it',
              'OpenRouter AI generates insights',
              'Download a professional PDF report',
            ].map((step, i) => (
              <div className="how-step" key={i}>
                <div className="how-step-num">{i + 1}</div>
                <div className="how-step-label">{step}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="sidebar-foot">
          <div className="sidebar-foot-text">OPENROUTER · SERPER · JSPDF</div>
        </div>
      </div>

      <div className="main">
        <div className="topbar">
          <button className="mobile-toggle" onClick={() => setMobileOpen(true)}>
            <IconMenu />
          </button>
          <div className="topbar-title">Company Research</div>
          <div className="live-badge">
            <div className="live-dot" />
            <span className="live-text">LIVE</span>
          </div>
        </div>

        <div className="content" ref={contentRef}>
          {!hasEntries && (
            <div className="landing">
              <div className="landing-eyebrow">AI-POWERED INTELLIGENCE</div>
              <div className="landing-title">
                Know any company<br />in minutes.
              </div>
              <div className="landing-sub">
                Enter a company name or website URL to get AI-powered insights, competitor analysis, pain points, and a professional PDF report.
              </div>
              <div className="example-row">
                {EXAMPLE_COMPANIES.map(name => (
                  <button className="example-chip" key={name} onClick={() => attemptResearch(name)}>
                    {name}
                  </button>
                ))}
              </div>
              <div className="landing-hint">
                <div className="rule" />
                <span>{apiSaved ? 'Ready — press Research to begin' : 'Configure API keys in the sidebar to get started'}</span>
                <div className="rule" />
              </div>
            </div>
          )}

          {hasEntries && (
            <div className="entries">
              {entries.map(entry => renderEntry(entry))}
            </div>
          )}
        </div>

        <div className="footer">
          <div className={`config-warning ${showConfigWarning ? 'visible' : ''}`}>
            Add and save your OpenRouter & Serper.dev API keys in the sidebar before researching.
          </div>
          <div className="input-row">
            <textarea
              ref={inputRef}
              className="query-input"
              rows={1}
              placeholder="Enter a company name (e.g. Aurora Labs) or website URL (e.g. https://aurora.dev)..."
              value={queryInput}
              onChange={handleTextareaInput}
              onKeyDown={handleKeyDown}
            />
            <button
              className="submit-btn"
              disabled={isResearching || !queryInput.trim()}
              onClick={() => attemptResearch(queryInput)}
            >
              Research <span style={{ marginLeft: 2 }}>→</span>
            </button>
          </div>
          <div className="input-hint" style={{ display: 'none' }} />
          <div className="footer-hint">ENTER TO RESEARCH · SHIFT+ENTER FOR NEW LINE</div>
        </div>
      </div>
    </div>
  );
}
