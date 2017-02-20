#!/usr/bin/env node
'use strict'

const env = require('node-env-file')
env(__dirname + '/../config/config.env')

const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const db = require('./utils/DbPool')
const uuid = require('uuid')

const session = require('express-session')
const pgSession = require('connect-pg-simple')(session)
// Fixes support for db-pool - https://github.com/voxpelli/node-connect-pg-simple/issues/36
pgSession.prototype.query = function (query, params, fn) {
  if (!fn && typeof params === 'function') {
   fn = params
  }
  this.pg.connect(function (err, client, done) {
    if (err) {
      done(client)
      if (fn) {
        fn(err)
      }
    } else {
      client.query(query, params || [], function (err, result) {
        done(err || false)
        if (fn) {
          fn(err, result && result.rows[0] ? result.rows[0] : false);
        }
      })
    }
  })
}
app.set('trust proxy', true)
app.use(session({
  store: new pgSession({
    pg: db.pool,
    tableName: 'user_sessions'
  }),
  name: 'session',
  secret: process.env.COOKIE_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: parseInt(process.env.COOKIE_DAYS_TOEXPIRE, 10) * 24 * 60 * 60 * 1000 },
  genid: function(req) {
    return uuid.v4()
  }
}))

app.use(bodyParser.json())

// Allow CORS - development only
if (process.env.ENV === 'development') {
  app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*")
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
    next()
  })
}

const Users = require('./Models/Users')
app.use((req, res, next) => Users.createGuest(db.pool, req, res, next))

const Events = require('./Models/Events')

app.get('/', function(req, res, next) {
  res.json({ success: true })
})
app.get('/events', function(req, res) {
  Events.getEvents(req, res)
})
app.post('/events', function(req, res) {
  Events.postEvents(req, res)
})

app.listen(process.env.PORT)
console.log('Listening on port ' + process.env.PORT)
