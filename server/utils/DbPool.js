'use strict'

const pg = require('pg')
const pool = new pg.Pool({
  host:     process.env.PG_HOST,
  port:     process.env.PG_PORT,
  user:     process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DB,
  max: 10,
  idleTimeoutMillis: 30000
})

pool.on('error',  (err, client) => {
  console.error('idle client error', err.message, err.stack)
})

module.exports = {
  pool: pool,
  query: (query, params, cb) => {
    pool.connect((err, client, done) => {
      if(err) {
        console.error('error fetching client from pool', err)
        cb(err)
        return
      }
      client.query(query, params, (err, result) => {
        done()
        if(err) {
          console.error('error running query', err)
          cb(err)
          return
        }
        cb(null, result)
      })
    })
  }
}
