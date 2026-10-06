import {PDFDocument,StandardFonts,rgb,type PDFFont} from 'pdf-lib';

export type ReportData={title:string;station:string;document?:string;context:string;generatedAt:string;headers:string[];rows:string[][];totals:string[];weights?:number[];numeric?:number[]};
const clean=(value:string)=>String(value??'').replace(/[\u0000-\u001f]/g,' ').replace(/[^\u0020-\u007e\u00a0-\u00ff]/g,' ');
function wrap(value:string,font:PDFFont,size:number,width:number){
 const lines:string[]=[];let line='';
 for(const word of clean(value).split(/\s+/)){
  const parts:string[]=[];let part='';
  for(const char of word){if(part&&font.widthOfTextAtSize(part+char,size)>width){parts.push(part);part='';}part+=char;}if(part)parts.push(part);
  for(const piece of parts){const next=line?`${line} ${piece}`:piece;if(line&&font.widthOfTextAtSize(next,size)>width){lines.push(line);line=piece;}else line=next;}
 }
 if(line)lines.push(line);return lines.length?lines:[''];
}
export async function reportPdf(data:ReportData){
 if(!data.headers.length||data.headers.length>12||data.rows.some(r=>r.length!==data.headers.length))throw Error('Colunas inválidas para o relatório.');
 const pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);
 const width=841.89,height=595.28,margin=32,usable=width-2*margin,size=data.headers.length>8?8.5:9,lineHeight=13;
 const weights=data.headers.map((_,i)=>Math.max(.5,data.weights?.[i]||1)),sum=weights.reduce((a,b)=>a+b,0),columns=weights.map(w=>usable*w/sum);
 const headings=data.headers.map((h,i)=>wrap(h,bold,size,columns[i]-12)),headingHeight=Math.max(...headings.map(h=>h.length))*lineHeight+12;
 let page=pdf.addPage([width,height]),y=0;
 const ink=rgb(.12,.18,.2),muted=rgb(.35,.42,.44);
 function text(value:string,x:number,top:number,strong=false,textSize=size){page.drawText(clean(value),{x,y:top-textSize,font:strong?bold:font,size:textSize,color:ink});}
 function begin(first=false){
  y=height-margin;
  for(const line of wrap(data.station,bold,14,usable)){text(line,margin,y,true,14);y-=18;}
  for(const line of wrap(data.title,bold,18,usable)){text(line,margin,y,true,18);y-=23;}
  const details=[data.document?`CPF/CNPJ da emissora: ${data.document}`:'',`Emissão: ${new Date(data.generatedAt).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})} (Brasília)`,data.context,...(first?data.totals:[])].filter(Boolean);
  for(const detail of details)for(const line of wrap(detail,font,9,usable)){text(line,margin,y,false,9);y-=13;}
  y-=12;
  if(y<headingHeight+100)throw Error('Cabeçalho muito extenso para o relatório.');
  page.drawRectangle({x:margin,y:y-headingHeight,width:usable,height:headingHeight,color:rgb(.9,.94,.94)});
  let x=margin;headings.forEach((lines,i)=>{lines.forEach((l,n)=>text(l,x+6,y-6-n*lineHeight,true));x+=columns[i];});y-=headingHeight;
 }
 begin(true);
 if(!data.rows.length){text('Nenhum registro encontrado para este filtro.',margin+6,y-15);y-=35;}
 for(const row of data.rows){
  const cells=row.map((v,i)=>wrap(v,font,size,columns[i]-12));let remaining=Math.max(...cells.map(c=>c.length)),offset=0;
  while(remaining){
   if(y<75){page=pdf.addPage([width,height]);begin();}
   const count=Math.min(remaining,Math.max(1,Math.floor((y-62)/lineHeight))),rowHeight=count*lineHeight+12;
   if(y-rowHeight<50){page=pdf.addPage([width,height]);begin();continue;}
   let x=margin;
   cells.forEach((lines,i)=>{lines.slice(offset,offset+count).forEach((line,n)=>{const right=data.numeric?.includes(i);const tx=right?x+columns[i]-6-font.widthOfTextAtSize(line,size):x+6;text(line,tx,y-6-n*lineHeight);});x+=columns[i];});
   y-=rowHeight;page.drawLine({start:{x:margin,y},end:{x:width-margin,y},thickness:.5,color:rgb(.8,.85,.86)});offset+=count;remaining-=count;
  }
 }
 pdf.getPages().forEach((p,i)=>{
  p.drawLine({start:{x:margin,y:35},end:{x:width-margin,y:35},thickness:.5,color:rgb(.8,.85,.86)});
  p.drawText('Relatório administrativo. Não substitui o contrato assinado.',{x:margin,y:22,font,size:8,color:muted});
  const footer=`${data.rows.length} registros | Página ${i+1} de ${pdf.getPageCount()}`;
  p.drawText(footer,{x:width-margin-font.widthOfTextAtSize(footer,8),y:22,font,size:8,color:muted});
 });
 pdf.setTitle(clean(data.title));pdf.setAuthor(clean(data.station));pdf.setCreationDate(new Date(data.generatedAt));pdf.setModificationDate(new Date(data.generatedAt));
 return new Uint8Array(await pdf.save());
}
