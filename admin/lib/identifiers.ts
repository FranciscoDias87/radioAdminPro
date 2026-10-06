export function validCpf(value:string){
 const n=value.replace(/[.\-\s]/g,"");if(!/^\d{11}$/.test(n)||/^(\d)\1{10}$/.test(n))return false;
 for(let length=9;length<=10;length++){let sum=0;for(let i=0;i<length;i++)sum+=Number(n[i])*(length+1-i);const digit=(sum*10)%11;if(Number(n[length])!==(digit===10?0:digit))return false;}
 return true;
}
export const normalizeDocument=(value:string)=>value.replace(/[.\/\-\s]/g,"").toUpperCase();
// Receita Federal: each CNPJ character contributes its ASCII code minus 48.
export function validCnpj(value:string){
 const n=normalizeDocument(value);if(!/^[A-Z0-9]{12}\d{2}$/.test(n)||/^(\d)\1{13}$/.test(n))return false;
 for(let length=12;length<=13;length++){let sum=0;for(let i=length-1,weight=2;i>=0;i--,weight=weight===9?2:weight+1)sum+=(n.charCodeAt(i)-48)*weight;const remainder=sum%11;if(Number(n[length])!==(remainder<2?0:11-remainder))return false;}
 return true;
}
