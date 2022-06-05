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

Amadeus
    Api Key : 0YrbScJ4pF5UBPtAQegozM1fXF7RqEac
    Secret : enkGVSOu7GGYVXpf

    {
        "type": "amadeusOAuth2Token",
        "username": "octagon402@gmail.com",
        "application_name": "College Purposes",
        "client_id": "0YrbScJ4pF5UBPtAQegozM1fXF7RqEac",
        "token_type": "Bearer",
        "access_token": "L5rB4FAh1erSkX7iHEYmuFEJUVjQ",
        "expires_in": 1799,
        "state": "approved",
        "scope": ""
    }

*/
app.get("/api/test", function (req, res) {
    return res.status(200).send({message: "Berhasil a"});
});

app.use("/api/users", users);

app.use("/api/admin", admin);

app.listen(port, function () {
    console.log("API online, listening to port "+port);
});