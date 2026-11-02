/** Best-effort per-instance limiter, not a distributed firewall. */
const buckets = new Map<string, {count:number; expires:number}>();
const MAX_BUCKETS = 4096;
export function limitAuctionTraffic(key:string, max:number, periodMs:number, now=Date.now()) {
  const old=buckets.get(key);
  if (!old || old.expires<=now) {
    if (!old && buckets.size>=MAX_BUCKETS) {
      for(const [k,v] of buckets) if(v.expires<=now) buckets.delete(k);
      if(buckets.size>=MAX_BUCKETS) return {allowed:false,retryAfter:Math.ceil(periodMs/1000)};
    }
    buckets.set(key,{count:1,expires:now+periodMs});
    return {allowed:true,retryAfter:0};
  }
  if(old.count>=max) return {allowed:false,retryAfter:Math.max(1,Math.ceil((old.expires-now)/1000))};
  old.count++;
  return {allowed:true,retryAfter:0};
}
