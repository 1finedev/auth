import "dotenv/config";
import mongoose from "mongoose";
import app from "./app";

const DB = process.env.DATABASE_URI;

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("DB connected successfully!"));

const port = process.env.PORT || 6000;

const server = app.listen(port, () => {
  console.log(`App started  on port ${port}...`);
});

process.on("unhandledRejection", (err) => {
  console.log("UNHANDLED REJECTION! => SHUTTING DOWN...");
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

process.on("uncaughtException", (err) => {
  console.log("UNCAUGHT EXCEPTION! => SHUTTING DOWN...");
  console.log(err.name, err.message);
  process.exit(1);
});
