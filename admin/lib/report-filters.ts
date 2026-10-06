export type ReportFilters = {search:string; client:string; speaker:string; sector:string; status:string; stage:string; from:string; to:string; invoice:string; movement:string; method:string};
export const emptyReportFilters:ReportFilters = {search:'',client:'',speaker:'',sector:'',status:'',stage:'',from:'',to:'',invoice:'',movement:'',method:''};
export type FilterableReportRow = {search:string; client?:string; speaker?:string; sector?:string; status?:string; stage?:number; start:string; end?:string; invoice?:string; movement?:string; method?:string};
export function reportRangeError(filters:ReportFilters){return filters.from&&filters.to&&filters.from>filters.to?'A data final deve ser igual ou posterior à data inicial.':'';}
const normalize=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
export function matchesReportFilters(row:FilterableReportRow,filters:ReportFilters){
 if(reportRangeError(filters))return false;
 if(!normalize(row.search).includes(normalize(filters.search)))return false;
 for(const key of ['client','speaker','sector','status','invoice','movement','method'] as const)if(filters[key]&&row[key]!==filters[key])return false;
 if(filters.stage&&String(row.stage)!==filters.stage)return false;
 // Contract periods overlap the selected interval; dated entries use start = end.
 return (!filters.from||(row.end||row.start)>=filters.from)&&(!filters.to||row.start<=filters.to);
}
