import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "../_helpers/db";
import { Role } from "../_helpers/role";
import config from "../../config.json";

export const accountService = {
    authenticate,
    register,
    verifyEmail,
    getAll,
    getById,
    getCurrent,
    create,
    update,
    delete: _delete,
};

// ── Auth ──────────────────────────────────────────────────────────────────────

async function authenticate(email: string, password: string) {
    const account = await db.Account.scope("withHash").findOne({ where: { email } });
    if (!account) throw new Error("Email or password is incorrect");
    if (!account.verified) throw new Error("Please verify your email before logging in");

    const valid: boolean = await bcrypt.compare(password, account.passwordHash);
    if (!valid) throw new Error("Email or password is incorrect");

    const token = jwt.sign(
        { id: account.id, email: account.email, role: account.role },
        config.jwtSecret,
        { expiresIn: "7d" }
    );

    const plain = account.get({ plain: true }) as Record<string, unknown>;
    delete plain["passwordHash"];
    delete plain["verificationToken"];

    return { token, account: plain };
}

async function register(params: Record<string, unknown>) {
    const existing = await db.Account.findOne({ where: { email: params["email"] } });
    if (existing) throw new Error(`Email "${params["email"]}" is already registered`);

    const passwordHash = await bcrypt.hash(String(params["password"]), 10);

    // First account automatically becomes admin and is pre-verified
    const isFirstAccount = (await db.Account.count()) === 0;
    const verificationToken = isFirstAccount
        ? null
        : Math.random().toString(36).substring(2) +
        Date.now().toString(36) +
        Math.random().toString(36).substring(2);

    await db.Account.create({
        title: params["title"] ?? "Mr",
        firstName: params["firstName"],
        lastName: params["lastName"],
        email: params["email"],
        passwordHash,
        role: isFirstAccount ? Role.Admin : Role.User,
        verified: isFirstAccount,
        verificationToken,
    });

    return {
        message: isFirstAccount
            ? "Admin account created and verified. You may log in immediately."
            : "Registration successful. Please verify your email.",
        verificationToken,
    };
}

async function verifyEmail(token: string) {
    const account = await db.Account.scope("withHash").findOne({
        where: { verificationToken: token },
    });
    if (!account) throw new Error("Verification token is invalid or has already been used");

    await account.update({ verified: true, verificationToken: null });

    return { message: "Email verified successfully. You can now log in." };
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

async function getAll() {
    return await db.Account.findAll({ order: [["createdAt", "ASC"]] });
}

async function getById(id: number) {
    const account = await db.Account.findByPk(id);
    if (!account) throw new Error("Account not found");
    return account;
}

async function getCurrent(id: number) {
    return await getById(id);
}

async function create(params: Record<string, unknown>) {
    const existing = await db.Account.findOne({ where: { email: params["email"] } });
    if (existing) throw new Error(`Email "${params["email"]}" is already registered`);

    const passwordHash = await bcrypt.hash(String(params["password"]), 10);

    await db.Account.create({
        ...params,
        passwordHash,
        title: params["title"] ?? "Mr",
        role: params["role"] ?? Role.User,
        verified: params["verified"] ?? true,
        verificationToken: null,
    });
}

async function update(id: number, params: Record<string, unknown>) {
    const account = await db.Account.scope("withHash").findByPk(id);
    if (!account) throw new Error("Account not found");

    if (params["password"]) {
        params["passwordHash"] = await bcrypt.hash(String(params["password"]), 10);
        delete params["password"];
        delete params["confirmPassword"];
    }

    await account.update(params);
}

async function _delete(id: number) {
    const account = await db.Account.findByPk(id);
    if (!account) throw new Error("Account not found");
    await account.destroy();
}