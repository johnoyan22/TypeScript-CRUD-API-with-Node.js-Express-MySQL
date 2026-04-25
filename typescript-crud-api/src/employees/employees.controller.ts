import type { Request, Response, NextFunction } from "express";
import { Router } from "express";
import Joi from "joi";
import { Role } from "../_helpers/role";
import { validateRequest } from "../middleware/validateRequest";
import { authorize } from "../middleware/auth";
import { employeeService } from "./employee.service";

const router = Router();

router.get("/", authorize([Role.Admin]), getAll);
router.get("/:id", authorize([Role.Admin]), getById);
router.post("/", authorize([Role.Admin]), createSchema, create);
router.put("/:id", authorize([Role.Admin]), updateSchema, update);
router.delete("/:id", authorize([Role.Admin]), _delete);

export default router;

function getAll(_req: Request, res: Response, next: NextFunction): void {
    employeeService.getAll().then((e) => res.json(e)).catch(next);
}

function getById(req: Request, res: Response, next: NextFunction): void {
    employeeService.getById(Number(req.params["id"])).then((e) => res.json(e)).catch(next);
}

function create(req: Request, res: Response, next: NextFunction): void {
    employeeService
        .create(req.body)
        .then(() => res.json({ message: "Employee created successfully" }))
        .catch(next);
}

function update(req: Request, res: Response, next: NextFunction): void {
    employeeService
        .update(Number(req.params["id"]), req.body)
        .then(() => res.json({ message: "Employee updated successfully" }))
        .catch(next);
}

function _delete(req: Request, res: Response, next: NextFunction): void {
    employeeService
        .delete(Number(req.params["id"]))
        .then(() => res.json({ message: "Employee deleted successfully" }))
        .catch(next);
}

function createSchema(req: Request, _res: Response, next: NextFunction): void {
    const schema = Joi.object({
        employeeId: Joi.string().required(),
        userEmail: Joi.string().email().required(),
        position: Joi.string().required(),
        departmentId: Joi.number().integer().required(),
        hireDate: Joi.string().required(),
    });
    validateRequest(req, next, schema);
}

function updateSchema(req: Request, _res: Response, next: NextFunction): void {
    const schema = Joi.object({
        employeeId: Joi.string().empty(""),
        userEmail: Joi.string().email().empty(""),
        position: Joi.string().empty(""),
        departmentId: Joi.number().integer(),
        hireDate: Joi.string().empty(""),
    });
    validateRequest(req, next, schema);
}