var config = require('./config'); // get our config file
const util = require( 'util' );
const Mysql = require('mysql');

// =============================
// MYSQL CONNECTION DATABASE ===
// =============================

async function withTransaction( db, callback ) {
    try {
        await db.beginTransaction();
        await callback();
        await db.commit();
    } catch ( err ) {
        await db.rollback();
        throw err;
    } finally {
        await db.close();
    }
}

/*
try {
  await withTransaction( db, async () => {
    const someRows = await db.query( 'SELECT * FROM some_table' );
    const otherRows = await db.query( 'SELECT * FROM other_table' );
    // do something with someRows and otherRows
  } );
} catch ( err ) {
  // handle error
}
*/

function makeDb( config ) {
    try {
        const connection = Mysql.createConnection( config );
        console.log('Démarrage de la connexion mysql (MYSQL FILE)');
        return {
            query( sql, args ) {
                return util.promisify( connection.query )
                .call( connection, sql, args );
            },
            format( sql, args ) {
                return util.promisify( Mysql.format )
                .call( sql, args );
            },
            close() {
                return util.promisify( connection.end ).call( connection );
            },
            beginTransaction() {
              return util.promisify( connection.beginTransaction )
                .call( connection );
            },
            commit() {
              return util.promisify( connection.commit )
                .call( connection );
            },
            rollback() {
              return util.promisify( connection.rollback )
                .call( connection );
            }
        };
    } catch (e) {
        console.error('Impossible de se connecter à la BDD', e); 
    }
}

const db = makeDb( config.dbmysql );
exports.db = db;
exports.mysql = Mysql;

/*
const myconnexion = Mysql.createConnection(config.dbmysql)
myconnexion.connect(function(err){
    if(err){
        console.error('Impossible de se connecter à la BDD', err);
        //send_error_email("Impossible de se connecter à la BDD\n"+err);
    }
    console.log('Démarrage de la connexion mysql 1');
});
exports.mysql = myconnexion;
*/


/*
function connect () {
    mysql.connect(function(err){
        if(err){
            console.error('Impossible de se connecter à la BDD', err);
            send_error_email("Impossible de se connecter à la BDD\n"+err);
        }
        console.log('Démarrage de la connexion mysql');
    });
}*/