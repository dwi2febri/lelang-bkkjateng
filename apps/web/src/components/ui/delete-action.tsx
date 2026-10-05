"use client";
import {useCallback, useState} from 'react';
import {createPortal} from 'react-dom';
import {Trash2} from 'lucide-react';
import {api,errorMessage} from '@/services/api';
import {notify} from '@/store/notification-store';
import {Modal} from './modal';
import {Button} from './button';

export function DeleteAction({name,endpoint,onDeleted,recycle=false,iconOnly=false,disabledReason,description}:{
  name:string; endpoint:string; onDeleted:()=>void; recycle?:boolean; iconOnly?:boolean; disabledReason?:string; description?:string;
}) {
  const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const close=useCallback(()=>{if(!busy)setOpen(false);},[busy]);
  async function remove(){
    if(busy)return;
    setBusy(true);setError('');
    try {
      const {data}=await api.delete<{message:string}>(endpoint);
      setOpen(false);notify(data.message);onDeleted();
    }catch(e){setError(errorMessage(e));}finally{setBusy(false);}
  }
  return <>
    <button type="button" className="delete-action outline-button" title={disabledReason||`Hapus ${name}`} aria-label={`Hapus ${name}`} disabled={!!disabledReason} onClick={()=>{setError('');setOpen(true);}}>
      <Trash2 size={16}/>{!iconOnly&&'Hapus'}
    </button>
    {open&&createPortal(<Modal title={recycle?'Pindahkan ke Recycle Bin?':'Hapus data ini?'} onClose={close}>
      <div className="delete-confirm-content"><strong>{name}</strong><p>{recycle?'Data akan dipindahkan ke Recycle Bin dan dapat dipulihkan kembali.':'Data akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.'}</p>
        {description&&<p>{description}</p>}{error&&<div className="admin-alert error" role="alert">{error}</div>}
      </div>
      <div className="admin-modal-actions"><Button variant="secondary" disabled={busy} onClick={close}>Batal</Button><Button variant="danger" disabled={busy} onClick={remove}><Trash2 size={16}/>{busy?'Menghapus...':recycle?'Pindahkan ke Recycle Bin':'Hapus'}</Button></div>
    </Modal>,document.querySelector(".admin-app")||document.body)}
  </>;
}
