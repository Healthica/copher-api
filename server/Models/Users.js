const _ = require('lodash')
const uuid = require('uuid')

module.exports = {
  createGuest(db, req, res, next) {
    if (!req.session.user_id) {
      const _id = uuid.v4()
      db.query('INSERT INTO users (id, auth_by, name) VALUES ($1, $2, $3);', [_id, 'none', 'Guest'], (err, result) => {
        if (err || result.rowCount !== 1) {
          console.error('Create guest user failed', _id, err, result)
          res.status(500).end()
        } else {
          console.log('Create guest', _id)
          req.session.user_id = _id
          next()
        }
      })
    } else {
      next()
    }
  },

  find(db, id) {
  },

  register(db, fields) {
  }
}
