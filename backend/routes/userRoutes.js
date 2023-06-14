import express from "express";
import authController from "../controllers/authController";

const router = express.Router();

router.get("/test", authController.test);

export default router;
