import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import config from "../../config.json";

export interface AuthRequest extends Request {
    user?: { id: number; email: string; role: string };
}

export function authorize(roles: string[] = []) {
    return function (req: Request, res: Response, next: NextFunction): void {
        const authHeader = req.headers["authorization"];
        if (!authHeader?.startsWith("Bearer ")) {
            res.status(401).json({ message: "Unauthorized – no token provided" });
            return;
        }

        const token = authHeader.split(" ")[1];
        if (!token) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        try {
            const decoded = jwt.verify(token, config.jwtSecret) as {
                id: number;
                email: string;
                role: string;
            };
            (req as AuthRequest).user = decoded;

            if (roles.length && !roles.includes(decoded.role)) {
                res.status(403).json({ message: "Forbidden – admin access required" });
                return;
            }

            next();
        } catch {
            res.status(401).json({ message: "Invalid or expired token" });
        }
    };
}