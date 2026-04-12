import { Request, Response } from 'express';
/** GET /api/academics/subjects */
export declare function getSubjects(req: Request, res: Response): Promise<void>;
/** POST /api/academics/subjects — Admin only */
export declare function createSubject(req: Request, res: Response): Promise<void>;
/** GET /api/academics/marks/my — Student's marks */
export declare function getMyMarks(req: Request, res: Response): Promise<void>;
/** POST /api/academics/marks — Upload single mark */
export declare function uploadMark(req: Request, res: Response): Promise<void>;
/** POST /api/academics/marks/bulk — Bulk upload */
export declare function bulkUploadMarks(req: Request, res: Response): Promise<void>;
/** GET /api/academics/fees/structures */
export declare function getFeeStructures(req: Request, res: Response): Promise<void>;
/** POST /api/academics/fees/structures — Admin only */
export declare function createFeeStructure(req: Request, res: Response): Promise<void>;
/** GET /api/academics/fees/my — Student's fee payments */
export declare function getMyFees(req: Request, res: Response): Promise<void>;
/** POST /api/academics/fees/pay — Admin marks payment */
export declare function markFeePayment(req: Request, res: Response): Promise<void>;
/** GET /api/academics/fees/summary — Admin fee collection summary */
export declare function getFeeSummary(req: Request, res: Response): Promise<void>;
/** POST /api/academics/fees/receipt — Student uploads receipt */
export declare function uploadFeeReceipt(req: Request, res: Response): Promise<void>;
/** PUT /api/academics/fees/receipt/:paymentId/review — Admin approves/rejects */
export declare function reviewFeeReceipt(req: Request, res: Response): Promise<void>;
/** GET /api/academics/fees/receipts/pending — Admin gets all pending receipts */
export declare function getPendingReceipts(req: Request, res: Response): Promise<void>;
/** GET /api/academics/calendar */
export declare function getCalendarEvents(req: Request, res: Response): Promise<void>;
/** POST /api/academics/calendar — Admin */
export declare function createCalendarEvent(req: Request, res: Response): Promise<void>;
/** DELETE /api/academics/calendar/:id — Admin */
export declare function deleteCalendarEvent(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=academicsController.d.ts.map