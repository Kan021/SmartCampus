"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = validate;
const zod_1 = require("zod");
/**
 * Validate request body against a Zod schema.
 * Returns 400 with detailed field-level errors on validation failure.
 */
function validate(schema) {
    return (req, res, next) => {
        try {
            schema.parse(req.body);
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                const fieldErrors = error.errors.map((e) => ({
                    field: e.path.join('.'),
                    message: e.message,
                }));
                res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: fieldErrors,
                });
                return;
            }
            next(error);
        }
    };
}
//# sourceMappingURL=validate.middleware.js.map