import * as records from '../app/api/records/route';
import * as actions from '../app/api/actions/route';
import * as workflow from '../app/api/workflow/route';
import * as signing from '../app/api/signing-bridge/route';
import * as document from '../app/api/workflow/document/route';
import * as operators from '../app/api/operators/route';
import * as audit from '../app/api/audit/route';
// Entry point used only by the isolated Miniflare test bundle, never by the app.
const routes:any={'/api/records':records,'/api/actions':actions,'/api/workflow':workflow,'/api/signing-bridge':signing,'/api/workflow/document':document,'/api/operators':operators,'/api/audit':audit};
export default {fetch(request:Request){const handler=routes[new URL(request.url).pathname]?.[request.method];return handler?handler(request):new Response('Not found',{status:404});}};
