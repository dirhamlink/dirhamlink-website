"use client";
import { useEffect,useState } from "react";
import { supabase } from "../../lib/supabase/client";
type Entry={id:string;entry_type:string;amount_aed:number;description:string;created_at:string};
export default function WalletPanel(){
 const [entries,setEntries]=useState<Entry[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 useEffect(()=>{let active=true;(async()=>{
  const {data,error}=await supabase.from("wallet_ledger").select("id,entry_type,amount_aed,description,created_at").order("created_at",{ascending:false}).limit(100);
  if(!active)return;
  if(error)setError("Wallet is awaiting database setup.");
  else setEntries((data??[]) as Entry[]);
  setLoading(false);
 })();return()=>{active=false};},[]);
 const balance=entries.reduce((sum,e)=>sum+((["deposit_credit","refund_credit","adjustment_credit"].includes(e.entry_type)?1:-1)*Number(e.amount_aed)),0);
 return <section className="account-notice" style={{marginBottom:18}}>
  <div className="dashboard-section-title">Your DirhamLink wallet</div>
  <p style={{fontSize:13}}>Staff-controlled account balance · only verified funds are available</p>
  <strong style={{fontSize:28}}>AED {balance.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</strong>
  <p><small>{entries.filter(e=>e.entry_type==="deposit_credit").length} verified deposit credits · {entries.filter(e=>e.entry_type==="transfer_debit").length} transfer debits</small></p>
  {loading?<p>Loading wallet…</p>:error?<p>{error}</p>:entries.length===0?<p>No wallet transactions yet. Deposits appear here after authorised staff verification.</p>:<div style={{marginTop:12}}>
   <strong>Wallet activity</strong>
   {entries.map(e=><div key={e.id} style={{display:"flex",justifyContent:"space-between",gap:12,padding:"10px 0",borderTop:"1px solid #e5e7eb"}}>
    <span><strong>{e.description}</strong><br/><small>{new Date(e.created_at).toLocaleString()}</small></span>
    <strong style={{whiteSpace:"nowrap",color:e.entry_type==="transfer_debit"||e.entry_type==="adjustment_debit"?"#b42318":"#067647"}}>{e.entry_type==="transfer_debit"||e.entry_type==="adjustment_debit"?"−":"+"}AED {Number(e.amount_aed).toFixed(2)}</strong>
   </div>)}
  </div>}
 </section>;
}
