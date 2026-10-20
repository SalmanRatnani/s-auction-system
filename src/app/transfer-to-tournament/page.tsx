"use client";
import {useEffect,useState} from "react";
import {Download} from "lucide-react";
import Link from "next/link";
type Auction={id:string;name:string;ended_at:string|null};
export default function TournamentTransfer(){
 const [auctions,setAuctions]=useState<Auction[]>([]),[auctionId,setAuctionId]=useState(""),[error,setError]=useState(""),[busy,setBusy]=useState(false);
 useEffect(()=>{fetch("/api/admin/tournament-export",{cache:"no-store"}).then(async res=>{const json=await res.json();if(!res.ok)throw Error(json.error);setAuctions(json.auctions);setAuctionId(json.auctions[0]?.id||"")}).catch(e=>setError(e.message))},[]);
 async function download(){
  if(!auctionId)return;setBusy(true);setError("");
  try{const r=await fetch("/api/admin/tournament-export?auctionId="+encodeURIComponent(auctionId),{cache:"no-store"});
   if(!r.ok)throw Error((await r.json()).error||"Export failed");
   const url=URL.createObjectURL(await r.blob());const a=document.createElement("a");a.href=url;a.download="s-tournament-auction-"+auctionId+".json";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }catch(e){setError(e instanceof Error?e.message:"Export failed")}finally{setBusy(false)}
 }
 return <main className="mx-auto max-w-3xl px-5 py-14 text-white"><Link href="/dashboard" className="text-sm opacity-70">← Dashboard</Link>
  <section className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-8">
   <h1 className="text-2xl font-bold">Export to S Tournament</h1><p className="mt-3 text-sm opacity-70">Main Controller only • read-only transfer from completed LIVE auctions</p>
   <p className="my-5 text-sm">Transfer exactly 6 teams and 18 players per team, with profile photo URLs, image filenames, player codes, grades, captains and final auction prices.</p>
   <label htmlFor="auction" className="block text-sm">Select completed auction</label>
   <select id="auction" className="mt-2 w-full rounded-lg border border-white/20 bg-zinc-900 p-3" value={auctionId} onChange={e=>setAuctionId(e.target.value)}>
    {!auctions.length&&<option value="">No ended LIVE auctions</option>}
    {auctions.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
   </select>
   <button className="mt-6 flex items-center gap-2 rounded-lg bg-emerald-400 px-5 py-3 font-bold text-zinc-950 disabled:opacity-40" disabled={!auctionId||busy} onClick={()=>void download()}><Download size={17}/>{busy?"Exporting…":"Download tournament JSON"}</button>
   {error&&<p className="mt-4 text-sm text-red-300" role="alert">{error}</p>}
   <p className="mt-4 text-xs opacity-60">Exports references to player images, not image bytes. The tournament app imports the file after organizer confirmation. Nothing in this auction is modified.</p>
  </section></main>;
}