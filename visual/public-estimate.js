/* Public estimate: intervals remain intervals; excluded costs never become a net profit. */
(function(root){
'use strict';
function amount(value,name,optional=false,max=1e9){
 if(value===null||value===undefined||value===''){if(optional)return null;throw Error('Completá '+name+'.');}
 if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>max)throw Error('Revisá '+name+': ingresá un valor válido.');
 return value;
}
function interval(min,max=min){return {min,max};}
function parseMoney(value){
 const s=String(value).trim().replace(/[$\s]/g,'');if(!s)return null;
 if(s.includes(','))return /^[+-]?(?:\d+|\d{1,3}(?:\.\d{3})+),\d{0,2}$/.test(s)?Number(s.replace(/\./g,'').replace(',','.')):NaN;
 if(/^[+-]?\d{1,3}(?:\.\d{3})+$/.test(s))return Number(s.replace(/\./g,''));
 return /^[+-]?\d+(?:\.\d{0,2})?$/.test(s)?Number(s):NaN;
}
function weightOf(input){
 const explicit=amount(input.billableWeight,'el peso facturable',true,1e5);
 if(explicit!==null){if(explicit===0)throw Error('El peso debe ser mayor que cero.');return explicit;}
 const keys=['physicalWeight','height','width','length'];
 const values=keys.map(k=>amount(input[k],'el peso y las medidas',true,1e5));
 if(values.some(v=>v===0))throw Error('El peso y las medidas deben ser mayores que cero.');
 if(values.some(v=>v===null))return null;
 return Math.max(values[0],values[1]*values[2]*values[3]/4000);
}
function rowFor(rows,weight){return rows?.find(row=>row.maxKgInclusive===null||weight<=row.maxKgInclusive);}
function estimateShipping(input,rates,weight){
 const explicit=amount(input.shipping,'el envío',true);
 const required=input.price>=rates.freeShippingThreshold; // Separate, independently sourced rule.
 if(explicit!==null)return {amount:interval(explicit),source:'manual',required};
 if((input.shippingMode||'standard')!=='standard'||input.specialShipping)return {amount:null,source:'special',required};
 if(!required&&!input.voluntaryShipping)return {amount:interval(0),source:'buyer',required};
 if(weight===null)return {amount:null,source:'weight_pending',required};
 const rep=input.reputation||'unknown',keys=rep==='unknown'?['green','yellow','redOrange']:[rep==='red'?'redOrange':rep];
 if(keys.some(k=>!['green','yellow','redOrange'].includes(k)))throw Error('Revisá la reputación elegida.');
 const costs=[];let boundaryUncertain=false;
 for(const key of keys){
  const row=rowFor(rates.shipping?.[key]?.rows,weight);if(!row)return {amount:null,source:'table_pending',required};
  const table=rates.shipping[key],index=table.priceBands?.findIndex(b=>input.price>=b.minPriceInclusive&&(b.maxPriceExclusive===null||input.price<b.maxPriceExclusive));
  if(!Number.isInteger(index)||index<0)return {amount:null,source:'table_pending',required};
  const uncertain=table.ambiguousBoundaries?.includes(input.price)&&index>0;
  boundaryUncertain=boundaryUncertain||Boolean(uncertain);
  const indexes=uncertain?[index-1,index]:[index];
  for(const idx of indexes){const value=row.amounts[idx];if(!Number.isFinite(value)||value<0)throw Error('No pudimos verificar la tarifa de envío.');costs.push(value);}
 }
 return {amount:interval(Math.min(...costs),Math.max(...costs)),source:'table',required,boundaryUncertain};
}
function calculate(input,rates){
 if(!Number.isFinite(rates?.freeShippingThreshold)||rates.freeShippingThreshold<=0||!Number.isFinite(rates.fixedFeeThreshold)||rates.fixedFeeThreshold<=0)throw Error('No pudimos verificar los umbrales de cargos y envío.');
 const price=amount(input.price,'el precio'),cost=amount(input.cost,'el costo');
 if(price===0)throw Error('El precio debe ser mayor que cero.');
 const manualPercent=amount(input.feePercent,'la comisión',true,100);
 const fixed=amount(input.fixedFee,'el cargo fijo',true),other=amount(input.other,'otros gastos',true),weight=weightOf(input);
 const shippingEstimate=estimateShipping(input,rates,weight),shipping=shippingEstimate.amount;
 const c=rates?.commission;
 if(!c||!Number.isFinite(c.min)||!Number.isFinite(c.max)||c.min<0||c.min>c.max||c.max>100)throw Error('No pudimos verificar el rango de comisiones.');
 const selected=input.installments||'none',percent=rates.installments?.[selected];
 if(typeof percent!=='number'||!Number.isFinite(percent)||percent<0||percent>100)throw Error('Revisá la opción de cuotas.');
 const commission=manualPercent===null?interval(price*c.min/100,price*c.max/100):interval(price*manualPercent/100);
 const financing=price*percent/100;
 let fixedRange=fixed!==null?interval(fixed):price>=rates.fixedFeeThreshold?interval(0):null;
 // General marketplace only: Full Super has a separate tariff and is outside this estimate.
 if(!fixedRange&&Array.isArray(rates.fixedFeeRanges)){
  const band=rates.fixedFeeRanges.find(b=>price>=b.minPriceInclusive&&(b.maxPriceExclusive===null||price<b.maxPriceExclusive));
  if(band&&Number.isFinite(band.min)&&Number.isFinite(band.max)&&band.min>=0&&band.max>=band.min)fixedRange=interval(band.min,band.max);
 }
 if(fixed===null&&price<rates.fixedFeeThreshold){
  const bandIndex=rates.fixedFeeRanges?.findIndex(b=>price>=b.minPriceInclusive&&(b.maxPriceExclusive===null||price<b.maxPriceExclusive));
  const row=(input.shippingMode||'standard')==='standard'&&weight!==null?rowFor(rates.fixedFeeByWeight,weight):null;
  if(row&&Number.isFinite(row.amounts?.[bandIndex]))fixedRange=interval(row.amounts[bandIndex]);
  if(input.shippingMode==='flex'){
   const flex=rates.fixedFeeFlex?.find(b=>price>=b.minPriceInclusive&&(b.maxPriceExclusive===null||price<b.maxPriceExclusive));
   if(flex&&Number.isFinite(flex.amount))fixedRange=interval(flex.amount);
  }
 }
 const pending=[];
 if(!fixedRange)pending.push('cargo fijo');
 if(shipping===null)pending.push('envío');
 if(other===null)pending.push('otros gastos');
 pending.push('impuestos');
 const result=interval(price-cost-commission.max-financing-(fixedRange?.max??0)-(shipping?.max??0)-(other??0),price-cost-commission.min-financing-(fixedRange?.min??0)-(shipping?.min??0)-(other??0));
 return {price,cost,commission,financing,fixed:fixedRange,shipping,shippingEstimate,weight,other,result,pending,manualPercent,installments:selected,margin:interval(result.min/price*100,result.max/price*100)};
}
function calculateConcrete(input,rates){
 const feePercent=amount(input.feePercent,'la comisión de tu publicación',true,100);
 const officialTotal=amount(input.officialFeeTotal,'el cargo cotizado',true);
 const officialFixed=amount(input.officialFixedFee,'el cargo fijo cotizado',true);
 if(officialTotal!==null&&officialFixed!==null&&officialFixed>officialTotal)throw Error('El cargo fijo no puede superar el total cotizado.');
 const estimated=calculate({...input,feePercent:feePercent??0},rates);
 const exact=x=>x&&Math.abs(x.max-x.min)<.005?x.min:null;
 let fixed=exact(estimated.fixed),shipping=exact(estimated.shipping);
 const shippingBoundaryEstimate=shipping===null&&estimated.shippingEstimate.boundaryUncertain&&input.reputation&&input.reputation!=='unknown';
 if(shippingBoundaryEstimate)shipping=estimated.shipping.max;
 const missing=[];
 if(officialTotal===null&&feePercent===null)missing.push('commission');
 if(officialTotal===null&&fixed===null)missing.push('package');
 if(shipping===null)missing.push(estimated.shippingEstimate.source==='special'?'shipping_cost':estimated.weight===null?'package':'reputation');
 const fee=officialTotal===null?(feePercent===null?null:estimated.price*feePercent/100):officialTotal;
 if(officialTotal!==null)fixed=officialFixed;
 const feesTotal=officialTotal??(fee===null||fixed===null?null:fee+fixed+estimated.financing);
 const result=missing.length?null:estimated.price-estimated.cost-feesTotal-shipping-(estimated.other??0);
 return {status:result===null?'pending':'calculated',missing:[...new Set(missing)],price:estimated.price,cost:estimated.cost,commission:fee,feePercent,feesTotal,fixed,financing:officialTotal===null?estimated.financing:null,shipping,shippingEstimate:estimated.shippingEstimate,shippingBoundaryEstimate,other:estimated.other,weight:estimated.weight,result,margin:result===null?null:result/estimated.price*100,official:officialTotal!==null,pendingExpenses:[...(estimated.other===null?['otros gastos']:[]),'impuestos']};
}
const api={calculate,calculateConcrete,weightOf,estimateShipping,parseMoney};if(typeof module==='object'&&module.exports)module.exports=api;else root.VendraPublicEstimate=api;
})(typeof window==='object'?window:globalThis);
