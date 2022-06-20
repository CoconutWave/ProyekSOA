const { default: axios } = require("axios");
const express = require("express");
const Joi = require('joi').extend(require('@joi/date'));
const router = express.Router();
const {executeQuery} = require("../database");
const jwt = require("jsonwebtoken");

// ------------------ VAR ------------------
const key = "Bearer iCJpEeXozfR3PLY5s3QHBgFPdmML";//aku ganti punyaku
let secret = "proyeksoa";

// ------------------ FUNCTION ------------------
const genID = (length) => {
    const alphabets= 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890'.split('');
    let key= '';
    for (let i = length; i > 0; --i) key += alphabets[Math.floor(Math.random() * alphabets.length)];
    return key;
};

const genSecret = () => {
    const alphabets= 'abcdefghijklmnopqrstuvwxyz1234567890'.split('');
    let key= '';
    for (let i = 8; i > 0; --i) key += alphabets[Math.floor(Math.random() * alphabets.length)];
    key+="-";
    for (let i = 4; i > 0; --i) key += alphabets[Math.floor(Math.random() * alphabets.length)];
    key+="-";
    for (let i = 4; i > 0; --i) key += alphabets[Math.floor(Math.random() * alphabets.length)];
    key+="-";
    for (let i = 4; i > 0; --i) key += alphabets[Math.floor(Math.random() * alphabets.length)];
    key+="-";
    for (let i = 12; i > 0; --i) key += alphabets[Math.floor(Math.random() * alphabets.length)];
    return key;
};

//register developer (name) => client_id & client_secret [DONE]
router.post("/register", async function (req, res) {
    const schema =
        Joi.object({
            developer_name: Joi.string().required(),
        })

    try {
        await schema.validateAsync(req.body);
    } catch (error) {
        return res.status(403).send(error.toString());
    }

    let developer_name = req.body.developer_name;
    let client_id = genID(10);
    let client_secret  = genSecret();

    let insert = `insert into developer_account values (
        '${client_id}', '${client_secret}', '${developer_name}')`;
    let hasilCek = await executeQuery(insert);

    if(hasilCek) {
       return res.status(200).send({
           "client_id" : client_id,
           "client_secret" : client_secret,
           "developer_name" :developer_name
        });
    }
    return res.status(501).send({"msg":"NOT IMPLEMENTED"});
});

//generate token (1 hari) [PERIKSA]
router.post("/login", async function (req, res) {
    const schema =
        Joi.object({
            client_id: Joi.string().required(),
            client_secret: Joi.string().required(),
        })

    try {
        await schema.validateAsync(req.body);
    } catch (error) {
        return res.status(403).send(error.toString());
    }

    let client_id = req.body.client_id;
    let client_secret  = req.body.client_secret;

    console.log(req.body);

    let cek = `select * from developer_account where client_id = '${client_id}'`; //and client_secret = '${client_secret}
    let hasilCek = await executeQuery(cek);

    if(hasilCek.length < 1) return res.status(400).send({"msg":"client id atau secret salah!"});
    else {
        let token = jwt.sign({client_id: client_id, client_secret: client_secret}, secret, {expiresIn: '86400s'});
        return res.status(200).send({
            "token" : token
        });
    }
    return res.status(501).send({"msg":"NOT IMPLEMENTED"});
});

//bayar ?? [BELUM]
router.get("/bill", async function (req, res) {
    if(!req.header('x-auth-token')) return res.status(401).send({"msg":"token tidak ditemukan!"});
    let header = req.header('x-auth-token');
    let userdata;
    try {
        userdata = jwt.verify(header, secret);
    } catch (error) {
        return res.status(400).send({"msg":"token tidak valid!"});
    }
    let user_id = userdata.client_id;

    let data = await executeQuery(`select * from access_log where client_id = '${user_id}'`);
    let count = data.length;
    let bill = count * 0.1;
    return res.status(200).send({
        "bill":bill
    });
    return res.status(501).send({"msg":"NOT IMPLEMENTED"});
});

//get user [PERIKSA]
router.get("/user", async function (req, res) {
    if(!req.header('x-auth-token')) return res.status(401).send({"msg":"token tidak ditemukan!"});
    let header = req.header('x-auth-token');
    let userdata;
    try {
        userdata = jwt.verify(header, secret);
    } catch (error) {
        return res.status(400).send({"msg":"token tidak valid!"});
    }

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

//delete user [PERIKSA]
router.delete("/user/:email", async function (req, res) {
    if(!req.header('x-auth-token')) return res.status(401).send({"msg":"token tidak ditemukan!"});
    let header = req.header('x-auth-token');
    let userdata;
    try {
        userdata = jwt.verify(header, secret);
    } catch (error) {
        return res.status(400).send({"msg":"token tidak valid!"});
    }

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

//get review
router.get("/review/:email", async function (req, res) {
    if(!req.header('x-auth-token')) return res.status(401).send({"msg":"token tidak ditemukan!"});
    let header = req.header('x-auth-token');
    let userdata;
    try {
        userdata = jwt.verify(header, secret);
    } catch (error) {
        return res.status(400).send({"msg":"token tidak valid!"});
    }

    // validasi params
    const par = req.params;
    const schema = Joi.object({
        email: Joi.string().email().required()
    });
    try {
        await schema.validateAsync(par);
    } catch (error) {
        return res.status(400).send(error.toString());
    }
    
    try {
        let user = await executeQuery(`select * from users where email = "${par.email}"`);
        console.log(`select * from users where email = "${par.email}"`);
        if(user.length === 0){
            return res.status(404).send({message: "User not found!"});
        }
        let reviews = await executeQuery(`select hotel_id, user_id, review_content, review_score, date_format(review_date, "%d/%m/%Y") as review_date from review where user_id = ${user[0].id}`);
        let array_review = [];
        for (let i = 0; i < reviews.length; i++) {
            console.log(reviews[i].hotel_id)
            let hotel = await axios.get(`https://test.api.amadeus.com/v1/reference-data/locations/hotels/by-hotels?hotelIds=${reviews[i].hotel_id}`,{
                headers: {
                    'Authorization': key
                }});
            hotel=hotel.data.data[0];
            const eachReview = {
                hotel: hotel.name,
                hotel_chainCode: hotel.chainCode,
                rating: reviews[i].review_score+"/5",
                date_reviewed: reviews[i].review_date,
                review_content: reviews[i].review_content
            }
            array_review.push(eachReview);
        }
        return res.status(200).send({
            name: user[0].fname + " " + user[0].lname,
            date_registered: user[0].date_registered,
            reviews: array_review
        });
    } catch (error) {
        console.log(error);
        return res.status(500).send({message: "Internal error"});
    }
});

module.exports = router;