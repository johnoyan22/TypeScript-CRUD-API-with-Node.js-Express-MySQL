import { db } from "../_helpers/db";

export const employeeService = {
    getAll,
    getById,
    create,
    update,
    delete: _delete,
};

/** Shape the raw DB row into what the frontend expects (userEmail instead of accountId) */
function toDTO(emp: any): Record<string, unknown> {
    const plain = emp.get ? emp.get({ plain: true }) : emp;
    return {
        id: plain.id,
        employeeId: plain.employeeId,
        userEmail: plain.account?.email ?? "",
        accountId: plain.accountId,
        position: plain.position,
        departmentId: plain.departmentId,
        hireDate: plain.hireDate,
    };
}

async function getAll() {
    const rows = await db.Employee.findAll({
        include: [{ model: db.Account, as: "account", attributes: ["email"] }],
        order: [["employeeId", "ASC"]],
    });
    return rows.map(toDTO);
}

async function getById(id: number) {
    const emp = await db.Employee.findByPk(id, {
        include: [{ model: db.Account, as: "account", attributes: ["email"] }],
    });
    if (!emp) throw new Error("Employee not found");
    return toDTO(emp);
}

async function create(params: {
    employeeId: string;
    userEmail: string;
    position: string;
    departmentId: number;
    hireDate: string;
}) {
    const account = await db.Account.findOne({ where: { email: params.userEmail } });
    if (!account) throw new Error(`No account found with email "${params.userEmail}"`);

    const dept = await db.Department.findByPk(params.departmentId);
    if (!dept) throw new Error("Department not found");

    const existing = await db.Employee.findOne({ where: { employeeId: params.employeeId } });
    if (existing) throw new Error(`Employee ID "${params.employeeId}" is already in use`);

    await db.Employee.create({
        employeeId: params.employeeId,
        accountId: account.id,
        position: params.position,
        departmentId: params.departmentId,
        hireDate: params.hireDate,
    });
}

async function update(
    id: number,
    params: Partial<{
        employeeId: string;
        userEmail: string;
        position: string;
        departmentId: number;
        hireDate: string;
    }>
) {
    const emp = await db.Employee.findByPk(id);
    if (!emp) throw new Error("Employee not found");

    const updates: Record<string, unknown> = {};

    if (params.userEmail) {
        const account = await db.Account.findOne({ where: { email: params.userEmail } });
        if (!account) throw new Error(`No account found with email "${params.userEmail}"`);
        updates["accountId"] = account.id;
    }

    if (params.employeeId !== undefined) updates["employeeId"] = params.employeeId;
    if (params.position !== undefined) updates["position"] = params.position;
    if (params.departmentId !== undefined) updates["departmentId"] = params.departmentId;
    if (params.hireDate !== undefined) updates["hireDate"] = params.hireDate;

    await emp.update(updates);
}

async function _delete(id: number) {
    const emp = await db.Employee.findByPk(id);
    if (!emp) throw new Error("Employee not found");
    await emp.destroy();
}