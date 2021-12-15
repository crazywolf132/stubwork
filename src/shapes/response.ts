import { Response as ExpressResponse } from 'express';

export default interface Response extends ExpressResponse {
    confirm: () => void;
    fail: (message: string, status?: number) => void;
}