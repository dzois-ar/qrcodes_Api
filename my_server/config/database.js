const { Pool } = require('pg') 

const pool = new Pool({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT || process.env.PGP_ORT,
    ssl: false
}) 
module.exports = pool;