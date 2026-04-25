import { db } from "../_helpers/db";

export const departmentService = {
    getAll,
    getById,
    create,
    update,
    delete: _delete,
};

async function getAll() {
    return await db.Department.findAll({ order: [["name", "ASC"]] });
}

async function getById(id: number) {
    const dept = await db.Department.findByPk(id);
    if (!dept) throw new Error("Department not found");
    return dept;
}

async function create(params: { name: string; description?: string }) {
    const existing = await db.Department.findOne({ where: { name: params.name } });
    if (existing) throw new Error(`Department "${params.name}" already exists`);
    return await db.Department.create(params);
}

async function update(id: number, params: Partial<{ name: string; description: string }>) {
    const dept = await db.Department.findByPk(id);
    if (!dept) throw new Error("Department not found");
    await dept.update(params);
}

async function _delete(id: number) {
    const dept = await db.Department.findByPk(id);
    if (!dept) throw new Error("Department not found");

    const linked = await db.Employee.count({ where: { departmentId: id } });
    if (linked > 0)
        throw new Error("Cannot delete department: it still has employees assigned to it");

    await dept.destroy();
}