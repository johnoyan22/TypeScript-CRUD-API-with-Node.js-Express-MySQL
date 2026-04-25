import { DataTypes, Model, Optional } from "sequelize";
import type { Sequelize } from "sequelize";

export interface AccountAttributes {
    id: number;
    title: string;
    firstName: string;
    lastName: string;
    email: string;
    passwordHash: string;
    role: string;
    verified: boolean;
    verificationToken: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface AccountCreationAttributes
    extends Optional<AccountAttributes, "id" | "createdAt" | "updatedAt"> { }

export class Account
    extends Model<AccountAttributes, AccountCreationAttributes>
    implements AccountAttributes {
    public id!: number;
    public title!: string;
    public firstName!: string;
    public lastName!: string;
    public email!: string;
    public passwordHash!: string;
    public role!: string;
    public verified!: boolean;
    public verificationToken!: string | null;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

export default function (sequelize: Sequelize): typeof Account {
    Account.init(
        {
            id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
            title: { type: DataTypes.STRING, allowNull: false, defaultValue: "Mr" },
            firstName: { type: DataTypes.STRING, allowNull: false },
            lastName: { type: DataTypes.STRING, allowNull: false },
            email: { type: DataTypes.STRING, allowNull: false, unique: true },
            passwordHash: { type: DataTypes.STRING, allowNull: false },
            role: { type: DataTypes.STRING, allowNull: false, defaultValue: "User" },
            verified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
            verificationToken: { type: DataTypes.STRING, allowNull: true },
            createdAt: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW(),
            },
            updatedAt: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW(),
            },
        },
        {
            sequelize,
            modelName: "Account",
            tableName: "accounts",
            timestamps: true,
            defaultScope: {
                attributes: { exclude: ["passwordHash", "verificationToken"] },
            },
            scopes: {
                withHash: {
                    attributes: { include: ["passwordHash", "verificationToken"] },
                },
            },
        }
    );

    return Account;
}