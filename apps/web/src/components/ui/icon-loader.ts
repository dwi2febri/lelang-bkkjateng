import {getIconData,iconToSVG,iconToHTML} from "@iconify/utils";
import type {IconifyJSON} from "@iconify/types";
// Batch icons per collection so opening the picker does not flood the API.
// Share successful results and pending requests across picker, form and detail.
const providers = ["https://api.iconify.design", "https://api.simplesvg.com", "https://api.unisvg.com"];
const cache = new Map<string, string>();
const pending = new Map<string, Promise<string>>();
const queue: Array<() => void> = [];
const batches=new Map<string,Map<string,{resolve:(source:string)=>void;reject:(error:unknown)=>void}>>();
let batchTimer:ReturnType<typeof setTimeout>|undefined;
let active = 0;
let preferredProvider = 0;

function pump() {
  while (active < 2 && queue.length) queue.shift()!();
}

function flushBatches() {
 batchTimer=undefined;
 for(const [prefix,entries] of batches){
  const names=[...entries.keys()].sort();
  while(names.length){
   const chunk:string[]=[];let length=0;
   while(names.length&&(length+names[0].length<400||!chunk.length)){const name=names.shift()!;chunk.push(name);length+=name.length+1;}
   queue.push(()=>{
    active++;
    void (async()=>{
     try{
      const response=await fetchIconResource(`${prefix}.json?icons=${chunk.join(",")}`);
      const data=await response.json() as IconifyJSON;
      if(data.prefix!==prefix||!data.icons)throw new Error("Data ikon tidak valid");
      for(const name of chunk){
       const entry=entries.get(name)!;
       try{
        const icon=getIconData(data,name);if(!icon)throw new Error(`Ikon ${prefix}:${name} tidak ditemukan`);
        const built=iconToSVG(icon);
        const svg=iconToHTML(built.body,{...built.attributes,style:"color: #195783;"});
        const source=`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
        if(cache.size>=1000)cache.delete(cache.keys().next().value!);
        cache.set(`${prefix}:${name}`,source);entry.resolve(source);
       }catch(error){entry.reject(error);}
      }
     }catch(error){for(const name of chunk)entries.get(name)!.reject(error);}
     finally{for(const name of chunk)pending.delete(`${prefix}:${name}`);active--;pump();}
    })();
   });
  }
 }
 batches.clear();pump();
}

export async function fetchIconResource(path: string, signal?: AbortSignal): Promise<Response> {
  const first = preferredProvider;
  let lastError: unknown;
  for (let attempt = 0; attempt < providers.length; attempt++) {
    signal?.throwIfAborted();
    const index = (first + attempt) % providers.length;
    try {
      const timeout = AbortSignal.timeout(8000);
      const response = await fetch(`${providers[index]}/${path}`, {
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
        referrerPolicy: "no-referrer",
      });
      if (!response.ok) throw new Error(`API ikon: HTTP ${response.status}`);
      preferredProvider = index;
      return response;
    } catch (error) {
      signal?.throwIfAborted();
      lastError = error;
    }
  }
  throw lastError;
}

export function loadIconImage(name: string): Promise<string> {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*:[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name) || name.length > 160) {
    return Promise.reject(new Error("Nama ikon tidak valid"));
  }
  if (cache.has(name)) return Promise.resolve(cache.get(name)!);
  if (pending.has(name)) return pending.get(name)!;
  const request = new Promise<string>((resolve, reject) => {
    const [prefix,icon]=name.split(":");
    if(!batches.has(prefix))batches.set(prefix,new Map());
    batches.get(prefix)!.set(icon,{resolve,reject});
  });
  pending.set(name, request);
  if(!batchTimer)batchTimer=setTimeout(flushBatches,40);
  return request;
}
