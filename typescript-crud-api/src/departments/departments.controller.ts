import type { Request, Response, NextFunction } from "express";
import { Router } from "express";
import Joi from "joi";
import { Role } from "../_helpers/role";
import { validateRequest } from "../middleware/validateRequest";
import { authorize } from "../middleware/auth";
import { departmentService } from "./department.service";

const router = Router();

router.get("/", authorize(), getAll);
router.get("/:id", authorize(), getById);
router.post("/", authorize([Role.Admin]), createSchema, create);
router.put("/:id", authorize([Role.Admin]), updateSchema, update);
router.delete("/:id", authorize([Role.Admin]), _delete);

export default router;

function getAll(_req: Request, res: Response, next: NextFunction): void {
    departmentService.getAll().then((d) => res.json(d)).catch(next);
}

function getById(req: Request, res: Response, next: NextFunction): void {
    departmentService.getById(Number(req.params["id"])).then((d) => res.json(d)).catch(next);
}

function create(req: Request, res: Response, next: NextFunction): void {
    departmentService
        .create(req.body)
        .then((d) => res.json(d))
        .catch(next);
}

function update(req: Request, res: Response, next: NextFunction): void {
    departmentService
        .update(Number(req.params["id"]), req.body)
        .then(() => res.json({ message: "Department updated" }))
        .catch(next);
}

function _delete(req: Request, res: Response, next: NextFunction): void {
    departmentService
        .delete(Number(req.params["id"]))
        .then(() => res.json({ message: "Department deleted" }))
        .catch(next);
}

function createSchema(req: Request, _res: Response, next: NextFunction): void {
    const schema = Joi.object({
        name: Joi.string().required(),
        description: Joi.string().allow("").default(""),
    });
    validateRequest(req, next, schema);
}

function updateSchema(req: Request, _res: Response, next: NextFunction): void {
    const schema = Joi.object({
        name: Joi.string().empty(""),
        description: Joi.string().allow("").empty(""),
    });
    validateRequest(req, next, schema);
}