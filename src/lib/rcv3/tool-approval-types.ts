import type {ToolId} from './toolbox';
export type ToolRequest={id:string;text:string;at:string;status:'pending'|'approved'|'rejected';toolId?:ToolId;reviewedBy?:string;reviewedAt?:string};
export type ToolGrant={buttonId:string;toolId:ToolId;requestId:string;approvedBy:string;approvedAt:string};
