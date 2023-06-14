import express from "express";
import authController from "../controllers/authController";

const router = express.Router();

router.get("/test", authController.test);
router.post("/register", authController.register);
router.post("/login", authController.login);

router.use(authController.protect);
router.get("/session", authController.session);

export default router;
