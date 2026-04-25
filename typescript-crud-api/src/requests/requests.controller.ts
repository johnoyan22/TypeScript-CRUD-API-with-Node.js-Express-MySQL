import type { Request, Response, NextFunction } from "express";
import { Router } from "express";
import Joi from "joi";
import { Role } from "../_helpers/role";
import { validateRequest } from "../middleware/validateRequest";
import { authorize, type AuthRequest } from "../middleware/auth";
import { requestService } from "./request.service";

const router = Router();

router.get("/", authorize(), getAll);
router.post("/", authorize(), createSchema, create);
router.put("/:id/status", authorize([Role.Admin]), updateStatus);

export default router;

function getAll(req: Request, res: Response, next: NextFunction): void {
    const { id, role } = (req as AuthRequest).user!;
    requestService.getAll(id, role).then((r) => res.json(r)).catch(next);
}

function create(req: Request, res: Response, next: NextFunction): void {
    const { id } = (req as AuthRequest).user!;
    requestService
        .create(id, req.body)
        .then(() => res.json({ message: "Request submitted successfully" }))
        .catch(next);
}

function updateStatus(req: Request, res: Response, next: NextFunction): void {
    requestService
        .updateStatus(Number(req.params["id"]), req.body.status)
        .then(() => res.json({ message: "Status updated" }))
        .catch(next);
}

function createSchema(req: Request, _res: Response, next: NextFunction): void {
    const schema = Joi.object({
        type: Joi.string().valid("Equipment", "Leave", "Resources").required(),
        items: Joi.array()
            .items(
                Joi.object({
                    name: Joi.string().required(),
                    qty: Joi.number().integer().min(1).required(),
                })
            )
            .min(1)
            .required(),
    });
    validateRequest(req, next, schema);
}