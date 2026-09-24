"use client";
import { useId, useState } from "react";
import { ImageUp, LoaderCircle, FileImage } from "lucide-react";

export function UploadField({ label, hint, disabled = false, onFile }: {
  label: string;
  hint?: string;
  disabled?: boolean;
  onFile: (file: File) => void | Promise<void>;
}) {
  const id = useId();
  const [dragging, setDragging] = useState(false);
  const [name, setName] = useState("");
  function select(file?: File) {
    if (!file || disabled) return;
    setName(file.name);
    void onFile(file);
  }
  return <div className="upload-field">
    <label className="upload-field-label" htmlFor={id}>{label}</label>
    <div className={`upload-dropzone${dragging ? " is-dragging" : ""}${disabled ? " is-disabled" : ""}`}
      onDragOver={e => { e.preventDefault(); if (!disabled) setDragging(true); }}
      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false); }}
      onDrop={e => { e.preventDefault(); setDragging(false); select(e.dataTransfer.files[0]); }}>
      <input id={id} type="file" accept="image/png,image/jpeg,image/webp" disabled={disabled} aria-describedby={`${id}-hint`} onChange={e => { select(e.target.files?.[0]); e.target.value = ""; }} />
      <span className="upload-dropzone-icon" aria-hidden="true">{disabled ? <LoaderCircle size={29} /> : <ImageUp size={29} />}</span>
      <strong>{disabled ? "Memproses, mohon tunggu..." : dragging ? "Lepaskan gambar di sini" : "Pilih atau letakkan gambar di sini"}</strong>
      <span id={`${id}-hint`}>JPG, PNG, WebP · maksimal 5 MB</span>
      {name && <small className="upload-file-name"><FileImage size={14} />{name}</small>}
    </div>
    {hint && <p className="upload-field-hint">{hint}</p>}
  </div>;
}
