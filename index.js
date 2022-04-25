const express = require("express");
const app = express();
const port = 8000;
const {executeQuery} = require("./database");

/*

219116852 - Indah Cahyani Styoningrum
219116856 - Lukky Hariyanto
219116858 - Ray Vitto Nugroho
219116860 - Steven Liem

*/


app.use(express.urlencoded({extended: true}));

app.listen(port, function () {
    console.log("API online, listening to port "+port);
});