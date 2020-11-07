import mongoose from "mongoose";

//criaçao do modelo
const accountSchema = mongoose.Schema({
  agencia: {
    type: Number,
    required: true,
  },
  conta: {
    type: Number,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  balance: {
    type: Number,
    required: true,
      validate(balance) {
        if (balance < 0)
           throw new Error("Saldo Insuficiente");
    }, 
    // min: 0,
  },

});

//definindo o modelo da coleção

const accountModel = mongoose.model("account", accountSchema);

export { accountModel };