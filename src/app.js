import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

const app=express();

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

// where we data comes from
app.use(express.json({limit: "15kb"}));
app.use(express.urlencoded({extended: true, limit: "15kb"}));
app.use(express.static("public"));
app.use(cookieParser());

import userRouter from './routes/user.routes.js';


// routes declaration
app.use("/api/v1/users",userRouter)

// https://localhost:8000/users/register

export {app};