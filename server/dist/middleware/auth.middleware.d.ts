import { Request, Response, NextFunction } from 'express';
import { TokenPayload } from '../utils/jwt';
declare global {
    namespace Express {
        interface Request {
            user?: TokenPayload;
        }
    }
}
/**
 * Authenticate: verifies JWT access token from Authorization header.
 * Attaches decoded user payload to req.user.
 */
export declare function authenticate(req: Request, res: Response, next: NextFunction): void;
/**
 * Authorize: role-based access control middleware.
 * Use after authenticate middleware.
 * @param roles - Allowed roles for the endpoint
 */
export declare function authorize(...roles: string[]): (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.middleware.d.ts.map