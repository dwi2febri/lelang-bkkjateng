"use client";
import {useEffect,useRef,useState,type PointerEvent as Pointer,type KeyboardEvent} from "react";
import {dragSortTarget} from "./drag-sort-position";
type Drag={from:number;to:number;offset:number;shift:number;settling:boolean};
type Session={from:number;to:number;startY:number;y:number;started:boolean;settling:boolean;row:HTMLDivElement;pointerId:number;listTop:number;scale:number;gap:number;rects:{top:number;height:number}[]};

export function useDragSort(count:number,onMove:(from:number,to:number)=>void) {
 const listRef=useRef<HTMLDivElement>(null),session=useRef<Session|null>(null);
 const frame=useRef(0),timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const [drag,setDrag]=useState<Drag|null>(null),[announcement,setAnnouncement]=useState("");
 const [resetting,setResetting]=useState(false);
 useEffect(()=>()=>{cancelAnimationFrame(frame.current);if(timer.current)clearTimeout(timer.current);session.current=null;},[]);
 function track() {
  const c=session.current,list=listRef.current;if(!c?.started||c.settling||!list)return;
  const source=c.rects[c.from],last=c.rects[count-1];
  const offset=Math.max(-source.top,Math.min(last.top+last.height-source.top-source.height,c.y-c.startY+c.listTop-list.getBoundingClientRect().top));
  const to=dragSortTarget(c.rects,c.from,offset);
  c.to=to;
  setDrag({from:c.from,to,offset:offset/c.scale,shift:(source.height+c.gap)/c.scale,settling:false});
 }
 function scroll() {
  const c=session.current;if(!c?.started||c.settling)return;
  const distance=c.y<85?-10:c.y>window.innerHeight-85?10:0;
  if(distance){window.scrollBy(0,distance);track();}
  frame.current=requestAnimationFrame(scroll);
 }
 function move(from:number,to:number) {
  onMove(from,to);setAnnouncement(`Pilihan dipindahkan ke urutan ${to+1} dari ${count}.`);
  requestAnimationFrame(()=>listRef.current?.querySelector<HTMLDivElement>(`[data-sort-index="${to}"]`)?.focus({preventScroll:true}));
 }
 function finish(commit:boolean) {
  const c=session.current;if(!c||c.settling)return;
  cancelAnimationFrame(frame.current);c.settling=true;
  if(c.row.hasPointerCapture(c.pointerId))c.row.releasePointerCapture(c.pointerId);
  if(!c.started){session.current=null;setDrag(null);return;}
  const to=commit?c.to:c.from,source=c.rects[c.from],target=c.rects[to];
  const offset=to>c.from?target.top+target.height-source.height-source.top:target.top-source.top;
  setDrag({from:c.from,to,offset:offset/c.scale,shift:(source.height+c.gap)/c.scale,settling:true});
  timer.current=setTimeout(()=>{session.current=null;setResetting(true);setDrag(null);if(to!==c.from)move(c.from,to);frame.current=requestAnimationFrame(()=>{frame.current=requestAnimationFrame(()=>setResetting(false));});},window.matchMedia("(prefers-reduced-motion: reduce)").matches?0:180);
 }
 function rowProps(index:number,label:string) {
  let offset=0;
  if(drag){if(index===drag.from)offset=drag.offset;else if(index>drag.from&&index<=drag.to)offset=-drag.shift;else if(index<drag.from&&index>=drag.to)offset=drag.shift;}
  return {
   ...keyboardProps(index,label),
   style:{transform:`translateY(${offset}px)`,zIndex:drag?.from===index?2:undefined,transition:resetting||(drag?.from===index&&!drag.settling)?"none":undefined},
   onPointerDown:(event:Pointer<HTMLDivElement>)=>{
    if(count<2||!event.isPrimary||event.button!==0||session.current||event.currentTarget.closest("fieldset:disabled"))return;
    const target=event.target as HTMLElement;
    // Interactive controls keep their normal click/edit behavior.
    if(target.closest("input,textarea,select,a,button,[contenteditable=true],[role=dialog]"))return;
    event.preventDefault();
    const row=event.currentTarget,list=listRef.current;if(!list)return;
    row.focus({preventScroll:true});
    const listTop=list.getBoundingClientRect().top;
    const rects=Array.from(list.querySelectorAll<HTMLElement>("[data-sort-index]")).map(element=>{const r=element.getBoundingClientRect();return {top:r.top-listTop,height:r.height};});
    const scale=row.getBoundingClientRect().height/row.offsetHeight;
    row.setPointerCapture(event.pointerId);
    session.current={from:index,to:index,startY:event.clientY,y:event.clientY,started:false,settling:false,row,pointerId:event.pointerId,listTop,scale,gap:rects.length>1?rects[1].top-rects[0].top-rects[0].height:0,rects};
   },
   onPointerMove:(event:Pointer<HTMLDivElement>)=>{
    const c=session.current;if(!c||c.settling||c.pointerId!==event.pointerId)return;
    c.y=event.clientY;
    if(!c.started&&Math.abs(c.y-c.startY)>5){c.started=true;frame.current=requestAnimationFrame(scroll);}
    if(c.started)track();
   },
   onPointerUp:(event:Pointer<HTMLDivElement>)=>{if(session.current?.pointerId===event.pointerId)finish(true);},
   onPointerCancel:()=>finish(false),onLostPointerCapture:()=>finish(false),
  };
 }
 function keyboardProps(index:number,label:string) {
  return {
   tabIndex:count<2?-1:0,role:"group","aria-label":`Geser ${label||`pilihan ${index+1}`} untuk mengubah urutan`,
   onKeyDown:(event:KeyboardEvent<HTMLDivElement>)=>{
    if(event.target!==event.currentTarget||event.currentTarget.closest("fieldset:disabled"))return;
    if(event.key==="Escape"){finish(false);return;}
    if(session.current||!["ArrowUp","ArrowDown","Home","End"].includes(event.key))return;
    event.preventDefault();
    const to=event.key==="Home"?0:event.key==="End"?count-1:Math.max(0,Math.min(count-1,index+(event.key==="ArrowUp"?-1:1)));
    if(index!==to)move(index,to);
   },
  };
 }
 return {listRef,drag,announcement,rowProps};
}
