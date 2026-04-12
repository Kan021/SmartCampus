import { Request, Response } from 'express';
export declare const searchUsers: (req: Request, res: Response) => Promise<void>;
export declare const getConversations: (req: Request, res: Response) => Promise<void>;
export declare const startConversation: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getMessages: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const sendMessage: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const blockUser: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const unblockUser: (req: Request, res: Response) => Promise<void>;
export declare const getBlockedUsers: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=chatController.d.ts.map