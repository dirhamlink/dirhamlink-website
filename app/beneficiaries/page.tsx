"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase/client";
import { DESTINATION_BANKS } from "../../lib/banks/destination-banks";

type Beneficiary = {
 id:string; destination_country:string; recipient_full_name:string; payout_method:string;
 bank_name:string|null; account_name:string|null; account_number:string|null;
 ifsc:string|null; bank_branch:string|null; bank_city:string|null; bank_branch_code?:string|null; upi_id:string|null;
};
const countries=["India","Pakistan","Nepal","Bangladesh","Egypt","Philippines","Sri Lanka"];
type BranchOption={id:string;bank_name:string;city:string|null;district:string|null;branch_name:string;branch_code:string|null;ifsc:string|null};
export default function BeneficiariesPage(){
 const router=useRouter();
 const [rows,setRows]=useState<Beneficiary[]>([]);
 const [userId,setUserId]=useState("");
 const [country,setCountry]=useState("India");
 const [name,setName]=useState("");
 const [method,setMethod]=useState("Bank account");
 const [bank,setBank]=useState("");
 const [holder,setHolder]=useState("");
 const [number,setNumber]=useState("");
 const [ifsc,setIfsc]=useState("");
 const [branch,setBranch]=useState("");
 const [city,setCity]=useState("");
 const [branchOptions,setBranchOptions]=useState<BranchOption[]>([]);
 const [branchSearch,setBranchSearch]=useState("");
 const [branchDirectoryMessage,setBranchDirectoryMessage]=useState("");
 const [branchCode,setBranchCode]=useState("");
 const [upi,setUpi]=useState("");
 const [editing,setEditing]=useState<string|null>(null);
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState("");
 const [success,setSuccess]=useState("");
 async function load(){
  const {data:auth}=await supabase.auth.getUser();
  if(!auth.user){router.replace("/login");return;}
  setUserId(auth.user.id);
  const {data,error}=await supabase.from("beneficiaries").select("*").eq("customer_id",auth.user.id).order("created_at",{ascending:false});
  if(error)setError(error.message); else setRows((data??[]) as Beneficiary[]);
  setLoading(false);
 }
 useEffect(()=>{void load();},[]);
 useEffect(()=>{
  let active=true;
  async function loadBranches(){
   setBranchOptions([]);setBranchDirectoryMessage("");
   if(!bank.trim()||!["India","Nepal","Pakistan"].includes(country))return;
   const {data,error}=await supabase.from("bank_branches").select("id,bank_name,city,district,branch_name,branch_code,ifsc").eq("country",country).eq("bank_name",bank.trim()).eq("is_active",true).order("city",{ascending:true}).limit(500);
   if(!active)return;
   if(error){setBranchDirectoryMessage("Branch directory is not available yet. Please enter branch and city manually.");return;}
   setBranchOptions((data??[]) as BranchOption[]);
   if(!data?.length)setBranchDirectoryMessage("No imported branch records for this bank yet. Please enter branch and city manually.");
  }
  void loadBranches();return()=>{active=false;};
 },[country,bank]);
 function reset(){
  setEditing(null);setName("");setBank("");setHolder("");setNumber("");setIfsc("");setBranch("");setCity("");setBranchCode("");setBranchSearch("");setUpi("");
 }
 function edit(row:Beneficiary){
  setEditing(row.id);setCountry(row.destination_country);setName(row.recipient_full_name);setMethod(row.payout_method);
  setBank(row.bank_name??"");setHolder(row.account_name??"");setNumber(row.account_number??"");setIfsc(row.ifsc??"");
  setBranch(row.bank_branch??"");setCity(row.bank_city??"");setBranchCode(row.bank_branch_code??"");setBranchSearch(row.bank_branch??"");setUpi(row.upi_id??"");setError("");setSuccess("");
 }
 async function save(e:FormEvent){
  e.preventDefault();setError("");setSuccess("");
  if(!userId)return;
  if(method==="UPI transfer"&&!upi.trim()){setError("Enter the recipient UPI ID.");return;}
  if(["Bank account","Bank transfer"].includes(method)&&(!bank.trim()||!holder.trim()||!number.trim())){setError("Enter bank name, account holder and account number.");return;}
  setSaving(true);
  const payload={customer_id:userId,destination_country:country,recipient_full_name:name.trim(),payout_method:method,
   bank_name:bank.trim()||null,account_name:holder.trim()||null,account_number:number.trim()||null,
   ifsc:ifsc.trim()||null,bank_branch:branch.trim()||null,bank_city:city.trim()||null,bank_branch_code:branchCode.trim()||null,upi_id:upi.trim()||null,updated_at:new Date().toISOString()};
  const result=editing
   ? await supabase.from("beneficiaries").update(payload).eq("id",editing)
   : await supabase.from("beneficiaries").insert(payload);
  if(result.error)setError(result.error.message);
  else{setSuccess(editing?"Beneficiary updated.":"Beneficiary saved.");reset();await load();}
  setSaving(false);
 }
 async function remove(id:string){
  if(!window.confirm("Delete this saved beneficiary?"))return;
  const {error}=await supabase.from("beneficiaries").delete().eq("id",id);
  if(error)setError(error.message);else setRows(r=>r.filter(x=>x.id!==id));
 }
 return <main className="auth-page"><section className="auth-card dashboard-card">
  <Link className="brand auth-brand" href="/account"><span className="brand-mark">D</span>DirhamLink</Link>
  <p className="eyebrow auth-eyebrow">Saved recipients</p><h1>Beneficiaries</h1>
  <p className="auth-intro">Save recipient details securely for quicker transfer requests. Only your account and authorised DirhamLink staff can access these details.</p>
  <form className="auth-form" onSubmit={save}>
   <label>Destination country<select value={country} onChange={e=>setCountry(e.target.value)}>{countries.map(c=><option key={c}>{c}</option>)}</select></label>
   <label>Recipient full name<input value={name} onChange={e=>setName(e.target.value)} required minLength={2} maxLength={120}/></label>
   <label>Payout method<select value={method} onChange={e=>setMethod(e.target.value)}><option>Bank account</option><option>Bank transfer</option><option>UPI transfer</option><option>Cash pickup</option></select></label>
   {["Bank account","Bank transfer"].includes(method)&&<>
    <label>Search bank name<input value={bank} onChange={e=>setBank(e.target.value)} required maxLength={120} list="beneficiary-bank-options" placeholder="Type to search bank name"/><datalist id="beneficiary-bank-options">{(DESTINATION_BANKS[country] ?? []).map(item=><option key={item} value={item}/>)}</datalist>{(country==="Nepal"||country==="Pakistan")&&<small>Select the bank name from the suggestions. Branch details are entered separately.</small>}</label>
    <label>Account holder name<input value={holder} onChange={e=>setHolder(e.target.value)} required maxLength={120}/></label>
    <label>Account number<input value={number} onChange={e=>setNumber(e.target.value)} required maxLength={40} autoComplete="off"/></label>
    <label>IFSC / routing code<input value={ifsc} onChange={e=>setIfsc(e.target.value.toUpperCase())} maxLength={20}/></label>
    <label>Search branch or area<input value={branchSearch} onChange={e=>setBranchSearch(e.target.value)} maxLength={120} placeholder="Type branch, city or area"/></label>
    {branchOptions.length>0&&<label>Select branch<select value={branchCode+"|"+branch} onChange={e=>{const item=branchOptions.find(x=>(x.branch_code??"")+"|"+x.branch_name===e.target.value);if(item){setBranch(item.branch_name);setBranchSearch(item.branch_name);setCity(item.city??item.district??"");setBranchCode(item.branch_code??"");if(item.ifsc)setIfsc(item.ifsc);}}}><option value="">Choose a listed branch</option>{branchOptions.filter(item=>(item.branch_name+" "+(item.city??"")+" "+(item.district??"")).toLowerCase().includes(branchSearch.toLowerCase())).map(item=><option key={item.id} value={(item.branch_code??"")+"|"+item.branch_name}>{item.branch_name} — {item.city??item.district??"Location unavailable"}{item.branch_code?" · "+item.branch_code:""}</option>)}</select></label>}
    {branchDirectoryMessage&&<small>{branchDirectoryMessage}</small>}
    <label>Branch code<input value={branchCode} onChange={e=>setBranchCode(e.target.value)} maxLength={40}/></label>
    <label>City / District<input value={city} onChange={e=>setCity(e.target.value)} maxLength={100}/></label>
   </>}
   {method==="UPI transfer"&&<label>UPI ID<input value={upi} onChange={e=>setUpi(e.target.value)} required maxLength={120}/></label>}
   {error&&<p className="auth-error" role="alert">{error}</p>}{success&&<p className="auth-success">{success}</p>}
   <button className="btn btn-primary auth-submit" disabled={saving}>{saving?"Saving…":editing?"Update beneficiary":"Save beneficiary"}</button>
   {editing&&<button type="button" className="btn btn-outline auth-submit" onClick={reset}>Cancel edit</button>}
  </form>
  <div className="dashboard-section-title">Your saved recipients</div>
  {loading?<div className="account-notice">Loading beneficiaries…</div>:rows.length===0?<div className="account-notice">No saved beneficiaries yet.</div>:rows.map(row=><article className="dashboard-tile" key={row.id} style={{marginBottom:10}}>
   <strong>{row.recipient_full_name}</strong><small>{row.destination_country} · {row.payout_method}</small>
   <small>{row.bank_name||row.upi_id||"Cash pickup"}{row.account_number?" · Account ending "+row.account_number.slice(-4):""}</small>
   <div style={{display:"flex",gap:8,marginTop:12}}><button className="btn btn-outline" type="button" onClick={()=>edit(row)}>Edit</button><button className="btn btn-outline" type="button" onClick={()=>void remove(row.id)}>Delete</button></div>
  </article>)}
  <Link className="auth-home" href="/account">← Back to dashboard</Link>
 </section></main>;
}
