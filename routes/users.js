const express = require("express");
const router = express.Router();
const {executeQuery} = require("../database");

const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

const generateUniqueApikey = (length) => {
    let apikey = "";
    for (let i = 0; i < length; i++) {
        apikey += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    console.log("Generated API: "+apikey);
    return apikey;
}

router.post("/register", async function (req, res) {
    console.log(req.body);
    const {fname, lname, email, password, confirm_password, date_of_birth} = req.body;
    let apikey;
    
    try {
        let check_api;
        do{
            apikey = generateUniqueApikey(10);
            check_api = await executeQuery(`select * from users where apikey = "${apikey}"`);
        }while(check_api.length > 0);
        let insert_user = await executeQuery(`insert into users
        values('',"${apikey}", 5, "${email}", "${fname}", "${lname}", "${password}", STR_TO_DATE("${date_of_birth}", "%d/%m/%Y"),
        NOW(), NOW(), 1)`);
        return res.status(200).send({
            message: "Registered successfully!",
            name: fname + " " + lname,
            email: email,
            date_of_birth : date_of_birth,
            API_key: apikey
        });
    } catch (error) {
        console.log(error);
        return res.status(500).send(error.toString());
    }
});

router.post("/login", async function (req, res) {
    const {email, password} = req.body;
    try {
        
    } catch (error) {
        console.log(error);
        return res.status(500).send(error.toString());
    }
});

module.exports = router;