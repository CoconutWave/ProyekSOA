const express = require("express");
const router = express.Router;

router.post("/register", async function (req, res) {
    const {fname, lname, email, password, confirm_password, date_of_birth} = req.body;
    try {
        
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