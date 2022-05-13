const express = require("express");
const Joi = require('joi').extend(require('@joi/date'));
const router = express.Router();
const {executeQuery} = require("../database");

//get user
router.get("/user", async function (req, res) {
    if(req.query.email) {
        let email = req.query.email;

        const user = await executeQuery(`select *, 
            DATE_FORMAT(date_of_birth, '%d/%m/%Y') as dob,
            DATE_FORMAT(date_registered, '%d/%m/%Y') as date  
            from users where email = '${email}'
            and is_active = 1`);
        if(user.length<1) {
            return res.status(401).send({
                "message" : "User not found"
            })
        }

        let active = "active";
        if(user[0].is_active === 0) active = "inactive";

        return res.status(401).send({
            "id" : user[0].id,
            "email" : user[0].email,
            "name" : user[0].fname + " " + user[0].lname,
            "date_of_birth" : user[0].dob,
            "date_registered" : user[0].date,
            "active" : active,
        })
    } else {
        const user = await executeQuery(`select *,
            DATE_FORMAT(date_of_birth, '%d/%m/%Y') as dob,
            DATE_FORMAT(date_registered, '%d/%m/%Y') as date
            from users
            where is_active = 1`);

        let array = [];
        for(let i=0; i<user.length;i++) {
            let active = "active";
            if(user[i].is_active === 0) active = "inactive";
            let temp = {
                "id" : user[i].id,
                "email" : user[i].email,
                "name" : user[i].fname + " " + user[i].lname,
                "date_of_birth" : user[i].dob,
                "date_registered" : user[i].date,
                "active" : active,
            }
            array.push(temp);
        }

        return res.status(401).send({array});
    }
});

//delete user
router.delete("/user/:email", async function (req, res) {
    if(req.params.email) {
        let email = req.params.email;

        const user = await executeQuery(`select * 
            from users 
            where email = '${email}'
            and is_active = 1`);
        if(user.length<1) {
            return res.status(400).send({
                "message" : "User not found"
            })
        }

        const update = await executeQuery(`update users 
            set date_updated = NOW(),
            is_active = 0 
            where email = '${user[0].email}'`);

        if(update) {
            return res.status(400).send({
                "message" : "Successfully deleted",
            })
        } else {
            return res.status(400).send({
                "message" : "Can't delete",
            })
        }
    }
});

module.exports = router;