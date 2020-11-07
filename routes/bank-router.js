import express from "express";
import { accountModel } from "../models/accountModel.js";

const app = express();

app.post("/newaccount", async (req, res) => {
  try {
    const account = new accountModel(req.body);

    await account.save();
    res.send(account);
  } catch (error) {
    res.status(500).send(error);
  }
});

//RETRIEVE
app.get("/accounts", async (req, res) => {
  try {
    const account = await accountModel.find({});
    res.send(account);
  } catch (error) {
    res.status(500).send(error);
  }
});

//UPDATE
app.patch("/account/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const account = await accountModel.findByIdAndUpdate(
      { _id: id },
      req.body,
      { new: true }
    );
    res.send(account);
  } catch (error) {
    res.status(500).send(error);
  }
});

//DEPOSITO
app.patch(
  "/agencia/:agencia_id/conta/:conta_id/deposito",
  async (req, res, next) => {
    try {
      const { agencia_id, conta_id } = req.params;
      const { amount } = req.body;

      // await accountModel.updateOne(
      //   { agencia: agencia_id, conta: conta_id },
      //   { $inc: { balance: amount } }
      // );

      const data = await accountModel.findOne(
        { $and: [{ agencia: agencia_id }, { conta: conta_id }] },
        {}
      );
      if (!data) {
        res.status(404).send("Conta ou Agência não encontrada.");
      }

      data.balance += amount;
      await data.save();

      res.send(
        `Depósito realizado com sucesso. O salto atual é: R$ ${data.balance}`
      );
    } catch (err) {
      console.log(err);
    }
  }
);

//SAQUE
app.patch(
  "/agencia/:agencia_id/conta/:conta_id/saque",
  async (req, res, next) => {
    try {
      const { agencia_id, conta_id } = req.params;
      const { amount } = req.body;

      const data = await accountModel.findOne(
        { $and: [{ agencia: agencia_id }, { conta: conta_id }] },
        {}
      );
      if (!data) {
        res.status(404).send("Conta ou Agência não encontrada.");
      }
      const taxWithdrawal = 1;
      data.balance -= amount + taxWithdrawal;

      if (data.balance < 0) {
        res.status(422).send("Saldo insuficiente.");
      }
      await data.save();

      res.send(
        `Saque de R$ ${amount} realizado com sucesso. Taxa de R$ ${taxWithdrawal}. O salto atual é: R$ ${data.balance}`
      );
    } catch (err) {
      console.log(err);
    }
  }
);

//CONSULTAR O SALDO

app.get(
  "/account/agencia/:agencia_id/conta/:conta_id/saldo",
  async (req, res) => {
    try {
      const { agencia_id, conta_id } = req.params;

      const account = await accountModel.findOne(
        { $and: [{ agencia: agencia_id }, { conta: conta_id }] },
        { _id: 0, name: 1, balance: 1 }
      );

      if (!account) {
        res.status(404).send("Conta ou Agência não encontrada.");
      }

      res.send(account);
    } catch (error) {
      res.status(500).send(error);
    }
  }
);

//DELETE
app.delete(
  "/account/agencia/:agencia_id/conta/:conta_id/delete",
  async (req, res) => {
    try {
      const { agencia_id, conta_id } = req.params;

      const account = await accountModel.findOneAndDelete({
        // $and: [{ agencia: agencia_id }, { conta: conta_id }]
        agencia: agencia_id,
        conta: conta_id,
      });

      if (!account) {
        res.status(404).send("Conta ou Agência não encontrada.");
      }

      const totalAccounts = await accountModel.count({ agencia: agencia_id });

      res.send(`Essa agência ainda tem ${totalAccounts} contas!`);
    } catch (error) {
      res.status(500).send(error);
    }
  }
);

//TRANSFERENCIA
app.post(
  "/account/agencia/:agenciaOrigem_id/conta/:contaOrigem_id/transfer",
  async (req, res) => {
    try {
      const { agenciaOrigem_id, contaOrigem_id } = req.params;
      const { agenciaDestino, contaDestino, amount } = req.body;

      const dataOrigem = await accountModel.findOne(
        { $and: [{ agencia: agenciaOrigem_id }, { conta: contaOrigem_id }] },
        {}
      );

      const dataDestino = await accountModel.findOne(
        { $and: [{ agencia: agenciaDestino }, { conta: contaDestino }] },
        {}
      );

      if (!dataDestino || !dataOrigem) {
        res.status(404).send("Contas ou Agências não encontrada.");
      }

      //Retirando dinheiro da conta de Origem
      if (dataDestino.agencia !== dataOrigem.agencia) {
        const taxTransfer = 8;
        dataOrigem.balance -= amount + taxTransfer;
      } else {
        dataOrigem.balance -= amount;
      }
      if (dataOrigem.balance < 0) {
        res.status(422).send("Saldo insuficiente.");
      }
      await dataOrigem.save();

      //Enviando dinheiro para a conta de Destino
      dataDestino.balance += amount;

      await dataDestino.save();

      res.send(`O salto atual da sua conta é: R$ ${dataOrigem.balance}`);
    } catch (error) {
      res.status(500).send(error);
    }
  }
);

//MEDIA DE SALDO DE UMA AGENCIA
app.get("/account/agencia/:agencia_id/saldoAgencia", async (req, res) => {
  try {
    const { agencia_id } = req.params;

    const accounts = await accountModel.find(
      { agencia: agencia_id },
      { _id: 0, agencia: 1, conta: 1, balance: 1 }
    );

    if (!accounts) {
      res.status(404).send("Agência não encontrada.");
    }

    const avgBalance = await accountModel.aggregate([
      { $match: { agencia: parseInt(agencia_id) } },
      { $group: { _id: "$agencia", avg: { $avg: "$balance" } } },
    ]);
    console.log(avgBalance);

    res.send(
      `Os clientes dessa agência tem saldo em média de R$ ${avgBalance[0].avg}`
    );
  } catch (error) {
    res.status(500).send(error);
  }
});

//MENOR SALDO
app.get("/saldos/menores/:numero", async (req, res) => {
  try {
    const numero = parseInt(req.params.numero);

    const accounts = await accountModel
      .find({}, { _id: 0, name: 1, agencia: 1, conta: 1, balance: 1 })
      .sort({ balance: 1 })
      .limit(numero);

    res.send(accounts);
  } catch (error) {
    res.status(500).send(error);
  }
});

//MAIORES SALDOS
app.get("/saldos/maiores/:numero", async (req, res) => {
  try {
    const numero = parseInt(req.params.numero);

    const accounts = await accountModel
      .find({}, { _id: 0, name: 1, agencia: 1, conta: 1, balance: 1 })
      .sort({ balance: -1, name: 1 })
      .limit(numero);

    res.send(accounts);
  } catch (error) {
    res.status(500).send(error);
  }
});

//agencia private
app.post("/agencia/private", async (req, res) => {
  try {
    const topRicos = await accountModel.aggregate([
      {
        $sort: { balance: -1 },
      },
      {
        $group: {
          _id: "$agencia",
          id: { $first: "$_id" },
          name: { $first: "$name" },
          agencia: { $first: "$agencia" },
          conta: { $first: "$conta" },
          balance: { $first: "$balance" },
        },
      },
    ]);

    topRicos.forEach(async (account) => {
      await accountModel.findOneAndUpdate(
        { _id: account.id },
        {
          $set: {
            agencia: 99,
          },
        }
      );
    });

    const accountsClientsPrivateAggency = await accountModel.find({
      agencia: 99,
    });

    res.send(accountsClientsPrivateAggency);
  } catch (error) {
    res.status(500).send(error);
  }
});

export { app as bankRouter };
