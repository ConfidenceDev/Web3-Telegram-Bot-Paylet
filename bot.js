require("dotenv").config();
const http = require("http");
const express = require("express");
const app = express();
const server = http.createServer(app);
const { config } = require("./cors/cors");
const main = require("./controllers/main");
const PORT = process.env.PORT || 4000;

app.use(config);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(main);

app.get("/", (req, res) => {
  res.send("Hello");
});

server.listen(PORT, () => console.log(`Server runing on port: ${PORT}`));
