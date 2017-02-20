#!/usr/bin/env node
'use strict'

const env = require('node-env-file')
env(__dirname + '/../config/config.env')

const express = require('express')
const app = express()
const bodyParser = require('body-parser')

// For nginx forwarding
app.set('trust proxy', true)

app.use(bodyParser.json())

// Allow CORS - development only
if (process.env.ENV === 'development') {
  app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*")
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
    next()
  })
}

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
