import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@/lib/supabase/server";
import {createAdminClient} from "@/lib/supabase/admin";

// Read-only export, available ONLY to authenticated Main Controller.
async function secured() {
 const client=await createClient();
 const {data:{user}}=await client.auth.getUser();
 if(!user)return {error:"Please sign in",status:401} as const;
 const db=createAdminClient();
 const {data:profile,error}=await db.from("users").select("role").eq("id",user.id).maybeSingle();
 if(error||profile?.role!=="MAIN_CONTROLLER")return {error:"Main Controller required",status:403} as const;
 return {db} as const;
}
function failure(message:string,status:number){return NextResponse.json({error:message},{status,headers:{"Cache-Control":"no-store"}})}
function safeUrl(v:string|null){if(!v)return null;try{const u=new URL(v);return u.protocol==="https:"&&!u.username&&!u.password?v:null}catch{return null}}
function fileName(url:string|null){if(!url)return null;try{const n=decodeURIComponent(new URL(url).pathname.split("/").pop()||"");return n.slice(0,255)||null}catch{return null}}
export async function GET(req:NextRequest){
 try{
  const guard=await secured();if("error" in guard)return failure(guard.error,guard.status);
  const db=guard.db,auctionId=new URL(req.url).searchParams.get("auctionId");
  if(!auctionId){
   const {data,error}=await db.from("auctions").select("id,name,ended_at").eq("mode","LIVE").eq("status","ENDED").order("ended_at",{ascending:false});
   return error?failure(error.message,503):NextResponse.json({auctions:data||[]},{headers:{"Cache-Control":"no-store"}});
  }
  if(!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(auctionId))return failure("Invalid auction ID",400);
  const {data:a,error:ae}=await db.from("auctions").select("id,name,mode,status").eq("id",auctionId).single();
  if(ae||!a)return failure("Auction not found",404);
  if(a.mode!=="LIVE"||a.status!=="ENDED")return failure("Only completed LIVE auctions can be exported",409);
  const [{data:teams,error:te},{data:roster,error:re}]=await Promise.all([
   db.from("teams").select("id,name,logo_url,captain_player_id,co_captain_player_id,initial_purse").eq("auction_id",auctionId).order("created_at"),
   db.from("team_players").select("team_id,player_id,price,acquired_via,won_at").eq("auction_id",auctionId)
  ]);
  if(te||re)return failure((te||re)?.message||"Unable to load squads",503);
  if(teams?.length!==6)return failure("Exactly six teams required",409);
  if(roster?.length!==108)return failure("Final allotment must contain exactly 108 players",409);
  const ids=[...new Set(roster.map(p=>p.player_id))];
  if(ids.length!==108)return failure("One or more players were allotted more than once",409);
  const {data:players,error:pe}=await db.from("players").select("id,player_code,name,age,image_url,achievements,playing_centre,participation_history,played_mira_bhayandar,grade,playing_hand").in("id",ids);
  if(pe||players?.length!==108)return failure("Unable to resolve all allocated players",409);
  const byId=new Map(players.map(p=>[p.id,p]));
  const groups=[];
  for(const t of teams){
   const tp=roster.filter(p=>p.team_id===t.id);
   if(tp.length!==18)return failure(t.name+" must have exactly 18 allotted players",409);
   const entries=tp.map(p=>{
    const pl=byId.get(p.player_id)!;
    const image=safeUrl(pl.image_url);
    return {source_player_id:pl.id,player_code:pl.player_code||null,name:pl.name,category:pl.grade||null,
     image_url:image,image_filename:fileName(image),image_storage_path:null,
     is_captain:pl.id===t.captain_player_id||pl.id===t.co_captain_player_id,
     is_playing_captain:pl.id===t.captain_player_id||pl.id===t.co_captain_player_id,
     auction_amount:p.price??null,metadata:{age:pl.age,grade:pl.grade,achievements:pl.achievements,
      playing_centre:pl.playing_centre,participation_history:pl.participation_history,
      played_mira_bhayandar:pl.played_mira_bhayandar,playing_hand:pl.playing_hand,
      acquired_via:p.acquired_via,won_at:p.won_at}};
   });
   const logo=safeUrl(t.logo_url);
   groups.push({source_team_id:t.id,name:t.name,captain_name:byId.get(t.captain_player_id||"")?.name||null,
    logo_url:logo,logo_filename:fileName(logo),players:entries,
    metadata:{initial_purse:t.initial_purse,co_captain_name:byId.get(t.co_captain_player_id||"")?.name||null}});
  }
  const result={format:"s-tournament-auction-handoff",version:1,exported_at:new Date().toISOString(),
   source:{system:"s-auction-system",auction_id:a.id,status:"completed"},teams:groups};
  return new NextResponse(JSON.stringify(result,null,2),{headers:{
   "Content-Type":"application/json; charset=utf-8",
   "Content-Disposition":'attachment; filename="s-tournament-auction-'+a.id+'.json"',
   "Cache-Control":"no-store, private","X-Content-Type-Options":"nosniff"
  }});
 }catch{return failure("Unable to export completed auction",500)}
}