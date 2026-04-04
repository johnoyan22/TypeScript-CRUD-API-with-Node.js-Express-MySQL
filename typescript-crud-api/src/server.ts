import express, { Application } from "express";
import cors from "cors";
import { errorHandler } from "./middleware/errorHandler"; 
import { initialize } from "./_helpers/db";
import userController from "./users/users.controller";

const app: Application = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

app.use("/users", userController);

app.use(errorHandler);

const PORT = process.env.PORT || 4000;

initialize()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`SERVER IS RUNNING ON http://localhost:${PORT}`);
            console.log(`TEST WITH: POST /users with {email, password, ....}`);
        });
    })
    .catch((err) => {
        console.log(`Failed to initialize database::`, err);
        process.exit(1);
    });