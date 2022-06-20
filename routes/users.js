const express = require("express");
const Joi = require('joi').extend(require('@joi/date'));
const router = express.Router();
const {
    executeQuery
} = require("../database");
const multer = require("multer");
const fs = require("fs");
const axios = require("axios");

const storage = multer.diskStorage({
    destination: "uploads/",
    filename: function (req, file, cb) {
        // let date = new Date();
        // console.log(date.toString());
        cb(null, req.header("x-auth-token"));
    }
});
const upload = multer({
    storage: storage
});

const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

const key = "Bearer iCJpEeXozfR3PLY5s3QHBgFPdmML"; //aku ganti punyaku

// ------------------ FUNCTION ------------------
const generateUniqueApikey = (length) => {
    let apikey = "";
    for (let i = 0; i < length; i++) {
        apikey += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    console.log("Generated API: " + apikey);
    return apikey;
}

const checkUser = async (apikey) => {
    let search_user = await executeQuery(`select * from users where apikey = "${apikey}"`);
    if (search_user.length == 0) {
        return false;
    }
    search_user = search_user[0];
    if (search_user.is_active != 1) {
        return false;
    } else {
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
        throw new Error("Invalid Hotel ID");
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
        return hotel;
    } catch (error) {
        throw new Error("Invalid Hotel ID");
    }
}

//register new user
router.post("/register", upload.none(), async function (req, res) {
    console.log(req.body);
    const schema =
        Joi.object({
            fname: Joi.string().required(),
            lname: Joi.string().required(),
            email: Joi.string().email({
                minDomainSegments: 2
            }).required(),
            password: Joi.string().required(),
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
        return res.status(200).send({
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
            NOW(), NOW(), 1)`);
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

//generate key??
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
                "status": 404,
                "message": "User not found"
            })
        }
        if (users[0].password !== password) {
            return res.status(400).send({
                "status": 400,
                "message": "Password tidak benar"
            })
        }
        return res.status(200).send({
            message: "Berhasil login!",
            token: "abcd",
            api_key: users[0].apikey
        })


    } catch (error) {
        console.log(error);
        return res.status(500).send(error.toString());
    }
});

//update user
router.put("/update", upload.none(), async function (req, res) {
    let header = req.header('x-auth-token');

    if (!req.header('x-auth-token')) {
        return res.status(401).send("Unauthorized");
    } else {
        let check = await checkUser(header);
        if (check == false) {
            return res.status(401).send({
                message: "Your account is deleted"
            });
        }
        const user = await executeQuery(`select * 
            from users 
            where apikey = '${header}'
            and is_active = 1`);
        if (user.length < 1) {
            return res.status(404).send({
                "message": "User not found"
            })
        }

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
            return res.status(400).send({
                "message": "Successfully updated",
            })
        } else {
            return res.status(400).send({
                "message": "Can't update",
            })
        }

    }
});

//update photo-user
router.put("/updatePhoto", upload.single("IDCard"), async function (req, res) {
    let header = req.header('x-auth-token');
    req.body.ktpapikey = header;

    if (!req.header('x-auth-token')) {
        return res.status(401).send("Unauthorized");
    } else {
        let check = await checkUser(header);
        if (check == false) {
            return res.status(401).send({
                message: "Your account is deleted"
            });
        }
        const user = await executeQuery(`select * 
        from users 
        where apikey = '${header}'
        and is_active = 1`);
        if (user.length < 1) {
            console.log("USER_NOT_FOUND")
            fs.unlinkSync(`../uploads/${header}`);
            return res.status(404).send({
                "message": "User not found"
            });
        }


    }

});

//search flight
router.get("/searchFlight/:airportCode", upload.none(), async function (req, res) {
    //Departure Airport code following IATA standard
    let header = req.header('x-auth-token');
    if (!req.header('x-auth-token')) {
        return res.status(400).send({
            message: "Unauthorized!"
        });
    } else {
        //await executeQuery(`update users set apihit = apihit - 1 where apikey = "${header}"`);
        let check = await checkUser(header);
        if (check == false) {
            return res.status(401).send({
                message: "Your account is deleted"
            });
        }
        if (req.params.airportCode) {
            //sesuai code
            let departureAirportCode = req.params.airportCode.toUpperCase();
            // try {
            //     await axios.get(`​/airport​/direct-destinations?departureAirportCode=${airportCode}`);
            //     return res.status(200).send({
            //         message: "Search success!"
            //     });
            // } catch (error) {
            //     return res.status(400).send({
            //         message: "Internal error!"
            //     });
            // }

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
    }
});

//flight options
router.get("/optionsFlight/", upload.none(), async function (req, res) {
    let header = req.header('x-auth-token');
    if (!req.header('x-auth-token')) {
        return res.status(400).send({
            message: "Unauthorized!"
        });
    } else {
        let check = await checkUser(header);
        if (check == false) {
            return res.status(401).send({
                message: "Your account is deleted"
            });
        }
        const schema =
            Joi.object({
                originLocation: Joi.string().required(),
                destinationLocation: Joi.string().required(),
                departure_date: Joi.date().format('YYYY-MM-DD').required(),
                adults: Joi.number().min(1).required(),
            })

        try {
            await schema.validateAsync(req.body);
        } catch (error) {
            return res.status(403).send(error.toString());
        }

        console.log(req.body);
        try {
            //await executeQuery(`update users set apihit = apihit - 1 where apikey = "${header}"`);

            let origin = req.body.originLocation.toUpperCase();
            let dest = req.body.destinationLocation.toUpperCase();
            let departure_date = req.body.departure_date;
            let adults = Number(req.body.adults);

            // let returnDate,children,infants,travelClass,includedAirlineCodes,excludedAirlineCodes,nonStop,currencyCode,maxPrice,max;
            // if(req.body.returnDate) returnDate = req.body.returnDate;
            // if(req.body.children) children = req.body.children;
            // if(req.body.infants) infants = req.body.infants;
            // if(req.body.travelClass) travelClass = req.body.travelClass;
            // if(req.body.includedAirlineCodes) includedAirlineCodes = req.body.includedAirlineCodes;
            // if(req.body.excludedAirlineCodes) excludedAirlineCodes = req.body.excludedAirlineCodes;
            // if(req.body.nonStop) nonStop = req.body.nonStop;
            // if(req.body.currencyCode) currencyCode = req.body.currencyCode;
            // if(req.body.maxPrice) maxPrice = req.body.maxPrice;
            // if(req.body.max) max = req.body.max;

            let hasil = await axios.get(
                `https://test.api.amadeus.com/v2/shopping/flight-offers?originLocationCode=${origin}&destinationLocationCode=${dest}&departureDate=${departure_date}&adults=${adults}`, {
                    headers: {
                        'Authorization': key
                    }
                })
            let data = hasil.data.data;
            console.log(data);

            let flight_offer = [];
            for (let i = 0; i < data.length; i++) {
                let temp = {
                    "source": data[i].source,
                    "lastTicketingDate": data[i].lastTicketingDate,
                    "numberOfBookableSeats": data[i].numberOfBookableSeats,
                    "itineraries": data[i].itineraries,
                    "price": data[i].price.currency + " " + data[i].price.total,
                    "validatingAirlineCodes": data[i].validatingAirlineCodes,
                    "travelerPricings": data[i].travelerPricings
                }
                flight_offer.push(temp);
            }

            return res.status(200).send({
                body: {
                    "count": data.length,
                    "flight_offer": flight_offer
                }
            });
        } catch (error) {
            return res.status(400).send({
                message: "Internal error!"
            });
        }
    }
});

//search hotel (masukin nama kotanya)
router.get("/searchHotel/:idCity", upload.none(), async function (req, res) {
    let header = req.header('x-auth-token');
    if (!req.header('x-auth-token')) {
        return res.status(400).send({
            message: "Unauthorized!"
        });
    } else {
        let idCity = req.params.idCity.toUpperCase();
        let cityName = await axios.get(
            `https://test.api.amadeus.com/v1/reference-data/locations?subType=CITY&keyword=${idCity}`, {
                headers: {
                    'Authorization': key
                }
            })
        let city = cityName.data.data;

        let numb = -1;
        for (let i = 0; i < city.length; i++) {
            if (city[i].name.includes(idCity)) numb = i;
        }

        let cityCode = city[numb].address.cityCode;

        console.log(city[numb].name + " - " + city[numb].address.cityCode)

        // return res.status(200).send({
        //     "name": city[numb].name,
        //     "cityCode" : city[numb].address.cityCode,
        // })

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
                // let rate = await axios.get(
                //     `https://test.api.amadeus.com/v2/e-reputation/hotel-sentiments?hotelIds=${data[i].hotelId}`,
                //     {
                //         headers: {
                //             'Authorization': key
                //         }
                //     })

                //let rating = rate.data.data;
                //return res.status(200).send(rating);

                let temp = {
                    "name": data[i].name,
                    "hotelId": data[i].hotelId,
                    "countryCode": data[i].address.countryCode,
                    //"rating" : rating
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
            return res.status(400).send({
                message: "Internal error!"
            });
        }
    }
});

// post & update review hotel
router.post("/reviewHotel", upload.none(), async function (req, res) {
    let header = req.header('x-auth-token');
    if (!header) {
        return res.status(401).send({
            message: "Unauthorized!"
        });
    }
    // check api key
    let user = await executeQuery(`select * from users where apikey='${header}'`);
    user = user[0]
    if (!user) {
        return res.status(404).send({
            message: "API Key Not Found"
        })
    } else if (user.is_active == 0) {
        return res.status(401).send({
            message: "Your account is deleted"
        })
    }

    // validasi body
    const body = req.body;
    const schema = Joi.object({
        hotel_id: Joi.string().external(checkHotelId).required(),
        review_content: Joi.string().required(),
        review_score: Joi.number().min(1).max(5).required(),
    });
    try {
        await schema.validateAsync(body);
    } catch (error) {
        return res.status(400).send(error.toString());
    }

    // cek apakah user sudah pernah review hotel yang sama sebelumnya
    // kalau sudah ada, maka review lama akan di update
    // kalau belum ada, review baru akan ditambahkan
    query = `select * from review where hotel_id='${body.hotel_id}' and user_id='${user.id}'`
    let review = await executeQuery(query)
    review = review[0]
    let status, message
    if (!review) {
        query = `
            insert into review(hotel_id, user_id, review_content, review_score)
            values('${body.hotel_id}', ${user.id}, '${body.review_content}', ${body.review_score})
        `
        status = 201
        message = 'Review added!'
    } else {
        query = `
            update review 
            set review_content='${body.review_content}', review_score=${body.review_score} 
            where hotel_id='${body.hotel_id}' and user_id=${user.id}
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
})

//cari review hotel 
router.get("/reviewHotel/:idHotel?", async function (req, res) {
    let header = req.header('x-auth-token');
    if (!req.header('x-auth-token')) {
        return res.status(400).send({
            message: "Unauthorized!"
        });
    } else {
        let check = await checkUser(header);
        if (check == false) {
            return res.status(401).send({
                message: "Your account is deleted"
            });
        }
        if (!req.params.idHotel) {
            let data = await executeQuery(`select hotel_id as "Hotel ID", AVG(review_score) as "Rating"  from review group by hotel_id`);
            return res.status(200).send(data)
        } else {
            idHotel = req.params.idHotel.toUpperCase();
            try {
                // await checkHotelId(idHotel);
                let data = await executeQuery(`select user_id as "User ID",review_content as "Review",review_score as "Rating" from review where hotel_id = '${idHotel}'`);
                let jum = 0
                let tot = 0
                data.forEach(ah => {
                    tot += ah.Rating
                    jum++
                });
                return res.status(200).send({
                    "Hotel ID":idHotel,
                    "Review Amount":jum,
                    "Average Rating":tot/jum,
                    "Reviews":data
                })
            } catch (error) {
                return res.status(404).send(error);
            }
        }

    }
})

module.exports = router;