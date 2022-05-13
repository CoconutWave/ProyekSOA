const mysql = require("mysql");
// let pool = mysql.createPool({
//     host: "localhost",
//     user: "root",
//     password: "",
//     database: "soaproject_hotel_flight"
// });

// const executeQuery = async (query) => {
//     return new Promise((resolve, reject) => {
//         pool.query(query, (err, rows, fields) => {
//             if (err) reject(err);
//             else resolve(rows);
//         });
//     });
// };

const pool = mysql.createPool({
    host:'localhost',
    user:'root',
    password:'',
    database:'soaproject_hotel_flight',
})

const getPool = () =>{
    try{
        return new Promise(function(resolve ,reject){
            pool.getConnection(function(err,conn){
                if(err){
                    reject(err)
                }else{
                    resolve(conn)
                }
            })
        })

    }catch(err){
        console.log(err)
    }
}

const executeQuery = async(query) =>{
    let conn = await getPool()
    try{
        return new Promise( (resolve,reject)=>{
            conn.query(query ,(err,result)=>{
                conn.release();
                err ? reject(err):resolve(result)
            })
        })
    }catch(err){
        console.log(err)
    }
}

module.exports = {
    'executeQuery' : executeQuery
};