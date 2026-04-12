import { Request, Response } from 'express';
export declare function createSession(req: Request, res: Response): Promise<void>;
export declare function getMySessions(req: Request, res: Response): Promise<void>;
export declare function getSessionByCode(req: Request, res: Response): Promise<void>;
export declare function markAttendance(req: Request, res: Response): Promise<void>;
export declare function getMyAttendance(req: Request, res: Response): Promise<void>;
export declare function getSessionRecords(req: Request, res: Response): Promise<void>;
export declare function getAttendanceStats(req: Request, res: Response): Promise<void>;
export declare function getMyPercentage(req: Request, res: Response): Promise<void>;
export declare function getTimetable(req: Request, res: Response): Promise<void>;
export declare function uploadTimetable(req: Request, res: Response): Promise<void>;
export declare function deleteTimetable(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=attendanceController.d.ts.map