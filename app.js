import express from "express";
import mongoose from "mongoose";
import { bankRouter } from "./routes/bank-router.js";

require("dotenv").config();

const app = express();

//conectando ao Mongo Atlas pelo mongoose
(async () => {
  try {
    mongoose.connect(
      `mongodb+srv://${process.env.USERDB}:${process.env.PWDDB}@cluster0.ua7an.mongodb.net/bank?retryWrites=true&w=majority`,
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }
    );
  } catch (error) {
    console.log("erro ao conectar no MongoDB Atlas" + err);
  }
})();

app.use(express.json());
app.use(bankRouter);

app.listen([process.env.PORT], () => console.log("API Iniciada"));
