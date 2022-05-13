const express = require("express");
const Joi = require('joi').extend(require('@joi/date'));
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

//register new user
router.post("/register", async function (req, res) {
    console.log(req.body);
    const schema =
        Joi.object({
            fname: Joi.string().required(),
            lname: Joi.string().required(),
            email: Joi.string().email({ minDomainSegments:2 }).required(),
            password: Joi.string().required(),
            confirm_password: Joi.string().required(),
            date_of_birth: Joi.date().format('DD/MM/YYYY').required(),
        })

    try {
        await schema.validateAsync(req.body);
    } catch (error) {
        return res.status(403).send(error.toString());
    }

    const {fname, lname, email, password, confirm_password, date_of_birth} = req.body;
    let apikey;

    if(password !== confirm_password) {
        return res.status(200).send({
            message: "Password don't match!"
        });
    }

    const user = await executeQuery(`select *
            from users where email = '${email}'
            and is_active = 1`);
    if(user.length>0) {
        return res.status(401).send({
            "message" : "Email has been used"
        })
    }
    
    try {
        let check_api;
        do{
            apikey = generateUniqueApikey(10);
            check_api = await executeQuery(`select * from users where apikey = "${apikey}"`);
        }while(check_api.length > 0);

        let insert_user = await executeQuery(`insert into users
            values('',"${apikey}", 5, "${email}", "${fname}", "${lname}", "${password}", STR_TO_DATE("${date_of_birth}", "%d/%m/%Y"),
            NOW(), NOW(), 1)`);
        if(insert_user) {
            return res.status(200).send({
                message: "Registered successfully!",
                name: fname + " " + lname,
                email: email,
                date_of_birth : date_of_birth,
                API_key: apikey
            });
        }
    } catch (error) {
        console.log(error);
        return res.status(500).send(error.toString());
    }
});

//generate key??
router.post("/login", async function (req, res) {
    const schema =
        Joi.object({
            email: Joi.string().email({ minDomainSegments:2 }).required(),
            password: Joi.string().required(),
        })

    try {
        await schema.validateAsync(req.body);
    } catch (error) {
        return res.status(403).send(error.toString());
    }

    const {email, password} = req.body;
    try {
        const users = await executeQuery(`select * from users where email = '${email}'`);
        if(users.length<1) {
            return res.status(404).send({
                "status" : 404,
                "message" : "User not found"
            })
        }
        if(users[0].password !== password){
            return res.status(400).send({
                "status" : 400,
                "message" : "Password tidak benar"
            })
        }


    } catch (error) {
        console.log(error);
        return res.status(500).send(error.toString());
    }
});

//update user
router.put("/update", async function (req, res) {
    let header = req.header('x-auth-token');

    if(!req.header('x-auth-token')) {
        return res.status(401).send("Unauthorized");
    }
    else {
        const user = await executeQuery(`select * 
            from users 
            where apikey = '${header}'
            and is_active = 1`);
        if(user.length<1) {
            return res.status(401).send({
                "message" : "User not found"
            })
        }

        let fname = user[0].fname;
        let lname = user[0].lname;
        let password = user[0].password;
        let date_of_birth = user[0].date_of_birth;

        if(req.body.fname) fname = req.body.fname;
        if(req.body.lname) lname = req.body.lname;
        if(req.body.password) {
            password = req.body.password;
            let confirm_password = req.body.confirm_password;
            if(password !== confirm_password) {
                return res.status(400).send({
                    message: "Password don't match!"
                });
            }
        }
        if(req.body.date_of_birth) date_of_birth = req.body.date_of_birth;

        const update = await executeQuery(`update users 
            set date_updated = NOW(),
            fname = '${fname}',
            lname = '${lname}',
            password = '${password}',
            date_of_birth = STR_TO_DATE("${date_of_birth}", "%d/%m/%Y")
            where email = '${user[0].email}' 
            and is_active = 1`);

        if(update) {
            return res.status(400).send({
                "message" : "Successfully updated",
            })
        } else {
            return res.status(400).send({
                "message" : "Can't update",
            })
        }

    }
});

//update photo-user
router.put("/updatePhoto", async function (req, res) {


});


module.exports = router;