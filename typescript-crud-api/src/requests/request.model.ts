import { DataTypes, Model, Optional } from "sequelize";
import type { Sequelize } from "sequelize";

export interface WorkRequestAttributes {
    id: number;
    type: string;
    items: string; // JSON array stored as text
    status: string;
    date: string;
    accountId: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface WorkRequestCreationAttributes
    extends Optional<WorkRequestAttributes, "id" | "createdAt" | "updatedAt" | "status" | "date"> { }

export class WorkRequest
    extends Model<WorkRequestAttributes, WorkRequestCreationAttributes>
    implements WorkRequestAttributes {
    public id!: number;
    public type!: string;
    public items!: string;
    public status!: string;
    public date!: string;
    public accountId!: number;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

export default function (sequelize: Sequelize): typeof WorkRequest {
    WorkRequest.init(
        {
            id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
            type: { type: DataTypes.STRING, allowNull: false },
            items: { type: DataTypes.TEXT, allowNull: false },
            status: { type: DataTypes.STRING, allowNull: false, defaultValue: "Pending" },
            date: { type: DataTypes.DATEONLY, allowNull: false },
            accountId: { type: DataTypes.INTEGER, allowNull: false },
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
            modelName: "WorkRequest",
            tableName: "requests",
            timestamps: true,
        }
    );

    return WorkRequest;
}