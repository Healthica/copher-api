const _ = require('lodash')
const async = require('async')

let db

module.exports = {
  setDb(pool) {
    db = pool
  },

  getCharts(req, res) {
    if (!req.session || !req.session.user_id) {
      return res.json({
        success: false,
        errors: [
          { id: 'no_user', text: 'Not logged in' }
        ]
      })
    }
    db.query(`SELECT data FROM charts WHERE user_id=$1 LIMIT 1`, [req.session.user_id], (err, result) => {
      if (err) {
        console.error(req.session.user_id, err)
        return res.json({
          success: false,
          errors: [
            { id: 'get_charts_failed', text: 'There was a problem loading your charts' }
          ]
        })
      } else if (result.rows.length !== 1) {
        return res.json({
          success: true,
          charts: []
        })
      } else {
        return res.json({
          success: true,
          charts: result.rows[0].data.charts || []
        })
      }
    })
  },

  postCharts(req, res) {
    //TODO validate charts
    db.query(`INSERT INTO charts (user_id, data) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET data = EXCLUDED.data`, [req.session.user_id, { charts: req.body.charts }], (err, result) => {
      if (err) {
        console.error(req.session.user_id, req.body.charts, err)
        return res.json({
          success: false,
          errors: [
            { id: 'post_charts_failed', text: 'There was a problem saving your charts' }
          ]
        })
      } else {
        return res.json({
          success: true
        })
      }
    })
  }
}
