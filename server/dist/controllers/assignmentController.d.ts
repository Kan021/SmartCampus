import { Request, Response } from 'express';
export declare const getAssignments: (req: Request, res: Response) => Promise<void>;
export declare const createAssignment: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const submitSolution: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getSubmission: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const gradeSubmission: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=assignmentController.d.ts.map