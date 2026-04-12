import { Request, Response } from 'express';
export declare const listPins: (_req: Request, res: Response) => Promise<void>;
export declare const createPin: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deletePin: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=mapPinController.d.ts.map