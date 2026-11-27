"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase/client";

type Transfer={id:string;transaction_reference:string;send_amount_aed:number;status:string};
type Deposit={id:string;transfer_id:string;amount_aed:number;deposit_method:string;deposit_date:string;status:string;created_at:string;bank_reference:string|null;staff_note:string|null};
const bankDetails={bank:"Emirates NBD PJSC",iban:"AE850260000999511277701",account:"099951277701",currency:"AED",swift:"EBILAEAD",branch:"Al Barsha 2 Branch, Dubai"};
export default function CashDepositsPage(){
 const router=useRouter();
 const [transfers,setTransfers]=useState<Transfer[]>([]);
 const [deposits,setDeposits]=useState<Deposit[]>([]);
 const [transferId,setTransferId]=useState("");
 const [amount,setAmount]=useState("");
 const [method,setMethod]=useState("CDM cash deposit");
 const [date,setDate]=useState(new Date().toISOString().slice(0,10));
 const [reference,setReference]=useState("");
 const [note,setNote]=useState("");
 const [file,setFile]=useState<File|null>(null);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [success,setSuccess]=useState("");
 useEffect(()=>{(async()=>{
  const {data:auth}=await supabase.auth.getUser();if(!auth.user){router.replace("/login");return;}
  const [t,d]=await Promise.all([
   supabase.from("transfers").select("id,transaction_reference,send_amount_aed,status").order("created_at",{ascending:false}),
   supabase.from("cash_deposit_submissions").select("id,transfer_id,amount_aed,deposit_method,deposit_date,status,created_at,bank_reference,staff_note").order("created_at",{ascending:false})
  ]);
  if(t.error)setError(t.error.message);else{setTransfers((t.data??[]) as Transfer[]);if(t.data?.[0])setTransferId(t.data[0].id);}
  if(d.error)setError(d.error.message);else setDeposits((d.data??[]) as Deposit[]);
 })();},[router]);
 async function submit(e:FormEvent){
  e.preventDefault();setError("");setSuccess("");
  const {data:auth}=await supabase.auth.getUser();if(!auth.user){router.replace("/login");return;}
  const numeric=Number(amount);
  if(!transferId||!Number.isFinite(numeric)||numeric<=0){setError("Choose a transaction and enter the deposited amount.");return;}
  if(file&&(file.size>5*1024*1024||!["image/jpeg","image/png","image/webp","application/pdf"].includes(file.type))){setError("Receipt must be JPG, PNG, WebP or PDF and no larger than 5 MB.");return;}
  setBusy(true);
  try{
   let receiptPath:string|null=null;
   if(file){
    receiptPath=auth.user.id+"/"+crypto.randomUUID()+"-"+file.name.replace(/[^a-zA-Z0-9._-]/g,"_");
    const {error:uploadError}=await supabase.storage.from("cash-deposit-receipts").upload(receiptPath,file,{upsert:false,contentType:file.type});
    if(uploadError)throw uploadError;
   }
   const {data,error:insertError}=await supabase.from("cash_deposit_submissions").insert({
    customer_id:auth.user.id,transfer_id:transferId,amount_aed:numeric,deposit_method:method,deposit_date:date,
    bank_reference:reference.trim()||null,receipt_path:receiptPath,customer_note:note.trim()||null,status:"submitted"
   }).select("id,transfer_id,amount_aed,deposit_method,deposit_date,status,created_at,bank_reference,staff_note").single();
   if(insertError)throw insertError;
   setDeposits(rows=>[data as Deposit,...rows]);setAmount("");setReference("");setNote("");setFile(null);
   setSuccess("Deposit evidence submitted. It is pending staff verification; this submission does not mean funds have been received or cleared.");
  }catch(err){setError(err instanceof Error?err.message:"Could not submit deposit details.");}
  finally{setBusy(false);}
 }
 const statusLabel=(s:string)=>s==="verified"?"Verified by staff":s==="rejected"?"Rejected":s==="under_review"?"Under review":"Submitted";
 return <main className="auth-page"><section className="auth-card dashboard-card">
  <Link className="brand auth-brand" href="/account"><span className="brand-mark">D</span>DirhamLink</Link>
  <p className="eyebrow auth-eyebrow">Funding and receipt verification</p><h1>Cash deposits</h1>
  <p className="auth-intro">Use these authorised AED account details only after your transfer has been reviewed and DirhamLink staff has instructed you to deposit.</p>
  <div className="account-notice"><strong>Deposit account — {bankDetails.bank}</strong><br/>Account name: DirhamLink<br/>IBAN: {bankDetails.iban}<br/>Account number: {bankDetails.account}<br/>Currency: {bankDetails.currency}<br/>SWIFT: {bankDetails.swift}<br/>Branch: {bankDetails.branch}<br/><strong>Accepted methods:</strong> CDM cash deposit and bank branch cash deposit.</div>
  <div className="account-notice">Do not deposit before receiving approval for your specific transaction. Never rely on a receipt image alone as proof of funds. DirhamLink staff must independently verify the deposit in the account or bank records.</div>
  <form className="auth-form" onSubmit={submit}>
   <label>Transaction<select value={transferId} onChange={e=>setTransferId(e.target.value)} required><option value="">Select a transaction</option>{transfers.filter(t=>!["payout_confirmed","rejected","cancelled"].includes(t.status)).map(t=><option key={t.id} value={t.id}>{t.transaction_reference} — AED {Number(t.send_amount_aed).toFixed(2)} ({t.status})</option>)}</select></label>
   <label>Amount deposited (AED)<input type="number" min="0.01" max="100000" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} required/></label>
   <label>Deposit method<select value={method} onChange={e=>setMethod(e.target.value)}><option value="CDM cash deposit">CDM cash deposit</option><option value="Bank branch cash deposit">Bank branch cash deposit</option></select></label>
   <label>Deposit date<input type="date" value={date} onChange={e=>setDate(e.target.value)} required/></label>
   <label>Bank / CDM receipt reference (optional)<input value={reference} onChange={e=>setReference(e.target.value)} maxLength={120}/></label>
   <label>Receipt image or PDF (optional)<input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={e=>setFile(e.target.files?.[0]??null)}/><small>Private upload, maximum 5 MB.</small></label>
   <label>Additional note (optional)<textarea value={note} onChange={e=>setNote(e.target.value)} maxLength={500} rows={3}/></label>
   {error&&<p className="auth-error" role="alert">{error}</p>}{success&&<p className="auth-success" role="status">{success}</p>}
   <button className="btn btn-primary auth-submit" disabled={busy||transfers.length===0}>{busy?"Submitting…":"Submit deposit for verification"}</button>
  </form>
  <div className="dashboard-section-title">Your deposit submissions</div>
  {deposits.length===0?<div className="account-notice">No deposit submissions yet.</div>:deposits.map(d=><div className="dashboard-tile" key={d.id} style={{marginBottom:10}}><strong>{transfers.find(t=>t.id===d.transfer_id)?.transaction_reference||"Transaction"}</strong><small>AED {Number(d.amount_aed).toFixed(2)} · {d.deposit_method} · {d.deposit_date}</small><span className="dashboard-action">{statusLabel(d.status)}</span>{d.staff_note&&<small>Staff note: {d.staff_note}</small>}</div>)}
  <Link className="auth-home" href="/account">← Back to dashboard</Link>
 </section></main>;
}
