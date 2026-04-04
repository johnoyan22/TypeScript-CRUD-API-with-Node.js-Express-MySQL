import bcrypt from "bcryptjs"
import { db } from "../_helpers/db"
import { Role } from "../_helpers/role"
import { User, UserCreationAttributes } from "./user.model"


export const userService = {
    getAll,
    getById,
    create,
    update,
    delete: _delete
}

async function getAll(): Promise<User[]> {
    return await db.User.findAll()
}

async function getById(id: number): Promise<User> {
    return await getUser(id)
}

async function create(params: UserCreationAttributes & { password: string }): Promise<void> {
    const existingUser = await db.User.findOne({ where: { email: params.email } })

    if (existingUser) {
        throw new Error(`Email ${params.email} is already registered`)
    }

    const passwordHash = await bcrypt.hash(params.password, 10)

    await db.User.create({
        ...params,
        passwordHash,
        role: params.role || Role.User
    } as UserCreationAttributes)
}

async function update(id: number, params: Partial<UserCreationAttributes> & { password?: string }): Promise<void> {
    const user = await getUser(id)

    if (params.password) {
        params.passwordHash = await bcrypt.hash(params.password, 10)
        delete params.password
    }


    await user.update(params as Partial<UserCreationAttributes>)
}


async function _delete(id: number): Promise<User> {
    const user = await getUser(id)
    await user.destroy()

    return user
}


async function getUser(id: number): Promise<User> {
    const user = await db.User.scope("withHash").findByPk(id)
    if (!user) {
        throw new Error("User Not Found")
    }

    return user

}
