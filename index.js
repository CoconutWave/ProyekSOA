const express = require("express");
const app = express();
const port = 3000;
const {executeQuery} = require("./database");

const users = require("./routes/users");
const admin = require("./routes/admin");
app.use(express.urlencoded({extended: true}));

/*

219116852 - Indah Cahyani Styoningrum
219116856 - Lukky Hariyanto
219116858 - Ray Vitto Nugroho
219116860 - Steven Liem

*/
app.get("/api/test", function (req, res) {
    return res.status(200).send({message: "Berhasil"});
});

app.use("/api/users", users);

app.use("/api/admin", admin);

app.listen(port, function () {
    console.log("API online, listening to port "+port);
});