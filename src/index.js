import express, { json } from "express";
import { v4 as uuid } from "uuid";

const customers = [];

const checkIfcustomerAlreadyHasAccount = (request, response, next) => {
  const { cpf } = request.headers;

  const customer = customers.find((customer) => customer.cpf === cpf);

  if (!customer) {
    return response
      .status(404)
      .json({ error: "The requested customer was not found" });
  }

  request.customer = customer;
  next();
};

const getBalance = (statement) => {
  const balance = statement.reduce((acc, operation) => {
    const amount =
      operation.type === "credit" ? operation.amount : -operation.amount;

    return acc + amount;
  }, 0);

  return balance;
};

const app = express();

app.use(json());

app.post("/account", (request, response) => {
  const { cpf, name } = request.body;

  const customerAlreadyExists = customers.some(
    (customer) => customer.cpf === cpf
  );

  if (customerAlreadyExists) {
    return response.status(400).json({ error: "customer already exists" });
  }

  customers.push({
    id: uuid(),
    cpf,
    name,
    statement: []
  });

  return response.status(201).send();
});

app.use(checkIfcustomerAlreadyHasAccount);

app.put("/account", (request, response) => {
  const { name } = request.body;
  const { customer } = request;

  customer.name = name;

  return response.status(204).send();
});

app.get("/account", (request, response) => {
  const { customer } = request;

  return response.json(customer);
});

app.delete("/account", (request, response) => {
  const { customer: currentCustomer } = request;

  customers.splice(
    customers.findIndex((customer) => customer.cpf === currentCustomer.cpf),
    1
  );

  return response.status(200).json(customers);
});

app.get("/statement", (request, response) => {
  const { customer } = request;

  return response.json(customer.statement);
});

app.get("/statement/date", (request, response) => {
  const { customer } = request;
  const { date } = request.query;

  const dateFormat = new Date(date + "T00:00");

  const statement = customer.statement.filter(
    (operation) =>
      operation.created_at.toDateString() === dateFormat.toDateString()
  );

  return response.json(statement);
});

app.post("/deposit", (request, response) => {
  const { description, amount } = request.body;

  const { customer } = request;

  const statementOperation = {
    description,
    amount,
    created_at: new Date(),
    type: "credit"
  };

  customer.statement.push(statementOperation);

  return response.status(201).send();
});

app.post("/withdraw", (request, response) => {
  const { amount } = request.body;
  const { customer } = request;

  const balance = getBalance(customer.statement);

  if (balance < amount) {
    return response.status(400).json({ error: "Insufficient funds!" });
  }

  const statementOperation = {
    amount,
    created_at: new Date(),
    type: "debit"
  };

  customer.statement.push(statementOperation);

  return response.status(201).send();
});

app.get("/balance", (request, response) => {
  const { customer } = request;

  const balance = getBalance(customer.statement);

  return response.json({ balance });
});

app.listen(3333);
