"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { UploadField } from "@/components/ui/upload-field";
import { api, errorMessage } from "@/services/api";
import { GuideContent, type Guide, type GuideBlock } from "./guide-content";

export function GuideEditor() {
  const [guide, setGuide] = useState<Guide | null>(null);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(false);
  async function load() {
    setError("");
    try {
      setGuide((await api.get<Guide>("/guide")).data);
    } catch (e) {
      setError(errorMessage(e));
    }
  }
  useEffect(() => {
    void load();
  }, []);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function change(blocks: GuideBlock[]) {
    if (guide) setGuide({ ...guide, blocks });
    setDirty(true);
    setMessage("");
  }
  function patch(index: number, update: Partial<GuideBlock>) {
    if (guide)
      change(
        guide.blocks.map((block, i) =>
          i === index ? { ...block, ...update } : block,
        ),
      );
  }
  function move(index: number, offset: number) {
    if (!guide) return;
    const next = [...guide.blocks];
    [next[index], next[index + offset]] = [next[index + offset], next[index]];
    change(next);
  }
  async function upload(index: number, file?: File) {
    if (!file) return;
    if (
      file.size > 5 * 1024 * 1024 ||
      !["image/png", "image/jpeg", "image/webp"].includes(file.type)
    ) {
      setError("Gunakan PNG, JPG, atau WebP maksimal 5 MB.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.append("image", file);
      const result = await api.post<{ url: string }>(
        "/admin/guide/images",
        form,
      );
      patch(index, { url: result.data.url });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    if (!guide) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const { title, blocks, version } = guide;
      setGuide(
        (await api.put<Guide>("/admin/guide", { title, blocks, version })).data,
      );
      setDirty(false);
      setMessage("Panduan berhasil disimpan dan tampil di halaman publik.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  if (!guide)
    return (
      <div className="guide-editor">
        {error ? (
          <>
            <p role="alert">{error}</p>
            <button onClick={load}>Coba lagi</button>
          </>
        ) : (
          <p>Memuat panduan...</p>
        )}
      </div>
    );
  return (
    <div className="guide-editor">
      <div className="guide-editor-top">
        <div>
          <h1>Kelola Panduan Lelang</h1>
          <p>
            Susun teks dan gambar. Perubahan tampil ke publik setelah disimpan.
          </p>
        </div>
        <Link href="/panduan-lelang" target="_blank">
          Lihat halaman publik ↗
        </Link>
      </div>
      <div className="guide-editor-toolbar">
        <button onClick={() => setPreview(!preview)}>
          {preview ? "Kembali ke editor" : "Pratinjau"}
        </button>
        <button
          className="primary-button"
          disabled={busy || !dirty}
          onClick={save}
        >
          {busy ? "Memproses..." : "Simpan Panduan"}
        </button>
        <span>{dirty ? "Ada perubahan belum disimpan" : "Tersimpan"}</span>
      </div>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="success">
          {message}
        </p>
      )}
      {preview ? (
        <GuideContent guide={guide} />
      ) : (
        <fieldset disabled={busy}>
          <label>
            Judul halaman
            <input
              maxLength={150}
              value={guide.title}
              onChange={(e) => {
                setGuide({ ...guide, title: e.target.value });
                setDirty(true);
              }}
            />
          </label>
          {guide.blocks.map((block, index) => (
            <section className="guide-editor-block" key={index}>
              <div className="guide-block-tools">
                <strong>
                  {index + 1}. {block.type === "text" ? "Teks" : "Gambar"}
                </strong>
                <button
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                  aria-label={`Naikkan blok ${index + 1}`}
                >
                  ↑ Naik
                </button>
                <button
                  disabled={index === guide.blocks.length - 1}
                  onClick={() => move(index, 1)}
                  aria-label={`Turunkan blok ${index + 1}`}
                >
                  ↓ Turun
                </button>
                <button
                  onClick={() =>
                    change(guide.blocks.filter((_, i) => i !== index))
                  }
                >
                  Hapus
                </button>
              </div>
              {block.type === "text" ? (
                <>
                  <label>
                    Subjudul (opsional)
                    <input
                      value={block.heading || ""}
                      maxLength={150}
                      onChange={(e) =>
                        patch(index, { heading: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Isi teks
                    <textarea
                      rows={6}
                      maxLength={10000}
                      value={block.text || ""}
                      onChange={(e) => patch(index, { text: e.target.value })}
                    />
                  </label>
                </>
              ) : (
                <>
                  <UploadField label="Gambar panduan" disabled={busy} onFile={file => upload(index, file)} hint="Gambar akan ditampilkan di dalam konten panduan setelah disimpan." />
                  {block.url && (
                    <img
                      className="guide-upload-preview"
                      src={block.url}
                      alt={block.caption || "Pratinjau gambar"}
                    />
                  )}
                  <label>
                    Keterangan gambar
                    <input
                      maxLength={300}
                      value={block.caption || ""}
                      onChange={(e) =>
                        patch(index, { caption: e.target.value })
                      }
                    />
                  </label>
                </>
              )}
            </section>
          ))}
          <div className="guide-editor-toolbar">
            <button
              disabled={guide.blocks.length >= 60}
              onClick={() =>
                change([
                  ...guide.blocks,
                  { type: "text", heading: "", text: "" },
                ])
              }
            >
              + Tambah teks
            </button>
            <button
              disabled={guide.blocks.length >= 60}
              onClick={() =>
                change([...guide.blocks, { type: "image", caption: "" }])
              }
            >
              + Tambah gambar
            </button>
          </div>
        </fieldset>
      )}
    </div>
  );
}
