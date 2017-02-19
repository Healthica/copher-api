#!/usr/bin/env node
'use strict'

const env = require('node-env-file')
env(__dirname + '/../config/config.env')

const express = require('express')
const app = express()

// For nginx forwarding
app.set('trust proxy', true)

app.get('/', function(req, res, next) {
  res.json({ success: true })
})

app.listen(process.env.PORT)
console.log('Listening on port ' + process.env.PORT)
