import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

/** Validate req.body against a Zod schema; 400 with flattened errors on failure. */
export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    req.body = parsed.data;
    next();
  };
}
