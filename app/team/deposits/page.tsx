"use client";

import { useEffect,useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase/client";

type Deposit={id:string;customer_id:string;transfer_id:string;amount_aed:number;deposit_method:string;deposit_date:string;bank_reference:string|null;receipt_path:string|null;customer_note:string|null;status:string;staff_note:string|null;created_at:string};
type Transfer={id:string;transaction_reference:string;customer_id:string};
export default function TeamDepositsPage(){
 const router=useRouter();
 const [rows,setRows]=useState<Deposit[]>([]);
 const [refs,setRefs]=useState<Record<string,string>>({});
 const [notes,setNotes]=useState<Record<string,string>>({});
 const [email,setEmail]=useState("");
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [busy,setBusy]=useState<string|null>(null);
 const [links,setLinks]=useState<Record<string,string>>({});
 useEffect(()=>{(async()=>{
  const {data:auth,error:authError}=await supabase.auth.getUser();
  if(authError||!auth.user){router.replace("/login?next=/team/deposits");return;}
  setEmail(auth.user.email??"");
  const {data:member}=await supabase.from("team_members").select("active").eq("user_id",auth.user.id).maybeSingle();
  if(!member?.active){setError("This account is not authorised for deposit review.");setLoading(false);return;}
  const [d,t]=await Promise.all([
   supabase.from("cash_deposit_submissions").select("*").order("created_at",{ascending:false}).limit(200),
   supabase.from("transfers").select("id,transaction_reference,customer_id")
  ]);
  if(d.error){setError(d.error.message);setLoading(false);return;}
  const deposits=(d.data??[]) as Deposit[];setRows(deposits);
  const transferMap:Record<string,string>={};((t.data??[]) as Transfer[]).forEach(x=>transferMap[x.id]=x.transaction_reference);setRefs(transferMap);
  const paths=deposits.filter(x=>x.receipt_path).map(x=>x.receipt_path as string);
  for(const path of paths){
   const {data}=await supabase.storage.from("cash-deposit-receipts").createSignedUrl(path,300);
   if(data?.signedUrl)setLinks(old=>({...old,[path]:data.signedUrl}));
  }
  setLoading(false);
 })();},[router]);
 async function decide(row:Deposit,decision:"received"|"not_received"){
  const received=decision==="received";
  const prompt=received
    ?"Confirm that the exact AED amount is visible as cleared/received in the actual bank or CDM account records. A receipt image alone is not proof. This moves the transfer to pending checks; it does not send money. Continue?"
    :"Confirm that the funds were not received after checking the bank or CDM account records. This will reject the deposit and cancel the linked transfer. Continue?";
  if(!window.confirm(prompt))return;
  setBusy(row.id);setError("");
  const {error}=await supabase.rpc("decide_dirhamlink_cash_deposit",{
    p_deposit_id:row.id,p_decision:decision,p_staff_note:notes[row.id]?.trim()||null
  });
  if(error)setError(error.message);
  else setRows(old=>old.map(x=>x.id===row.id?{...x,status:received?"verified":"rejected",staff_note:notes[row.id]?.trim()||null}:x));
  setBusy(null);
 }
 return <main className="auth-page team-page"><section className="auth-card dashboard-card team-card">
  <Link className="brand auth-brand" href="/team"><span className="brand-mark">D</span>DirhamLink</Link>
  <p className="eyebrow auth-eyebrow">Restricted staff access</p><h1>Cash deposit review</h1>
  <p className="auth-intro">Signed in as <strong>{email}</strong>. Verify funds against actual bank or CDM records before approving.</p>
  {error&&<div className="auth-error" role="alert">{error}</div>}
  {loading?<div className="account-notice">Loading deposit submissions…</div>:rows.length===0?<div className="account-notice">No cash deposit submissions.</div>:rows.map(row=><article className="team-transaction" key={row.id}>
   <div className="team-transaction-head"><div><strong>{refs[row.transfer_id]||row.transfer_id}</strong><small>{new Date(row.created_at).toLocaleString()}</small></div><span className="team-status">{row.status}</span></div>
   <div className="team-detail-grid">
    <div><small>Amount</small><strong>AED {Number(row.amount_aed).toFixed(2)}</strong></div>
    <div><small>Method</small><strong>{row.deposit_method}</strong></div>
    <div><small>Deposit date</small><strong>{row.deposit_date}</strong></div>
    <div><small>Bank / CDM reference</small><strong>{row.bank_reference||"Not supplied"}</strong></div>
    <div><small>Customer ID</small><strong className="team-id">{row.customer_id}</strong></div>
    <div><small>Customer note</small><strong>{row.customer_note||"—"}</strong></div>
   </div>
   {row.receipt_path&&links[row.receipt_path]&&<div className="account-notice" style={{marginTop:12}}>
    <strong>Customer-uploaded deposit receipt</strong>
    {/\.pdf$/i.test(row.receipt_path)?<><p><a href={links[row.receipt_path]} target="_blank" rel="noreferrer">Open PDF receipt (private link, expires in 5 minutes)</a></p><iframe title="Customer deposit receipt PDF" src={links[row.receipt_path]} style={{width:"100%",height:420,border:"1px solid #ddd",borderRadius:8}}/></>:<><a href={links[row.receipt_path]} target="_blank" rel="noreferrer"><img src={links[row.receipt_path]} alt="Customer-uploaded deposit receipt" style={{display:"block",width:"100%",maxHeight:420,objectFit:"contain",background:"#f7f7f7",borderRadius:8,marginTop:8}}/></a></>}
   </div>}
   {row.status!=="verified"&&row.status!=="rejected"?<>
    <label>Staff review note<textarea rows={2} maxLength={1000} value={notes[row.id]??""} onChange={e=>setNotes(old=>({...old,[row.id]:e.target.value}))}/></label>
    <div className="account-notice" style={{marginTop:12}}>
     <strong>Choose one payment decision</strong>
     <p>Check the actual bank/CDM account ledger and confirm the cleared amount matches AED {Number(row.amount_aed).toFixed(2)}. Do not rely on the uploaded receipt alone.</p>
     <div style={{display:"flex",gap:8,marginTop:12,flexWrap:"wrap"}}>
      <button type="button" className="btn btn-primary" disabled={busy!==null} onClick={()=>void decide(row,"received")}>{busy===row.id?"Saving…":"Payment received — verify funds"}</button>
      <button type="button" className="btn btn-outline" disabled={busy!==null} onClick={()=>void decide(row,"not_received")}>{busy===row.id?"Saving…":"Payment not received — cancel transfer"}</button>
     </div>
    </div>
   </>:<p className={row.status==="verified"?"auth-success":"auth-error"}>{row.status==="verified"?"Funds independently marked received; transfer moved to funds received / checks pending. Payout has not been initiated.":"Funds not received; deposit rejected and linked transfer cancelled."}{row.staff_note?" Staff note: "+row.staff_note:""}</p>}
  </article>)}
  <div className="account-notice">Verification advances a transfer only to “Funds received — checks pending”. It does not approve compliance or confirm recipient payout.</div>
  <Link className="auth-home" href="/team">← Back to team portal</Link>
 </section></main>;
}
