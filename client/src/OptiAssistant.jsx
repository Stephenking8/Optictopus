import React, { useEffect, useRef, useState } from "react";
import { api } from "./api";
import "./opti-assistant.css";

const QUESTIONS = [
  "What services do you offer?",
  "Show me your projects",
  "How can I get in touch?",
];

function OctopusHead({ thinking = false }) {
  return (
    <svg className={"opti-head " + (thinking ? "opti-head-thinking" : "")} viewBox="0 0 96 96" role="img" aria-label="Opti the octopus">
      <defs>
        <radialGradient id="opti-head-fill" cx="33%" cy="20%" r="85%">
          <stop offset="0" stopColor="#dda9ff" />
          <stop offset=".46" stopColor="#a967ef" />
          <stop offset="1" stopColor="#5229af" />
        </radialGradient>
      </defs>
      <path className="opti-head-arm opti-head-arm-left" d="M27 60 C16 61 10 74 19 79 C26 83 31 77 29 73" fill="none" stroke="#7d43d5" strokeWidth="9" strokeLinecap="round" />
      <path className="opti-head-arm opti-head-arm-right" d="M69 60 C80 61 86 74 77 79 C70 83 65 77 67 73" fill="none" stroke="#7d43d5" strokeWidth="9" strokeLinecap="round" />
      <path className="opti-head-arm opti-head-arm-bottom" d="M37 67 Q30 85 41 82 M59 67 Q66 85 55 82" fill="none" stroke="#9a5ce5" strokeWidth="10" strokeLinecap="round" />
      <path d="M18 45 C18 23 31 10 48 10 C65 10 78 23 78 45 C78 66 64 72 48 72 C32 72 18 66 18 45Z" fill="url(#opti-head-fill)" stroke="#debcff" strokeWidth="1.4"/>
      <ellipse cx="36" cy="46" rx="10" ry="13" fill="#faf6ff" />
      <ellipse cx="60" cy="46" rx="10" ry="13" fill="#faf6ff" />
      <ellipse className="opti-head-pupil" cx="39" cy="48" rx="5" ry="7" fill="#2b155d" />
      <ellipse className="opti-head-pupil" cx="63" cy="48" rx="5" ry="7" fill="#2b155d" />
      <circle cx="40" cy="44" r="2.1" fill="white" />
      <circle cx="64" cy="44" r="2.1" fill="white" />
      <circle cx="29" cy="27" r="2" fill="#f5dcff" opacity=".7" />
      <circle cx="37" cy="22" r="1.4" fill="#f5dcff" opacity=".8" />
      <circle cx="50" cy="19" r="1.5" fill="#f5dcff" opacity=".5" />
    </svg>
  );
}

export default function OptiAssistant() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hello! I'm Opti, your OPTICTOPUS portfolio assistant. Ask me about projects, services, Shopify, AI tools, product listings, or how to get in touch." },
  ]);
  const [mode, setMode] = useState("guide");
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const busyRef = useRef(false);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      bottomRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
    }
  }, [open]);
  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages, sending, open]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  async function send(question) {
    const message = String(question || "").trim().slice(0, 500);
    if (!message || busyRef.current) return;
    busyRef.current = true;
    setSending(true);
    setDraft("");
    const history = messages.slice(-8).map(({ role, content }) => ({ role, content: content.slice(0, 500) }));
    setMessages((current) => [...current, { role: "user", content: message }].slice(-20));
    try {
      const data = await api("/chat", { method: "POST", body: { message, history } });
      setMode(data.mode === "ai" ? "ai" : "guide");
      setMessages((current) =>
        [...current, { role: "assistant", content: data.reply, links: data.links || [] }].slice(-20),
      );
    } catch (e) {
      setMessages((current) =>
        [...current, { role: "assistant", content: "I couldn't connect right now. Please try again, or use the Contact link in the website footer." }].slice(-20),
      );
    } finally {
      busyRef.current = false;
      setSending(false);
      inputRef.current?.focus();
    }
  }

  return (
    <aside className={"opti-assistant " + (open ? "opti-assistant-open" : "")} aria-label="OPTICTOPUS portfolio assistant">
      {open && (
        <section className="opti-chat" role="dialog" aria-label="Chat with Opti" aria-modal="false">
          <header className="opti-chat-header">
            <div className="opti-chat-identity">
              <span className="opti-chat-avatar"><OctopusHead /></span>
              <span><strong>Ask Opti</strong><small>{mode === "ai" ? "AI-powered portfolio assistant" : "Portfolio knowledge assistant"}</small></span>
            </div>
            <button type="button" className="opti-chat-close" onClick={() => setOpen(false)} aria-label="Close assistant">×</button>
          </header>
          <div className="opti-chat-messages" role="log" aria-live="polite" aria-relevant="additions text">
            {messages.map((msg, index) => (
              <div className={"opti-chat-line " + (msg.role === "user" ? "opti-chat-line-user" : "")} key={index}>
                {msg.role === "assistant" && <span className="opti-chat-mini-avatar"><OctopusHead /></span>}
                <div className={"opti-chat-bubble " + (msg.role === "user" ? "opti-chat-bubble-user" : "")}>
                  <span>{msg.content}</span>
                  {msg.role === "assistant" && Array.isArray(msg.links) && msg.links.length > 0 && (
                    <nav className="opti-chat-links" aria-label="Relevant website links">
                      {msg.links.filter((l) => typeof l.href === "string" && /^\/(?!\/)/.test(l.href)).slice(0, 3).map((l) => (
                        <a key={l.href} href={l.href}>{l.label || "View more"} ↗</a>
                      ))}
                    </nav>
                  )}
                </div>
              </div>
            ))}
            {sending && <div className="opti-chat-line"><span className="opti-chat-mini-avatar"><OctopusHead thinking /></span><div className="opti-chat-bubble opti-chat-typing" aria-label="Opti is thinking"><i /><i /><i /></div></div>}
            <div ref={bottomRef} />
          </div>
          {messages.length === 1 && <div className="opti-chat-suggestions">{QUESTIONS.map((q) => <button type="button" key={q} onClick={() => send(q)}>{q}</button>)}</div>}
          <form className="opti-chat-compose" onSubmit={(e) => { e.preventDefault(); send(draft); }}>
            <label htmlFor="opti-chat-input" className="opti-chat-sr-only">Ask a question about OPTICTOPUS</label>
            <input id="opti-chat-input" ref={inputRef} type="text" maxLength={500} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Ask about the portfolio…" autoComplete="off" />
            <button type="submit" disabled={sending || !draft.trim()} aria-label="Send message">➤</button>
          </form>
          <p className="opti-chat-disclaimer">Replies use public portfolio information. Don't share sensitive details.</p>
        </section>
      )}
      <button type="button" className="opti-chat-launcher" onClick={() => setOpen(!open)} aria-label={open ? "Close Opti chat" : "Chat with Opti"} aria-expanded={open}>
        <OctopusHead thinking={sending} />
        {!open && <span className="opti-chat-launcher-label">Ask Opti <span aria-hidden="true">✦</span></span>}
      </button>
    </aside>
  );
}
