const express = require("express");
const Joi = require('joi').extend(require('@joi/date'));
const router = express.Router();
const {
    executeQuery
} = require("../database");
const axios = require("axios");
const fs = require("fs");

// ------------------ VAR ------------------
const key = "Bearer camnAcFPQIxWtBbclCZkzbkLEPHv";

// ------------------ FUNCTION ------------------
const checkUser = async function (req, res, next) {
    let header = req.header('x-auth-token');
    if (!req.header('x-auth-token')) {
        return res.status(400).send({
            message: "Unauthorized!"
        });
    }
    let search_user = await executeQuery(`select * from users where apikey = "${header}"`);
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
        return next();
    }
}

async function doAPIHit(user_id,apihit_amount) {
    let search_user = await executeQuery(`select * from users where apikey = "${user_id}"`);
    if(search_user[0].apihit<apihit_amount){
        return false
    }else{
        await executeQuery(`update users set apihit = apihit - ${apihit_amount} where apikey = "${user_id}"`)
        return true
    }
}

//new trip [DONE]
router.post("/", checkUser, async function (req, res) {
    console.log(req.body);
    const schema =
        Joi.object({
            route_name: Joi.string().required(),
        })

    try {
        await schema.validateAsync(req.body);
    } catch (error) {
        return res.status(403).send(error.toString());
    }

    let header = req.header('x-auth-token');
    let update = doAPIHit(header,1);
    if (!update) {
        return res.status(401).send({
            message: "Apihit tidak mencukupi"
        });
    }

    let user = await executeQuery(`select * from users where apikey = '${header}'`);
    let route_name = req.body.route_name;

    try {
        let insert = await executeQuery(`insert into route
            values('',"${user[0].id}","${route_name}", NOW(), 0)`);
        if (insert) {
            return res.status(200).send({
                message: "Add New Trip successfully!",
                user: user[0].fname + " " + user[0].lname,
                name: route_name
            });
        }
    } catch (error) {
        console.log(error);
        return res.status(500).send(error.toString());
    }
});

//add city to trip [DONE]
router.post("/city/:idTrip", checkUser, async function(req, res){
    console.log(req.body);
    const schema =
        Joi.object({
            city: Joi.string().required(),
            country: Joi.string().required()
        })

    try {
        await schema.validateAsync(req.body);
    } catch (error) {
        return res.status(403).send(error.toString());
    }

    let header = req.header('x-auth-token');
    let update = doAPIHit(header,1);
    if (!update) {
        return res.status(401).send({
            message: "Apihit tidak mencukupi"
        });
    }

    let idTrip = Number(req.params.idTrip);

    let user = await executeQuery(`select * from users where apikey = '${header}'`);
    let trip = await executeQuery(`select * from route where id = ${idTrip}`);
    if(trip.length<1) {
        return res.status(401).send({
            message: "Trip Not Found"
        });
    }
    if(trip[0].user_id !== user[0].id) {
        return res.status(401).send({
            message: "Not Allowed (Not The User)"
        });
    }

    let idCity = req.body.city.toUpperCase();
    let countryCode = req.body.country.toUpperCase();
    if(countryCode.length > 2 || countryCode.length <= 0){
        return res.status(402).send({message: "Bad request. Country code must be 2 letters!"});
    }
    //console.log(`https://test.api.amadeus.com/v1/reference-data/locations/cities?countryCode=${countryCode}&keyword=${idCity}&`);
    let cityName = await axios.get(
        `https://test.api.amadeus.com/v1/reference-data/locations/cities?countryCode=${countryCode}&keyword=${idCity}&`, {
            headers: {
                'Authorization': key
            }
        });
    console.log(cityName.data.data);
    let city = cityName.data.data;
    if(city.length === 0){
        return res.status(404).send({message:"No data for city "+idCity});
    }

    try {
        let insert = await executeQuery(`insert into d_route
            values('', ${idTrip},"${idCity}","${countryCode}")`);
        if (insert) {
            return res.status(200).send({
                Message: "Add New City To Trip successfully!",
                User: user[0].fname + " " + user[0].lname,
                Trip: trip[0].route_name,
                City: city[0].name
            });
        }
    } catch (error) {
        console.log(error);
        return res.status(500).send(error.toString());
    }
})

//add hotel to trip [DONE]
//kalau city nya ternyata blom ada/diinput di endpoint sebelumnya, maka akan automatis diinputkan
router.post("/hotel/:idTrip", checkUser, async function(req, res){
    console.log(req.body);
    const schema =
        Joi.object({
            city: Joi.string().required(),
            country: Joi.string().min(2).max(2).required(),
            hotel: Joi.string().required()
        })

    try {
        await schema.validateAsync(req.body);
    } catch (error) {
        return res.status(403).send(error.toString());
    }

    let header = req.header('x-auth-token');
    let update = doAPIHit(header,1);
    if (!update) {
        return res.status(401).send({
            message: "Apihit tidak mencukupi"
        });
    }

    let idTrip = Number(req.params.idTrip);

    let user = await executeQuery(`select * from users where apikey = '${header}'`);
    let trip = await executeQuery(`select * from route where id = ${idTrip}`);
    if(trip.length<1) {
        return res.status(401).send({
            message: "Trip Not Found"
        });
    }
    if(trip[0].user_id !== user[0].id) {
        return res.status(401).send({
            message: "Not Allowed (Not The User)"
        });
    }

    let idCity = req.body.city.toUpperCase();
    let countryCode = req.body.country.toUpperCase();
    if(countryCode.length > 2 || countryCode.length <= 0){
        return res.status(402).send({message: "Bad request. Country code must be 2 letters!"});
    }
    let idHotel = req.body.hotel.toUpperCase();
    let hotelData = await axios.get(
        `https://test.api.amadeus.com/v1/reference-data/locations/hotels/by-hotels?hotelIds='${idHotel}'`, {
            headers: {
                'Authorization': key
            }
        });
    console.log(hotelData.data.data);
    let hotel = hotelData.data.data;
    if(hotel.length === 0){
        return res.status(404).send({message:"No data for hotel "+idHotel});
    }
    //return res.status(404).send(hotel[0]);
    console.log(hotel[0]);
    if(hotel[0].iataCode !== idCity) return res.status(404).send({message:"Hotel ("+ hotel[0].name +") not found in City ("+ idCity+")"});
    if(hotel[0].address.countryCode !== countryCode) return res.status(404).send({message:"Hotel ("+ hotel[0].name +") not found in Country ("+ countryCode+")"});

    let checkRoute = await executeQuery(`select * from d_route where route_id = '${idTrip}' and city_id = '${idCity}' and country_id = '${countryCode}'`);
    if(checkRoute.length<1) {
        try {
            let insert = await executeQuery(`insert into d_route
            values('', ${idTrip},"${idCity}","${countryCode}")`);
            if (insert) {
                console.log({
                    Message: "Add New City To Trip successfully!",
                    User: user[0].fname + " " + user[0].lname,
                    Trip: trip[0].route_name,
                    City: idCity
                });
            }
        } catch (error) {
            console.log(error);
            return res.status(500).send(error.toString());
        }
    }
    try {
        let check = await executeQuery(`select * from d_route where route_id = '${idTrip}' and city_id = '${idCity}' and country_id = '${countryCode}'`);
        let insert = await executeQuery(`insert into d_hotel
            values('',${check[0].id},"${idHotel}","${hotel[0].name}")`);
        if (insert) {
            return res.status(200).send({
                Message: "Add New Hotel To Trip successfully!",
                User: user[0].fname + " " + user[0].lname,
                Trip: trip[0].route_name,
                Hotel: hotel[0].name
            });
        }
    } catch (error) {
        console.log(error);
        return res.status(500).send(error.toString());
    }
})

//add activity to trip [DONE | PERIKSA]
//kalau city nya ternyata blom ada/diinput di endpoint sebelumnya, maka akan automatis diinputkan
//yg ini BLOM diperiksa apakah activity nya ini benar ada di city/country yg sesuai
//APA perlu APIHIT dikurangin 2x kalau nambahain city nya ??
router.post("/activity/:idTrip", checkUser, async function(req, res){
    console.log(req.body);
    const schema =
        Joi.object({
            city: Joi.string().min(3).max(3).required(),
            country: Joi.string().min(2).max(2).required(),
            activity: Joi.string().required(),
        })

    try {
        await schema.validateAsync(req.body);
    } catch (error) {
        return res.status(403).send(error.toString());
    }

    let header = req.header('x-auth-token');
    let update = doAPIHit(header,1);
    if (!update) {
        return res.status(401).send({
            message: "Apihit tidak mencukupi"
        });
    }

    let idTrip = Number(req.params.idTrip);

    let user = await executeQuery(`select * from users where apikey = '${header}'`);
    let trip = await executeQuery(`select * from route where id = ${idTrip}`);
    if(trip.length<1) {
        return res.status(401).send({
            message: "Trip Not Found"
        });
    }
    if(trip[0].user_id !== user[0].id) {
        return res.status(401).send({
            message: "Not Allowed (Not The User)"
        });
    }

    let idCity = req.body.city.toUpperCase();
    let countryCode = req.body.country.toUpperCase();
    let idActivity = req.body.activity.toUpperCase();
    let ActivityData = await axios.get(
        `https://test.api.amadeus.com/v1/reference-data/locations/pois/${idActivity}`, {
            headers: {
                'Authorization': key
            }
        });
    console.log(ActivityData.data.data);
    let act = ActivityData.data.data;
    if(act.length === 0){
        return res.status(404).send({message:"No data for Activity "+idActivity});
    }
    //return res.status(200).send(act);
    let check = await executeQuery(`select * from d_route where route_id = '${idTrip}' and city_id = '${idCity}' and country_id = '${countryCode}'`);
    if(check.length<1) {
        try {
            let insert = await executeQuery(`insert into d_route
            values('', ${idTrip},"${idCity}","${countryCode}")`);
            if (insert) {
                console.log({
                    Message: "Add New City To Trip successfully!",
                    User: user[0].fname + " " + user[0].lname,
                    Trip: trip[0].route_name,
                    City: idCity
                });
            }
        } catch (error) {
            console.log(error);
            return res.status(500).send(error.toString());
        }
    }
    try {
        let insert = await executeQuery(`insert into d_activity
            values('',${check[0].id},"${idActivity}","${act.name}","${act.category}")`);
        if (insert) {
            return res.status(200).send({
                Message: "Add New Activity To Trip successfully!",
                User: user[0].fname + " " + user[0].lname,
                Trip: trip[0].route_name,
                Activity: act.name,
                Category: act.category,
                Tags: act.tags
            });
        }
    } catch (error) {
        console.log(error);
        return res.status(500).send(error.toString());
    }
})


module.exports = router;