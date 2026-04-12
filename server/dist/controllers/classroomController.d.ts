import { Request, Response } from 'express';
export declare const getMyClassroom: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const createClassroom: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getMembers: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getNotes: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const uploadNote: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const downloadNote: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const deleteNote: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getMessages: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const postMessage: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const joinFaculty: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=classroomController.d.ts.map