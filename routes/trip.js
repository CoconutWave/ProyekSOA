const express = require("express");
const Joi = require('joi').extend(require('@joi/date'));
const router = express.Router();
const {
    executeQuery
} = require("../database");
const axios = require("axios");
const jwt = require("jsonwebtoken");

// ------------------ VAR ------------------
const key = "Bearer ODORZjD1Ed3BAU52BpFIfWk0SRYt";
const secret = "proyeksoauserbagian";

// ------------------ FUNCTION ------------------
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

    let route_name = req.body.route_name;
    let query = `select * from route where user_id='${req.header.user_id}' and route_name='${route_name}' and status!=2`
    let review = await executeQuery(query)
    if (review.length > 0){
        return res.status(400).send(`Trip ${route_name} is already exist!`)
    }

    let update = doAPIHit(req.header.apikey,1);
    if (!update) {
        return res.status(401).send({
            message: "Hit quota exceeded"
        });
    }

    let user = await executeQuery(`select * from users where apikey = '${req.header.apikey}'`);

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

    let update = doAPIHit(req.header.apikey,1);
    if (!update) {
        return res.status(401).send({
            message: "Hit quota exceeded"
        });
    }

    let idTrip = Number(req.params.idTrip);

    let user = await executeQuery(`select * from users where apikey = '${req.header.apikey}'`);
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
    if(city == null){
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

    let update = doAPIHit(req.header.apikey,1);
    if (!update) {
        return res.status(401).send({
            message: "Hit quota exceeded"
        });
    }

    let idTrip = Number(req.params.idTrip);

    let user = await executeQuery(`select * from users where apikey = '${req.header.apikey}'`);
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
    if(hotel == null){
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

    let update = doAPIHit(req.header.apikey,1);
    if (!update) {
        return res.status(401).send({
            message: "Hit quota exceeded"
        });
    }

    let idTrip = Number(req.params.idTrip);

    let user = await executeQuery(`select * from users where apikey = '${req.header.apikey}'`);
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
    if(act == null){
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

//get all activity [DONE | PERIKSA]
router.get("/", checkUser, async function(req, res){
    let header = req.header('x-auth-token');
    let userdata;
    try {
        userdata = jwt.verify(header, secret);
    } catch (error) {
        return res.status(400).send({
            "msg": "token tidak valid!"
        });
    }
    let apikey = userdata.apikey;

    let update = doAPIHit(apikey,1);
    if (!update) {
        return res.status(401).send({
            message: "Hit quota exceeded"
        });
    }

    let user = await executeQuery(`select * from users where apikey = '${apikey}'`);

    try {
        let getTrip = await executeQuery(`select * from route where user_id = '${user[0].id}' and status != 2`);
        if (getTrip.length<1) {
            return res.status(200).send({
                message: "No Trip From This User",
            });
        }
        let AllTrip = [];
        for(let i=0; i<getTrip.length;i++) {
            let AllRoute = [];
            let getRoute = await executeQuery(`select * from d_route where route_id = '${getTrip[i].id}'`);
            //return res.status(200).send(getRoute);
            for(let j=0; j<getRoute.length;j++) {
                let getHotel = await executeQuery(`select * from d_hotel where droute_id = '${getRoute[j].id}'`);
                let getActivity = await executeQuery(`select * from d_activity where droute_id = '${getRoute[j].id}'`);
                let temp = {
                    "City" : getRoute[i].city_id,
                    "Country" : getRoute[i].country_id,
                    "Hotel" : getHotel,
                    "Activity" : getActivity
                }
                AllRoute.push(temp);
            }
            AllTrip.push(AllRoute);
        }
        let status = "Pending";
        if(getTrip[0].status === 1) status = "Completed";

        let All = {
            "User" : user[0].fname + " " + user[0].lname,
            "Trip_Name" : getTrip[0].route_name,
            "Trip_Created" : getTrip[0].data_created,
            "Status" : status,
            "Trip" : AllTrip
        }
        return res.status(200).send(All);
    } catch (error) {
        console.log(error);
        return res.status(500).send(error.toString());
    }
})

// tandai trip sudah selesai [PERIKSA]
router.put("/completeTrip/:id", checkUser, async function(req, res){
    // cek param
    let id = req.params.id
    if (!id) {
        return res.status(400).send("Please provide Trip ID")
    }

    let userdata;
    try {
        userdata = jwt.verify(req.header('x-auth-token'), secret);
    } catch (error) {
        return res.status(400).send({
            "msg": "token tidak valid!"
        });
    }
    let apikey = userdata.apikey;

    // cek apakah id trip ada pada akun user yg nembak
    let user_id = req.header.user_id
    let query = `select * from route where user_id='${user_id}' and id='${id}' and status=0`
    let route = await executeQuery(query)
    route = route[0]
    if (!route){
        return res.status(404).send(`Trip not found`)
    }

    // update status
    query = `
        update route
        set status=1
        where user_id='${user_id}' and id='${id}'
    `
    let result = await executeQuery(query)
    if (result) {
        return res.status(200).send(`Trip ${route.route_name} has been marked as Complete`)
    }
    else {
        return res.status(500).send('Server error occured')
    }
})

// edit nama trip [PERIKSA]
router.put("/editTrip/:id", checkUser, async function(req, res){
    // cek param
    let id = req.params.id
    if (!id) {
        return res.status(400).send("Please provide Trip ID")
    }

    // cek body & nama kembar
    let user_id = req.header.user_id
    let new_name = req.body.new_name
    if (!new_name){
        return res.status(400).send("Please provide new name for the Trip")
    }
    let query = `select * from route where user_id='${user_id}' and route_name='${new_name}' and status!=2`
    let route = await executeQuery(query)
    if (route.length > 0){
        return res.status(400).send(`Trip ${new_name} is already exist!`)
    }

    // cek apakah id trip ada pada akun user yg nembak
    query = `select * from route where user_id='${user_id}' and id='${id}' and status!=2`
    route = await executeQuery(query)
    route = route[0]
    if (!route){
        return res.status(404).send(`Trip not found`)
    }

    // update nama trip
    query = `
        update route
        set route_name='${new_name}'
        where user_id='${user_id}' and id='${id}'
    `
    let result = await executeQuery(query)
    if (result) {
        return res.status(200).send({
            message: "Trip name successfully changed!",
            old_name: route.route_name,
            new_name
        })
    }
    else {
        return res.status(500).send('Server error occured')
    }
})

// delete trip berdasarkan id [PERIKSA]
router.delete("/deleteTrip/:id", checkUser, async function(req, res){
    // cek param
    let id = req.params.id
    if (!id) {
        return res.status(400).send("Please provide Trip ID")
    }

    // cek apakah id trip ada pada akun user yg nembak
    let user_id = req.header.user_id
    let query = `select * from route where user_id='${user_id}' and id='${id}' and status!=2`
    let route = await executeQuery(query)
    route = route[0]
    console.log(route)
    if (!route){
        return res.status(404).send(`Trip not found`)
    }

    // update status
    query = `
        update route
        set status=2
        where user_id='${user_id}' and id='${id}'
    `
    let result = await executeQuery(query)
    if (result) {
        return res.status(200).send(`Trip ${route.route_name} deleted successfully`)
    }
    else {
        return res.status(500).send('Server error occured')
    }
})

module.exports = router;