import {apiError} from "@/lib/api-security";
import {handleSigningBridge} from "@/lib/signing-bridge";
export async function POST(request:Request){try{return await handleSigningBridge(request);}catch(e){return apiError(e);}}
