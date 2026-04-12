import { Request, Response } from 'express';
export declare const getManagement: (_req: Request, res: Response) => Promise<void>;
export declare const createManagement: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updateManagement: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deleteManagement: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=managementController.d.ts.map