const express = require("express");
const Joi = require('joi').extend(require('@joi/date'));
const router = express.Router();
const {
    executeQuery
} = require("../database");
const multer = require("multer");
const fs = require("fs");
const axios = require("axios");
const jwt = require("jsonwebtoken");
const secret = "proyeksoauserbagian";

const storage = multer.diskStorage({
    destination: "uploads/",
    filename: function (req, file, cb) {
        // let date = new Date();
        // console.log(date.toString());
        const extension = file.originalname.split('.')[file.originalname.split('.').length - 1];
        let apikey;
        try {
            apikey = jwt.verify(req.header("x-auth-token"), secret);
        } catch (error) {
            console.log(error);
            return res.status(403).send({message: "Token expired"});
        }
        cb(null, apikey.apikey + "." + extension);
    }
});
const upload = multer({
    storage: storage
});

// ------------------ VAR ------------------
const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const key = "Bearer xbaAPYEU6BRJVxWJTNCOMWcOknRe";


// ------------------ FUNCTION ------------------
const generateUniqueApikey = (length) => {
    let apikey = "";
    for (let i = 0; i < length; i++) {
        apikey += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    console.log("Generated API: " + apikey);
    return apikey;
}

const checkUser = async function (req, res, next) {
    let header = req.header('x-auth-token');
    if (!req.header('x-auth-token')) {
        return res.status(400).send({
            message: "Unauthorized!"
        });
    }
    let userdata;
    try {
        userdata = jwt.verify(header, secret);
    } catch (error) {
        return res.status(400).send({
            "msg": "token tidak valid!"
        });
    }
    let search_user = await executeQuery(`select * from users where apikey = "${userdata.apikey}"`);
    if (search_user.length === 0) {
        return res.status(404).send({
            message: "User not found"
        });
    }
    search_user = search_user[0];
    if (search_user.is_active !== 1) {
        return res.status(401).send({
            message: "Your account is deleted"
        });
    } else {
        req.header["user_id"] = search_user.id;
        req.header["apikey"] = userdata.apikey;
        return next();
    }
}

async function doAPIHit(user_id, apihit_amount) {
    console.log(user_id);
    let search_user = await executeQuery(`select * from users where apikey = "${user_id}"`);
    if(search_user.length <= 0){
        return false;
    }
    if (search_user[0].apihit < apihit_amount) {
        return false;
    } else {
        await executeQuery(`update users set apihit = apihit - ${apihit_amount} where apikey = "${user_id}"`)
        return true;
    }
}

const checkHotelId = async (id) => {
    try {
        const hotel = await axios.get(
            `https://test.api.amadeus.com/v1/reference-data/locations/hotels/by-hotels?hotelIds=${id}`, {
                headers: {
                    'Authorization': key
                }
            });
    } catch (error) {
        throw new Error(error.toString());
    }
}

const getHotel = async (id) => {
    try {
        const hotel = await axios.get(
            `https://test.api.amadeus.com/v1/reference-data/locations/hotels/by-hotels?hotelIds=${id}`, {
                headers: {
                    'Authorization': key
                }
            });
        console.log(hotel.data.data[0]);
        return hotel.data.data[0];
    } catch (error) {
        throw new Error("Invalid Hotel ID");
    }
}

// ------------------ DEFAULT ------------------
//register new user [DONE]
router.post("/register", upload.none(), async function (req, res) {
    console.log(req.body);
    const schema =
        Joi.object({
            fname: Joi.string().required(),
            lname: Joi.string().required(),
            email: Joi.string().email({
                minDomainSegments: 2
            }).required(),
            password: Joi.string().min(8).required(),
            confirm_password: Joi.string().required(),
            date_of_birth: Joi.date().format('DD/MM/YYYY').required(),
        })

    try {
        await schema.validateAsync(req.body);
    } catch (error) {
        return res.status(403).send(error.toString());
    }

    const {
        fname,
        lname,
        email,
        password,
        confirm_password,
        date_of_birth
    } = req.body;
    let apikey;

    if (password !== confirm_password) {
        return res.status(400).send({
            message: "Password don't match!"
        });
    }

    const user = await executeQuery(`select *
            from users where email = '${email}'
            and is_active = 1`);
    if (user.length > 0) {
        return res.status(401).send({
            "message": "Email has been used"
        })
    }

    try {
        let check_api;
        do {
            apikey = generateUniqueApikey(10);
            check_api = await executeQuery(`select * from users where apikey = "${apikey}"`);
        } while (check_api.length > 0);

        let insert_user = await executeQuery(`insert into users
            values('',"${apikey}", 5, "${email}", "${fname}", "${lname}", "${password}", STR_TO_DATE("${date_of_birth}", "%d/%m/%YYYY"),
            NOW(), NOW(), 1,'')`);
        if (insert_user) {
            return res.status(200).send({
                message: "Registered successfully!",
                name: fname + " " + lname,
                email: email,
                date_of_birth: date_of_birth,
                API_key: apikey
            });
        }
    } catch (error) {
        console.log(error);
        return res.status(500).send(error.toString());
    }
});

//generate key [DONE]
router.post("/login", upload.none(), async function (req, res) {
    const schema =
        Joi.object({
            email: Joi.string().email({
                minDomainSegments: 2
            }).required(),
            password: Joi.string().required(),
        })

    try {
        await schema.validateAsync(req.body);
    } catch (error) {
        return res.status(403).send(error.toString());
    }

    const {
        email,
        password
    } = req.body;
    try {
        const users = await executeQuery(`select * from users where email = '${email}'`);
        if (users.length < 1) {
            return res.status(404).send({
                "message": "User not found"
            })
        }
        if (users[0].password !== password) {
            return res.status(400).send({
                "message": "Invalid Password"
            })
        }
        let token = jwt.sign({
            apikey: users[0].apikey
        }, secret, {
            expiresIn: '3600s'
        });
        return res.status(200).send({
            message: "Login Success!",
            token: token
        })


    } catch (error) {
        console.log(error);
        return res.status(500).send(error.toString());
    }
});

//update user [DONE]
router.put("/update", [checkUser, upload.none()], async function (req, res) {
    let header = req.header('x-auth-token');
    try {
        header = jwt.verify(header, secret);
    } catch (error) {
        console.log(error);
        return res.status(400).send({
            "msg": "token tidak valid!"
        });
    }
    let apikey = header.apikey;
    const user = await executeQuery(`select * 
            from users 
            where apikey = '${apikey}'
            and is_active = 1`);
    let fname = user[0].fname;
    let lname = user[0].lname;
    let password = user[0].password;
    let date_of_birth = user[0].date_of_birth;

    if (req.body.fname) fname = req.body.fname;
    if (req.body.lname) lname = req.body.lname;
    if (req.body.password) {
        password = req.body.password;
        let confirm_password = req.body.confirm_password;
        if (password !== confirm_password) {
            return res.status(400).send({
                message: "Password don't match!"
            });
        }
    }
    if (req.body.date_of_birth) date_of_birth = req.body.date_of_birth;

    const update = await executeQuery(`update users 
            set date_updated = NOW(),
            fname = '${fname}',
            lname = '${lname}',
            password = '${password}',
            date_of_birth = STR_TO_DATE("${date_of_birth}", "%d/%m/%Y")
            where email = '${user[0].email}' 
            and is_active = 1`);

    if (update) {
        return res.status(200).send({
            "message": "Successfully updated",
        })
    } else {
        return res.status(400).send({
            "message": "Can't update",
        })
    }

});

//update photo-user [DONE, need testing]
router.put("/updatePhoto", [upload.single("IDCard")], async function (req, res) {
    let header = req.header('x-auth-token');
    try {
        header = jwt.verify(header, secret);
    } catch (error) {
        console.log(error);
        return res.status(400).send({
            "msg": "token tidak valid!"
        });
    }
    req.body.ktpapikey = header.apikey;
    let apikey = header.apikey;
    let user;
    try {
        user = await executeQuery(`select id, apikey, id_card_dir, is_active 
        from users 
        where apikey = '${apikey}'`);
    } catch (error) {
        console.log(error);
        return res.status(500).send({
            message: "Internal error!"
        });
    }
    const extension = req.file.originalname.split('.')[req.file.originalname.split('.').length - 1];
    console.log(user.length);
    if (user.length === 0) {
        fs.unlinkSync(`./uploads/${apikey}`+"."+extension);
        return res.status(404).send({
            message: "User not found!"
        });
    }
    if(user[0].is_active === 0){
        return res.status(404).send({
            message: "User deleted!"
        });
    }

    try {
        fs.unlinkSync(user[0].id_card_dir);
        let update_user = await executeQuery(`update users set id_card_dir = "./uploads/${apikey}.${extension}" where id = ${user[0].id}`);
        let message = "ID Card photo successfully updated";
        // console.log(user[0].id_card_dir);
        if (user[0].id_card_dir == null) {
            message = "ID Card photo successfully uploaded";
        }
        return res.status(200).send({
            message: message,
            API_key: user[0].apikey,
            id_card_directory: `./uploads/${apikey}.${extension}`
        });
    } catch (error) {
        console.log(error);
        return res.status(500).send({
            message: "Internal error!"
        });
    }
});

//isi ulang balance
router.post("/recharge", [checkUser], async function (req, res) {
    const schema =
        Joi.object({
            balance_amount: Joi.number().required().min(1000),
        })

    try {
        await schema.validateAsync(req.body);
    } catch (error) {
        return res.status(401).send(error.toString());
    }
    try {
        let user = await executeQuery(`select * from users where id = ${req.header.user_id}`)
        user = user[0]
        console.log(user.balance);
        console.log(req.body.balance_amount);
        executeQuery(`update users set balance = ${user.balance+req.body.balance_amount} where id = '${req.header.user_id}' and is_active = 1`)
        return res.status(201).send({
            message: `${user.fname}'s balance has been added by Rp.${req.body.balance_amount}`
        });
    } catch (error) {
        console.log(error);
        return res.status(500).send({
            message: "Internal error!"
        });
    }
});

//melihat subscription yang ada
router.get("/package", async function (req, res) {
    try {
        let packages = await executeQuery(`select plan_id as "Plan ID", plan_name as "Plan Name", plan_desc as "Plan Description", plan_price as "Plan Price" , plan_hit_amount as "Plan Hit Amount" from subscription_plan where is_plan_available = 1`);
        return res.status(200).send(packages);
    } catch (error) {
        console.log(error);
        return res.status(500).send({
            message: "Internal error!"
        });
    }
});

//membeli subscription
router.post("/package/:idpackage", [checkUser], async function (req, res) {
    let header = req.header('x-auth-token');

    try {
        let package = await executeQuery(`select * from subscription_plan where plan_id = ${req.params.idpackage}`)
        if (package.length === 0) {
            return res.status(404).send({
                message: "Subscription Plan not found"
            });
        }
        package = package[0]
        let user = await executeQuery(`select * from users where id = ${req.header.user_id}`)
        if (user[0].balance < package.plan_price) {
            return res.status(401).send({
                message: "Balance is not enough"
            });
        }
        await executeQuery(`update users set balance = ${user[0].balance-package.plan_price}, apihit= ${package.plan_hit_amount} where id = '${req.header.user_id}' and is_active = 1`)
        return res.status(201).send({
            message: `${package.plan_name} package has been bought, thank you and have a nice day :)`
        });
    } catch (error) {
        console.log(error);
        return res.status(500).send({
            message: "Internal error!"
        });
    }
});

// ------------------ FLIGHT ------------------
//search flight [DONE]
router.get("/searchFlight/:airportCode", [checkUser, upload.none()], async function (req, res) {
    //Departure Airport code following IATA standard
    let update = doAPIHit(req.header.apikey, 1);
    if (!update) {
        return res.status(401).send({
            message: "Hit quota exceeded"
        });
    }
    if (req.params.airportCode) {
        //sesuai code
        let departureAirportCode = req.params.airportCode.toUpperCase();
        try {
            let hasil = await axios.get(
                `https://test.api.amadeus.com/v1/airport/direct-destinations?departureAirportCode=${departureAirportCode}`, {
                    headers: {
                        'Authorization': key
                    }
                })
            let data = hasil.data.data;
            console.log(data);

            let departure_offer = [];
            for (let i = 0; i < data.length; i++) {
                let temp = {
                    "destination": data[i].name,
                    "iataCode": data[i].iataCode,
                }
                departure_offer.push(temp);
            }

            return res.status(200).send({
                body: {
                    "count": data.length,
                    "departure_offer": departure_offer
                }
            });
        } catch (error) {
            console.log(error);
            return res.status(400).send({
                message: "Internal error!"
            });
        }

    } else {
        return res.status(400).send({
            message: "Empty field!"
        });
    }
});

// ------------------ HOTEL ------------------
//search hotel (masukin nama kotanya) [DONE|Perlu diperiksa]
router.get("/searchHotel", [checkUser, upload.none()], async function (req, res) {
    let header = req.header("x-auth-token");
    
    // let update = await executeQuery(`update users set apihit = apihit - 1 where apikey = "${header}"`);
    // if (!update) {
    //     return res.status(401).send({
    //         message: "Hit quota exceeded"
    //     });
    // }

    //return res.status(200).send(req.query)
    let update = await doAPIHit(req.header.apikey, 1);
    console.log(update);
    if(!update){
        return res.status(401).send({message: "Hit quota limit reached"});
    }

    let idCity = req.query.idCity.toUpperCase();
    let countryCode = req.query.countryCode.toUpperCase();
    if (countryCode.length > 2 || countryCode.length <= 0) {
        return res.status(402).send({
            message: "Bad request. Country code must be 2 letters!"
        });
    }
    console.log(`https://test.api.amadeus.com/v1/reference-data/locations/cities?countryCode=${countryCode}&keyword=${idCity}&`);
    let cityName = await axios.get(
        `https://test.api.amadeus.com/v1/reference-data/locations/cities?countryCode=${countryCode}&keyword=${idCity}&`, {
            headers: {
                'Authorization': key
            }
        });
    // console.log(cityName.data.data);
    let city = cityName.data.data;
    if (city.length === 0) {
        return res.status(404).send({
            message: "No data for city " + idCity
        });
    }
    // return res.status(200).send({message: "ok"});

    let numb = 0;
    let cityCode = city[numb].iataCode;
    // console.log(city[numb]);
    console.log("=================");
    console.log(city[numb].name + " - " + cityCode);
    console.log("=================");

    try {
        let hasil = await axios.get(
            `https://test.api.amadeus.com/v1/reference-data/locations/hotels/by-city?cityCode=${cityCode}`, {
                headers: {
                    'Authorization': key
                }
            })
        let data = hasil.data.data;
        //console.log(data);

        let size = 10;
        if (data.length < 10) size = data.length;

        //console.log(size)

        let hotel = [];
        for (let i = 0; i < size; i++) {
            let rate = 5;
            let review = await executeQuery(`select AVG(review_score) as rate from review where hotel_id = '${data[i].hotelId}'`);
            if (review.length > 0) rate = review[0].rate;
            console.log(data[i]);
            let temp = {
                "name": data[i].name,
                "hotelId": data[i].hotelId,
                "iataCode": data[i].iataCode,
                "rate": rate
            }
            hotel.push(temp);
        }

        return res.status(200).send({
            body: {
                "count": data.length,
                "hotel": hotel
            }
        });
    } catch (error) {
        console.log(error);
        return res.status(400).send({
            message: "Internal error!"
        });
    }
});

//post & update review hotel [DONE]
router.post("/reviewHotel", [checkUser, upload.none()], async function (req, res) {
    let user_id = req.header.user_id
    // validasi body
    const body = req.body;
    const schema = Joi.object({
        hotel_id: Joi.string().external(checkHotelId).required(),
        review_content: Joi.string().required(),
        review_score: Joi.number().min(1).max(5).required(),
    });
    let hotel
    try {
        await schema.validateAsync(body);
        hotel = await getHotel(body.hotel_id)
    } catch (error) {
        return res.status(400).send(error.toString());
    }


    // cek apakah user sudah pernah review hotel yang sama sebelumnya
    // kalau sudah ada, maka review lama akan di update
    // kalau belum ada, review baru akan ditambahkan
    let query = `select * from review where hotel_id='${body.hotel_id}' and user_id='${user_id}'`
    let review = await executeQuery(query)
    review = review[0]
    let status, message
    if (!review) {
        query = `
            insert into review(hotel_id, hotel_name, user_id, review_content, review_score)
            values('${body.hotel_id}','${hotel.name}', ${user_id}, '${body.review_content}', ${body.review_score})
        `
        status = 201
        message = 'Review added!'
    } else {
        query = `
            update review 
            set review_content='${body.review_content}', review_score=${body.review_score} 
            where hotel_id='${body.hotel_id}' and user_id=${user_id}
        `
        status = 200
        message = 'Review updated!'
    }
    let result = await executeQuery(query);

    if (result) {
        return res.status(status).send({
            message
        })
    } else {
        return res.status(500).send('Server error occured')
    }
});

//cari review hotel [PERIKSA]
router.get("/reviewHotel/:idHotel?", [checkUser], async function (req, res) {
    if (!req.params.idHotel) {
        let data = await executeQuery(`select hotel_name as "Hotel Name", AVG(review_score) as "Rating"  from review group by hotel_id`);
        return res.status(200).send(data)
    } else {
        let idHotel = req.params.idHotel.toUpperCase();
        try {
            let hotel = await getHotel(idHotel);
            let data = await executeQuery(`select user_id as "User ID",review_content as "Review",review_score as "Rating" from review where hotel_id = '${idHotel}'`);
            let jum = 0
            let tot = 0
            data.forEach(ah => {
                tot += ah.Rating
                jum++
            });
            return res.status(200).send({
                "Hotel Name": hotel.name,
                "Review Amount": jum,
                "Average Rating": tot / jum,
                "Reviews": data
            })
        } catch (error) {
            return res.status(404).send("Hotel not found");
        }
    }
});

// search activities berdasarkan nama tempat [PERIKSA]
router.get("/searchActivities/:location", [checkUser, upload.none()], async function (req, res) {
    // cek param
    let location = req.params.location
    if (!location) {
        return res.status(400).send("Please provide location")
    }

    try {
        // pake third party api gratis, ga perlu register :v
        let coordinates = await axios.get(`https://www.gps-coordinates.net/api/${location}`);
        console.log(coordinates.data)
        if (coordinates.data.responseCode === "400") {
            return res.status(404).send("Invalid location")
        }

        // nembak activities api dari amadeus
        let latitude = coordinates.data.latitude
        let longitude = coordinates.data.longitude
        let radius = 1 // radius pencarian dalam KM
        let activities = await axios.get(
            `https://test.api.amadeus.com/v1/shopping/activities?latitude=${latitude}&longitude=${longitude}&radius=${radius}`, {
                headers: {
                    'Authorization': key
                }
            }
        );

        // cek result data
        activities = activities.data.data
        if (activities.length === 0) {
            return res.status(404).send(`No activities found in ${location}`)
        }

        // filter data
        let activities_list = [];
        for (let i = 0; i < activities.length; i++) {
            let temp = {
                "id": activities[i].id,
                "name": activities[i].name,
                "shortDescription": activities[i].shortDescription,
                "rating": activities[i].rating,
                "pictures": activities[i].pictures,
            }
            activities_list.push(temp);
        }
        return res.status(200).send(activities_list)
    } catch (error) {
        return res.status(500).send(error.toString())
    }
})

module.exports = router;

//flight options [PERIKSA]
// router.get("/optionsFlight/", [checkUser, upload.none()], async function (req, res) {
//     const schema =
//         Joi.object({
//             originLocation: Joi.string().required(),
//             destinationLocation: Joi.string().required(),
//             departure_date: Joi.date().format('YYYY-MM-DD').required(),
//             adults: Joi.number().min(1).required(),
//         })
//
//     try {
//         await schema.validateAsync(req.body);
//     } catch (error) {
//         return res.status(403).send(error.toString());
//     }
//
//     let header = req.header('x-auth-token');
//     console.log(req.body);
//     try {
//         let update = doAPIHit(header,1);
//          if (!update) {
//             return res.status(401).send({
//                 message: "Apihit tidak mencukupi"
//             });
//         }
//
//         let origin = req.body.originLocation.toUpperCase();
//         let dest = req.body.destinationLocation.toUpperCase();
//         let departure_date = req.body.departure_date;
//         let adults = Number(req.body.adults);
//
//         let hasil = await axios.get(
//             `https://test.api.amadeus.com/v2/shopping/flight-offers?originLocationCode=${origin}&destinationLocationCode=${dest}&departureDate=${departure_date}&adults=${adults}`, {
//                 headers: {
//                     'Authorization': key
//                 }
//             })
//         let data = hasil.data.data;
//         console.log(data);
//
//         let flight_offer = [];
//         for (let i = 0; i < data.length; i++) {
//             let temp = {
//                 "source": data[i].source,
//                 "lastTicketingDate": data[i].lastTicketingDate,
//                 "numberOfBookableSeats": data[i].numberOfBookableSeats,
//                 "itineraries": data[i].itineraries,
//                 "price": data[i].price.currency + " " + data[i].price.total,
//                 "validatingAirlineCodes": data[i].validatingAirlineCodes,
//                 "travelerPricings": data[i].travelerPricings
//             }
//             flight_offer.push(temp);
//         }
//
//         return res.status(200).send({
//             body: {
//                 "count": data.length,
//                 "flight_offer": flight_offer
//             }
//         });
//     } catch (error) {
//         return res.status(400).send({
//             message: "Internal error!"
//         });
//     }
// });

// //booking/checkIn flight
// router.post("/checkInFlight/", async function(req, res) {
//     console.log(req.body);
//     const schema =
//         Joi.object({
//             originLocationCode: Joi.string().max(3).min(3).required(),
//             destinationLocationCode: Joi.string().max(3).min(3).required(),
//             departureDate : Joi.date().format('YYYY-MM-DD').required(),
//             adults: Joi.number().required(),
//             includedAirlineCodes: Joi.string().required()
//         })
//
//     let originLocationCode = req.body.originLocationCode;
//     let destinationLocationCode = req.body.destinationLocationCode;
//     let departureDate = req.body.departureDate;
//     let adults = Number(req.body.adults);
//     let includedAirlineCodes = req.body.includedAirlineCodes;
//
//     try {
//         await schema.validateAsync(req.body);
//     } catch (error) {
//         return res.status(403).send(error.toString());
//     }
//
//     let offers = await axios.get(
//         `https://test.api.amadeus.com/v2/shopping/flight-offers?originLocationCode=${originLocationCode}&destinationLocationCode=${destinationLocationCode}&departureDate=${departureDate}&adults=${adults}&includedAirlineCodes=${includedAirlineCodes}`, {
//             headers: {
//                 'Authorization': key
//             }
//         });
//
//     if(offers.data.length<1) {
//          return res.status(400).send({
//              "error" : "Flight Not Found"
//          })
//     }
//     //return res.status(200).send(offers.data.data);
//     let data = offers.data.data[0];
//     let duration = data.itineraries.durations;
//     let aircraft = data.validatingAirlineCodes;
//     let segments = [];
//     let count_segments = data.itineraries.segments;
//     for(let i=0; i<count_segments.length;i++) {
//         let temp = {
//             "departure" : count_segments.departure,
//             "arrival" : count_segments.arrival,
//             "carrierCode" : count_segments.carrierCode,
//             "aircraft" : count_segments.aircraft.code,
//             "duration" : count_segments.duration
//         }
//         segments.push(temp);
//     }
//     let price = data.price.currency + " " + itineraries.price.grandTotal;
//     let departure = data.itineraries.segments.departure;
// })

// // hotel options  [BELUM]
// router.get("/optionsHotel", [checkUser,upload.none()], async function (req, res){
//     const body = req.body;
//     const schema = Joi.object({
//         hotel_id: Joi.string().external(checkHotelId).required(),
//         adults: Joi.number().min(1).max(9).required(),
//         checkIn_date: Joi.date().format('YYYY-MM-DD').required(),
//         room_quantity: Joi.number().min(1).max(9).required(),
//     });
//     try {
//         await schema.validateAsync(body);
//     } catch (error) {
//         return res.status(400).send(error.toString());
//     }
//
//     try{
//         let hotel = await axios.get(
//             `https://test.api.amadeus.com/v3/shopping/hotel-offers?hotelIds=${body.hotel_id}&adults=${body.adults}&checkInDate=${body.checkIn_date}&roomQuantity=${body.room_quantity}`, {
//                 headers: {
//                     'Authorization': key
//                 }
//             });
//         //return res.status(400).send(hotel.data+" - "+hotel.data.data.length);
//         if(hotel.data.data.length<1) return res.status(400).send({
//             "errors": [
//                 {
//                     "status": 400,
//                     "code": 3664,
//                     "title": "NO ROOMS AVAILABLE AT REQUESTED PROPERTY"
//                 }
//             ]
//         });
//         else {
//             hotel = hotel.data.data[0]
//             console.log(hotel.hotel.name)
//             console.log(hotel.offers[0].room)
//             console.log(hotel.offers[0].price)
//         }
//     }
//     catch(error){
//         return res.status(400).send(error.toString());
//     }
//     return res.send("done")
// });