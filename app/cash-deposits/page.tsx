"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase/client";

type Beneficiary={id:string;destination_country:string;recipient_full_name:string;payout_method:string;bank_name:string|null;account_number:string|null;upi_id:string|null};
type Transfer={id:string;transaction_reference:string;send_amount_aed:number;status:string};
type Deposit={id:string;transfer_id:string;amount_aed:number;deposit_method:string;deposit_date:string;status:string;created_at:string;bank_reference:string|null;staff_note:string|null};
const bankDetails={bank:"Emirates NBD PJSC",iban:"AE850260000999511277701",account:"0999511277701",currency:"AED",swift:"EBILAEAD",branch:"Al Barsha 2 Branch, Dubai"};
export default function CashDepositsPage(){
 const router=useRouter();
 const [beneficiaries,setBeneficiaries]=useState<Beneficiary[]>([]);
 const [transfers,setTransfers]=useState<Transfer[]>([]);
 const [deposits,setDeposits]=useState<Deposit[]>([]);
 const [beneficiaryId,setBeneficiaryId]=useState("");
 const [amount,setAmount]=useState("");
 const [method,setMethod]=useState("CDM cash deposit");
 const [date,setDate]=useState(new Date().toISOString().slice(0,10));
 const [reference,setReference]=useState("");
 const [note,setNote]=useState("");
 const [file,setFile]=useState<File|null>(null);
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [success,setSuccess]=useState("");
 useEffect(()=>{(async()=>{
  const {data:auth}=await supabase.auth.getUser();if(!auth.user){router.replace("/login");return;}
  const [b,t,d]=await Promise.all([
   supabase.from("beneficiaries").select("id,destination_country,recipient_full_name,payout_method,bank_name,account_number,upi_id").order("created_at",{ascending:false}),
   supabase.from("transfers").select("id,transaction_reference,send_amount_aed,status").order("created_at",{ascending:false}),
   supabase.from("cash_deposit_submissions").select("id,transfer_id,amount_aed,deposit_method,deposit_date,status,created_at,bank_reference,staff_note").order("created_at",{ascending:false})
  ]);
  if(b.error)setError(b.error.message);else{setBeneficiaries((b.data??[]) as Beneficiary[]);if(b.data?.[0])setBeneficiaryId(b.data[0].id);}
  if(t.error)setError(t.error.message);else setTransfers((t.data??[]) as Transfer[]);
  if(d.error)setError(d.error.message);else setDeposits((d.data??[]) as Deposit[]);
  setLoading(false);
 })();},[router]);
 async function submit(e:FormEvent){
  e.preventDefault();setError("");setSuccess("");
  const {data:auth}=await supabase.auth.getUser();if(!auth.user){router.replace("/login");return;}
  const numeric=Number(amount);
  if(!beneficiaryId){setError("Choose a saved beneficiary first.");return;}
  if(!Number.isFinite(numeric)||numeric<1||numeric>100000){setError("Enter an amount between AED 1 and AED 100,000.");return;}
  if(file&&(file.size>5*1024*1024||!["image/jpeg","image/png","image/webp","application/pdf"].includes(file.type))){setError("Receipt must be JPG, PNG, WebP or PDF and no larger than 5 MB.");return;}
  setBusy(true);
  let receiptPath:string|null=null;
  try{
   if(file){
    receiptPath=auth.user.id+"/"+crypto.randomUUID()+"-"+file.name.replace(/[^a-zA-Z0-9._-]/g,"_");
    const {error:uploadError}=await supabase.storage.from("cash-deposit-receipts").upload(receiptPath,file,{upsert:false,contentType:file.type});
    if(uploadError)throw uploadError;
   }
   const {data,error:rpcError}=await supabase.rpc("create_transfer_from_cash_deposit",{
    p_beneficiary_id:beneficiaryId,p_amount_aed:numeric,p_deposit_method:method,p_deposit_date:date,
    p_bank_reference:reference.trim()||null,p_receipt_path:receiptPath,p_customer_note:note.trim()||null
   });
   if(rpcError)throw rpcError;
   const created=Array.isArray(data)?data[0]:data;
   if(!created?.transfer_id||!created?.transaction_reference)throw new Error("The system did not return a transaction reference. Please contact support before submitting again.");
   const selected=beneficiaries.find(b=>b.id===beneficiaryId);
   setSuccess("Transaction "+created.transaction_reference+" has been created for "+(selected?.recipient_full_name??"your beneficiary")+". Your deposit evidence is pending staff verification. No payout has been initiated.");
   setAmount("");setReference("");setNote("");setFile(null);
   const [t,d]=await Promise.all([
    supabase.from("transfers").select("id,transaction_reference,send_amount_aed,status").order("created_at",{ascending:false}),
    supabase.from("cash_deposit_submissions").select("id,transfer_id,amount_aed,deposit_method,deposit_date,status,created_at,bank_reference,staff_note").order("created_at",{ascending:false})
   ]);
   if(!t.error)setTransfers((t.data??[]) as Transfer[]);
   if(!d.error)setDeposits((d.data??[]) as Deposit[]);
  }catch(err){
   if(receiptPath)await supabase.storage.from("cash-deposit-receipts").remove([receiptPath]);
   const detail=err as {message?:string;details?:string;hint?:string;code?:string};
   setError([detail?.message,detail?.details,detail?.hint,detail?.code?("Code: "+detail.code):null].filter(Boolean).join(" — ")||"Could not create your transaction and deposit submission.");
  }finally{setBusy(false);}
 }
 const statusLabel=(s:string)=>s==="verified"?"Verified by staff":s==="rejected"?"Rejected":s==="under_review"?"Under review":"Submitted";
 return <main className="auth-page"><section className="auth-card dashboard-card">
  <Link className="brand auth-brand" href="/account"><span className="brand-mark">D</span>DirhamLink</Link>
  <p className="eyebrow auth-eyebrow">One-step transfer and funding</p><h1>Cash deposit</h1>
  <p className="auth-intro">Choose a saved beneficiary and enter the AED amount. DirhamLink will create a transfer record and attach your deposit submission in one step.</p>
  <div className="account-notice"><strong>Deposit account — {bankDetails.bank}</strong><br/>IBAN: {bankDetails.iban}<br/>Account number: {bankDetails.account}<br/>Currency: {bankDetails.currency}<br/>SWIFT: {bankDetails.swift}<br/>Branch: {bankDetails.branch}<br/><strong>Accepted methods:</strong> CDM cash deposit and bank branch cash deposit.</div>
  <div className="account-notice">Only deposit after staff has reviewed your beneficiary and issued instructions. Submitting this form creates a transaction and deposit review request; it does not confirm funds received. Staff must independently verify the bank/CDM records before payout processing.</div>
  {beneficiaries.length===0&&!loading?<div className="account-notice">You have no saved beneficiaries yet. <Link href="/beneficiaries">Add a beneficiary first →</Link></div>:<form className="auth-form" onSubmit={submit}>
   <label>Who should receive the transfer?<select value={beneficiaryId} onChange={e=>setBeneficiaryId(e.target.value)} required><option value="">Select saved beneficiary</option>{beneficiaries.map(b=><option key={b.id} value={b.id}>{b.recipient_full_name} — {b.destination_country} ({b.payout_method})</option>)}</select></label>
   {beneficiaries.find(b=>b.id===beneficiaryId)&&<div className="calc-result"><small>Selected beneficiary</small><strong>{beneficiaries.find(b=>b.id===beneficiaryId)?.recipient_full_name}</strong><small>{beneficiaries.find(b=>b.id===beneficiaryId)?.destination_country} · {beneficiaries.find(b=>b.id===beneficiaryId)?.payout_method}</small></div>}
   <label>Transfer / deposit amount (AED)<input type="number" min="1" max="100000" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} required placeholder="e.g. 1000"/></label>
   <label>Deposit method<select value={method} onChange={e=>setMethod(e.target.value)}><option value="CDM cash deposit">CDM cash deposit</option><option value="Bank branch cash deposit">Bank branch cash deposit</option></select></label>
   <label>Deposit date<input type="date" value={date} max={new Date().toISOString().slice(0,10)} onChange={e=>setDate(e.target.value)} required/></label>
   <label>Bank / CDM receipt reference (optional)<input value={reference} onChange={e=>setReference(e.target.value)} maxLength={120}/></label>
   <label>Receipt image or PDF (optional)<input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={e=>setFile(e.target.files?.[0]??null)}/><small>Private upload, maximum 5 MB.</small></label>
   <label>Additional note (optional)<textarea value={note} onChange={e=>setNote(e.target.value)} maxLength={500} rows={3}/></label>
   {error&&<p className="auth-error" role="alert">{error}</p>}{success&&<p className="auth-success" role="status">{success}</p>}
   <button className="btn btn-primary auth-submit" disabled={busy||loading||beneficiaries.length===0}>{busy?"Creating transaction…":"Create transaction and submit deposit"}</button>
  </form>}
  <div className="dashboard-section-title">Your deposit submissions</div>
  {loading?<div className="account-notice">Loading…</div>:deposits.length===0?<div className="account-notice">No deposit submissions yet.</div>:deposits.map(d=><div className="dashboard-tile" key={d.id} style={{marginBottom:10}}><strong>{transfers.find(t=>t.id===d.transfer_id)?.transaction_reference||"Transaction"}</strong><small>AED {Number(d.amount_aed).toFixed(2)} · {d.deposit_method} · {d.deposit_date}</small><span className="dashboard-action">{statusLabel(d.status)}</span>{d.staff_note&&<small>Staff note: {d.staff_note}</small>}</div>)}
  <Link className="auth-home" href="/account">← Back to dashboard</Link>
 </section></main>;
}
