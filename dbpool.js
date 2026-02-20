const mysql = require('mysql');

// // Datos de la BD
// const DB_HOST = '157.230.211.213';
// const DB_USER = 'juanb';
// const DB_PASSWORD = 'INF0C4RG4';
// const DB_PORT = '3306';
// const DB_NAME = 'jt709a';

// Datos de la BD servidor linux
const DB_HOST = '104.236.112.160';
const DB_USER = 'juanb';
const DB_PASSWORD = 'PELUCHE';
const DB_PORT = '3306';
const DB_NAME = 'jt709C';
// Datos de conexión UDP
//157.230.211.213
const UDP_HOST = '127.0.0.1';
const UDP_PORT = 9007;

const pool = mysql.createPool({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    port: DB_PORT,
    database: DB_NAME
});

let query = function (sql, values) {
    return new Promise((resolve, reject) => {
        pool.getConnection(function (err, connection) {
            if (err) {
                console.log("error de sql conection");
                resolve(err);
            } else {
                connection.query(sql, values, (err, rows) => {
                    if (err) {
                        console.error("[MySQL ERROR]",
                            "\n code:", err.code,
                            "\n errno:", err.errno,
                            "\n sqlState:", err.sqlState,
                            "\n sqlMessage:", err.sqlMessage,
                            "\n sql:", err.sql
                        );
                        return reject(err);
                    } else {
                        resolve(rows);
                    }
                    connection.release();
                });
            }
        });
    });
};

// cuelgo la config UDP en la misma exportación
query.UDP_HOST = UDP_HOST;
query.UDP_PORT = UDP_PORT;

module.exports = query;
