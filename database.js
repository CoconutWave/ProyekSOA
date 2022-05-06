const mysql = require("mysql");
let pool = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "",
    database: "soaproject_hotel_flight"
});

const executeQuery = async (query) => {
    return new Promise((resolve, reject) => {
        pool.query(query, (err, rows, fields) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

module.exports = {
    'executeQuery' : executeQuery
};