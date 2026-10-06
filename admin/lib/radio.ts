export type Client = {id:string; name:string; document:string; contact:string; email:string; phone:string};
export type Contract = {id:string; clientId:string; title:string; start:string; end:string; amount:number; spots:number; duration:number; program:string; status:string; paid:boolean; delivered:number};
export const demoClients:Client[] = [
 {id:"demo-1",name:"Supermercado Bom Dia",document:"Dados de exemplo",contact:"Mariana Costa",email:"",phone:""},
 {id:"demo-2",name:"Auto Center Avenida",document:"Dados de exemplo",contact:"Rafael Lima",email:"",phone:""},
 {id:"demo-3",name:"Clínica Vida",document:"Dados de exemplo",contact:"Ana Martins",email:"",phone:""}];
export const demoContracts:Contract[] = [
 {id:"ex-001",clientId:"demo-1",title:"Ofertas da semana",start:"2026-10-01",end:"2026-10-31",amount:4800,spots:120,duration:30,program:"Rotativo • 06h às 18h",status:"Ativo",paid:false,delivered:24},
 {id:"ex-002",clientId:"demo-2",title:"Campanha de primavera",start:"2026-10-01",end:"2026-10-15",amount:2200,spots:60,duration:30,program:"Jornal da manhã",status:"Ativo",paid:true,delivered:20},
 {id:"ex-003",clientId:"demo-3",title:"Saúde em primeiro lugar",start:"2026-10-10",end:"2026-11-10",amount:3600,spots:90,duration:60,program:"Tarde musical",status:"Rascunho",paid:false,delivered:0}];
