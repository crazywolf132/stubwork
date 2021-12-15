import { Request, Response } from '../shapes';

export const hooks = () => (req: Request, res: Response, next: () => void): void => {
    res.confirm = (): void => {
        res.json({ acknowledged: true });
    }

    res.fail = (message: string, statusCode?: number): void => {
        res.status(statusCode ?? 400).json({
            failed: true,
            message
        });
    }

    next();
}