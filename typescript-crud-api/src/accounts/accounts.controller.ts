import type { Request, Response, NextFunction } from "express";
import { Router } from "express";
import Joi from "joi";
import { Role } from "../_helpers/role";
import { validateRequest } from "../middleware/validateRequest";
import { authorize, type AuthRequest } from "../middleware/auth";
import { accountService } from "./account.service";

const router = Router();

// ── Public routes ─────────────────────────────────────────────────────────────
router.post("/register", registerSchema, register);
router.post("/authenticate", authenticateSchema, authenticate);
router.post("/verify-email", verifyEmail);

// ── Protected routes ─────────────────────────────────────────────────────────
router.get("/current", authorize(), getCurrent);
router.get("/", authorize([Role.Admin]), getAll);
router.get("/:id", authorize([Role.Admin]), getById);
router.post("/", authorize([Role.Admin]), createSchema, create);
router.put("/:id", authorize([Role.Admin]), updateSchema, update);
router.delete("/:id", authorize([Role.Admin]), _delete);

export default router;

// ── Handlers ─────────────────────────────────────────────────────────────────

function register(req: Request, res: Response, next: NextFunction): void {
    accountService.register(req.body).then((r) => res.json(r)).catch(next);
}

function authenticate(req: Request, res: Response, next: NextFunction): void {
    accountService
        .authenticate(req.body.email, req.body.password)
        .then((r) => res.json(r))
        .catch(next);
}

function verifyEmail(req: Request, res: Response, next: NextFunction): void {
    accountService.verifyEmail(req.body.token).then((r) => res.json(r)).catch(next);
}

function getCurrent(req: Request, res: Response, next: NextFunction): void {
    const id = (req as AuthRequest).user!.id;
    accountService.getCurrent(id).then((a) => res.json(a)).catch(next);
}

function getAll(_req: Request, res: Response, next: NextFunction): void {
    accountService.getAll().then((a) => res.json(a)).catch(next);
}

function getById(req: Request, res: Response, next: NextFunction): void {
    accountService.getById(Number(req.params["id"])).then((a) => res.json(a)).catch(next);
}

function create(req: Request, res: Response, next: NextFunction): void {
    accountService
        .create(req.body)
        .then(() => res.json({ message: "Account created successfully" }))
        .catch(next);
}

function update(req: Request, res: Response, next: NextFunction): void {
    accountService
        .update(Number(req.params["id"]), req.body)
        .then(() => res.json({ message: "Account updated successfully" }))
        .catch(next);
}

function _delete(req: Request, res: Response, next: NextFunction): void {
    const currentUserId = (req as AuthRequest).user!.id;
    const targetId = Number(req.params["id"]);

    if (currentUserId === targetId) {
        res.status(400).json({ message: "You cannot delete your own account" });
        return;
    }

    accountService
        .delete(targetId)
        .then(() => res.json({ message: "Account deleted successfully" }))
        .catch(next);
}

// ── Schemas ──────────────────────────────────────────────────────────────────

function registerSchema(req: Request, _res: Response, next: NextFunction): void {
    const schema = Joi.object({
        title: Joi.string().default("Mr"),
        firstName: Joi.string().required(),
        lastName: Joi.string().required(),
        email: Joi.string().email().required(),
        password: Joi.string().min(6).required(),
        confirmPassword: Joi.string().valid(Joi.ref("password")).required().messages({
            "any.only": "Passwords do not match",
        }),
    });
    validateRequest(req, next, schema);
}

function authenticateSchema(req: Request, _res: Response, next: NextFunction): void {
    const schema = Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().required(),
    });
    validateRequest(req, next, schema);
}

function createSchema(req: Request, _res: Response, next: NextFunction): void {
    const schema = Joi.object({
        title: Joi.string().default("Mr"),
        firstName: Joi.string().required(),
        lastName: Joi.string().required(),
        email: Joi.string().email().required(),
        password: Joi.string().min(6).required(),
        confirmPassword: Joi.string().valid(Joi.ref("password")).required(),
        role: Joi.string().valid(Role.Admin, Role.User).default(Role.User),
        verified: Joi.boolean().default(true),
    });
    validateRequest(req, next, schema);
}

function updateSchema(req: Request, _res: Response, next: NextFunction): void {
    const schema = Joi.object({
        title: Joi.string().empty(""),
        firstName: Joi.string().empty(""),
        lastName: Joi.string().empty(""),
        email: Joi.string().email().empty(""),
        password: Joi.string().min(6).empty(""),
        confirmPassword: Joi.string().valid(Joi.ref("password")).empty(""),
        role: Joi.string().valid(Role.Admin, Role.User).empty(""),
        verified: Joi.boolean(),
    });
    validateRequest(req, next, schema);
}