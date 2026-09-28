"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { MessageCircle, Send } from "lucide-react";
import { api, errorMessage } from "@/services/api";
import { accountRequest } from "@/features/catalog/public-account";

type ChatMessage = { id: number; senderRole: "admin" | "public"; body: string; createdAt: string };
type ChatResponse = { status: string; messages: ChatMessage[] };

export function InterestChat({ interestId, role }: { interestId: number; role: "admin" | "public" }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState("");
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const after = useRef(0);
  const busy = useRef(false);
  const bottom = useRef<HTMLDivElement>(null);
  const path = role === "admin" ? `/admin/pengajuan/${interestId}/messages` : `history/${interestId}/messages`;

  useEffect(() => {
    let active = true;
    after.current = 0;
    setMessages([]);
    async function refresh() {
      if (busy.current || !active || document.hidden) return;
      busy.current = true;
      try {
        // Fetch subsequent batches too, so long conversations are not truncated.
        for (let page = 0; page < 5; page++) {
          const response = role === "admin"
            ? (await api.get<ChatResponse>(path, { params: { after: after.current } })).data
            : await accountRequest<ChatResponse>(`${path}?after=${after.current}`);
          if (!active) return;
          setStatus(response.status);
          if (response.messages.length) {
            after.current = response.messages.at(-1)!.id;
            setMessages(current => {
              const known = new Set(current.map(item => item.id));
              return [...current, ...response.messages.filter(item => !known.has(item.id))].sort((a, b) => a.id - b.id);
            });
          }
          setError("");
          if (response.messages.length < 200) break;
        }
      } catch (cause) {
        if (active) setError(role === "admin" ? errorMessage(cause) : cause instanceof Error ? cause.message : "Chat belum dapat dimuat.");
      } finally { busy.current = false; }
    }
    void refresh();
    const timer = window.setInterval(refresh, 2000);
    document.addEventListener("visibilitychange", refresh);
    return () => { active = false; window.clearInterval(timer); document.removeEventListener("visibilitychange", refresh); };
  }, [path, role]);

  useEffect(() => { bottom.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }); }, [messages.length]);

  async function send(event: FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || sending || status !== "diproses") return;
    setSending(true);
    setError("");
    try {
      const saved = role === "admin"
        ? (await api.post<ChatMessage>(path, { body })).data
        : await accountRequest<ChatMessage>(path, { body });
      setMessages(current => current.some(item => item.id === saved.id) ? current : [...current, saved].sort((a, b) => a.id - b.id));
      setDraft("");
    } catch (cause) {
      setError(role === "admin" ? errorMessage(cause) : cause instanceof Error ? cause.message : "Pesan belum terkirim.");
    } finally { setSending(false); }
  }

  return <div className="interest-chat">
    <div className="interest-chat-heading"><MessageCircle size={19}/><div><strong>Chat pengajuan</strong><small>{!status ? "Memuat percakapan..." : status === "diproses" ? "Percakapan aktif · diperbarui otomatis" : "Percakapan telah ditutup"}</small></div></div>
    <div className="interest-chat-messages" role="log" aria-label="Percakapan pengajuan" aria-live="polite">
      {messages.length === 0 && <p className="interest-chat-empty">Belum ada pesan. Mulai percakapan di sini.</p>}
      {messages.map(message => <div className={`interest-chat-message ${message.senderRole === role ? "mine" : "theirs"}`} key={message.id}>
        <small>{message.senderRole === "admin" ? "Pengelola aset" : "Pemohon"}</small>
        <p>{message.body}</p>
        <time>{new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }).format(new Date(message.createdAt))}</time>
      </div>)}<div ref={bottom}/>
    </div>
    {status === "diproses" && <form className="interest-chat-form" onSubmit={send}>
      <label className="sr-only" htmlFor={`chat-${role}-${interestId}`}>Tulis pesan</label>
      <textarea id={`chat-${role}-${interestId}`} value={draft} onChange={event => setDraft(event.target.value)} maxLength={2000} rows={2} placeholder="Tulis pesan untuk percakapan ini..."/>
      <button type="submit" disabled={!draft.trim() || sending} aria-label="Kirim pesan"><Send size={18}/></button>
    </form>}
    {error && <p className="interest-chat-error" role="alert">{error}</p>}
  </div>;
}
