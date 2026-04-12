import { Request, Response } from 'express';
export declare const getCommunities: (_req: Request, res: Response) => Promise<void>;
export declare const createCommunity: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updateCommunity: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deleteCommunity: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=communityController.d.ts.map