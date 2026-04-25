import { db } from "../_helpers/db";

export const requestService = {
    getAll,
    create,
    updateStatus,
};

interface RequestItem {
    name: string;
    qty: number;
}

function toDTO(row: any): Record<string, unknown> {
    const plain = row.get ? row.get({ plain: true }) : row;
    let items: RequestItem[] = [];
    try {
        items = JSON.parse(plain.items ?? "[]") as RequestItem[];
    } catch {
        items = [];
    }
    return {
        id: plain.id,
        type: plain.type,
        items,
        status: plain.status,
        date: plain.date,
        accountId: plain.accountId,
        employeeEmail: plain.account?.email ?? "",
    };
}

/** Admins see all requests; regular users see only their own */
async function getAll(accountId: number, role: string) {
    const where = role === "Admin" ? {} : { accountId };
    const rows = await db.Request.findAll({
        where,
        include: [{ model: db.Account, as: "account", attributes: ["email"] }],
        order: [["createdAt", "DESC"]],
    });
    return rows.map(toDTO);
}

async function create(accountId: number, params: { type: string; items: RequestItem[] }) {
    await db.Request.create({
        type: params.type,
        items: JSON.stringify(params.items),
        status: "Pending",
        date: new Date().toISOString().split("T")[0],
        accountId,
    });
}

async function updateStatus(id: number, status: string) {
    const req = await db.Request.findByPk(id);
    if (!req) throw new Error("Request not found");
    await req.update({ status });
}

