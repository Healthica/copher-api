const _ = require('lodash')
const async = require('async')
const Events = require('./Events')
const Charts = require('./Charts')

let db

module.exports = {
  setDb(pool) {
    db = pool
  },

  getData(req, res) {
    const fields_to_download = req.query.fields.split(',').map(f => f.toLowerCase())
    const queries = {}
    if (_.indexOf(fields_to_download, 'events') > -1) {
      queries.events = (cb) => {
        Events.getAllEvents(req, cb)
      }
    }
    if (_.indexOf(fields_to_download, 'charts') > -1) {
      queries.charts = (cb) => {
        Charts.getAllCharts(req, cb)
      }
    }
    if (_.indexOf(fields_to_download, 'settings') > -1) {
      queries.settings = (cb) => {
        //TODO
        cb({})
      }
    }
    async.parallel(queries, (err, results) => {
      res.setHeader('Content-disposition', 'attachment; filename=veeta-data.json');
      res.json({
        success: err === null,
        data: results
      })
    })
  }
}
