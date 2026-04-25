import { Department } from './../departments/department.model';

import config from "../../config.json"
import mysql from "mysql2/promise"
import { Sequelize } from "sequelize"

export interface Database {
    User: any;
    Account: any;
    Department: any;
    Employee: any;
    Request: any
}


export const db: Database = {} as Database;


export async function initialize(): Promise<void> {
    const { host, port, user, password, database } = config.database


    const connection = await mysql.createConnection({ host, port, user, password });
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\``);
    await connection.end()


    const sequelize = new Sequelize(database, user, password, { dialect: "mysql" })


    const { default: userModel } = await import("../users/user.model")
    const { default: accountModel } = await import("../accounts/account.model");
    const { default: departmentModel } = await import("../departments/department.model");
    const { default: employeeModel } = await import("../employees/employee.model");
    const { default: requestModel } = await import("../requests/request.model");

    db.User = userModel(sequelize)
    db.Account = accountModel(sequelize);
    db.Department = departmentModel(sequelize);
    db.Department = departmentModel(sequelize);
    db.Employee = employeeModel(sequelize);
    db.Request = requestModel(sequelize);

    db.Employee.belongsTo(db.Account, { foreignKey: "accountId", as: "account" });
    db.Employee.belongsTo(db.Department, { foreignKey: "departmentId", as: "department" });
    db.Request.belongsTo(db.Account, { foreignKey: "accountId", as: "account" });


    await sequelize.sync({ alter: true })
    await seedInitialData()




    console.log("_______DATABASE INITIALIZED AND MODELS SYNCED_______")

}

async function seedInitialData(): Promise<void> {
    const bcrypt = await import("bcryptjs");


    const accountCount: number = await db.Account.count();
    if (accountCount === 0) {
        await db.Account.create({
            title: "Mr",
            firstName: "Admin",
            lastName: "User",
            email: "admin@example.com",
            passwordHash: await bcrypt.default.hash("Password123!", 10),
            role: "Admin",
            verified: true,
            verificationToken: null,
        });
        console.log("✅ Seeded admin account → admin@example.com / Password123!");
    }


    const deptCount: number = await db.Department.count();
    if (deptCount === 0) {
        await db.Department.bulkCreate([
            { name: "Engineering", description: "Software development team" },
            { name: "HR", description: "Human Resources" },
            { name: "Finance", description: "Finance and accounting" },
        ]);
        console.log("✅ Seeded default departments");
    }
}