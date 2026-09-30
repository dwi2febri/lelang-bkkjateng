export type CreditRule = {audience:"all"|"internal"|"external";minMonths:number;maxMonths:number|null;flatRate:number|null;annuityRate:number|null};
export type CreditProduct = {id:number;code:string;name:string;description:string;active:boolean;requiresEmployee:boolean;rules:CreditRule[];version:number};
export type CreditMethod = "flat"|"anuitas";
export function creditTerms(product:CreditProduct,months:number,requested:CreditMethod,audience="external") {
  if(!Number.isInteger(months)||months<1||months>1200)return null;
  const rule=product.rules.find(row=>row.audience===(product.requiresEmployee?audience:"all") && months>=row.minMonths && (row.maxMonths===null||months<=row.maxMonths));
  if(!rule)return null;
  const method:CreditMethod=requested==="flat"?(rule.flatRate!==null?"flat":"anuitas"):(rule.annuityRate!==null?"anuitas":"flat");
  const rate=method==="flat"?rule.flatRate:rule.annuityRate;
  return rate===null?null:{method,rate,rule};
}
export function creditCalculation(principal:number,months:number,rate:number,method:CreditMethod) {
  if(!Number.isFinite(principal)||principal<=0||principal>1e12||!Number.isInteger(months)||months<1||months>1200||!Number.isFinite(rate)||rate<0||rate>100)return null;
  const monthlyRate=rate/1200;
  const payment=method==="flat"?principal/months+principal*monthlyRate:monthlyRate===0?principal/months:principal*monthlyRate/(1-Math.pow(1+monthlyRate,-months));
  let balance=principal;
  const schedule=Array.from({length:months},(_,i)=>{
    const interest=method==="flat"?principal*monthlyRate:balance*monthlyRate;
    const capital=i===months-1?balance:Math.min(balance,method==="flat"?principal/months:payment-interest);
    balance=Math.max(0,balance-capital);
    return {month:i+1,capital,interest,payment:capital+interest,balance};
  });
  const totalInterest=schedule.reduce((sum,row)=>sum+row.interest,0);
  return {payment,totalInterest,totalPayment:principal+totalInterest,schedule};
}
