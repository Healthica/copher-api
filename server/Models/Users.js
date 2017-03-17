'use strict'

const _ = require('lodash')
const uuid = require('uuid')
const bcrypt = require('bcryptjs')
const moment = require('moment')

let db

module.exports = {
  setDb(pool) {
    db = pool
  },

  createGuest(req, res, next) {
    if (!req.session.user_id) {
      const _id = uuid.v4()
      db.query('INSERT INTO users (id, auth_by, name) VALUES ($1, $2, $3);', [_id, 'none', 'Guest'], (err, result) => {
        if (err || result.rowCount !== 1) {
          console.error('Create guest user failed', _id, err, result)
          res.status(500).end()
        } else {
          req.session.user_id = _id
          next()
        }
      })
    } else {
      next()
    }
  },

  updateLastModified(user_id) {
    const now = moment.utc().format('YYYY-MM-DD HH:mm:ss')
    db.query('UPDATE users SET last_modified=$2 WHERE id=$1;', [user_id, now], (err, result) => {
      if (err) {
        console.error('updateLastModified failed', user_id, result, err)
      }
    })
  },

  find(user, cb) {
    db.query('SELECT * FROM users WHERE id=$1 LIMIT 1', [user.id], (err, result) => {
      if (err || result.rowCount !== 1) {
        return cb(err || new Error('User not found'))
      }
      cb(null, result.rows[0])
    })
  },

  checkPassword(login, password, cb) {
    db.query('SELECT * FROM users WHERE login=$1 LIMIT 1', [login], (err, result) => {
      if (err || result.rowCount !== 1) {
        return cb(err || new Error('User not found'))
      }
      cb(null, bcrypt.compareSync(password, result.rows[0].password) ? result.rows[0] : false)
    })
  },

  register(req, cb) {
    // Validate fields
    const errors = []
    if (!req.session.user_id) {
      errors.push('Login as guest before registering')
    }
    if (!req.body.login || req.body.login.length < 5) {
      errors.push('Login name too short')
    }
    if (!req.body.password || req.body.password.length < 8) {
      errors.push('Password too short')
    }
    if (req.body.name && req.body.name.length > 16) {
      errors.push('Display name too long')
    }
    if (errors.length !== 0) {
      cb({success: false, errors: errors})
      return
    }

    // Update DB
    bcrypt.genSalt(10, function(err, salt) {
      bcrypt.hash(req.body.password, salt, function(err, hash) {
        const fields = [req.session.user_id, req.body.login, hash, 'password']
        if (req.body.name) {
          fields.push(req.body.name)
        }
        db.query('UPDATE users SET login=$2, password=$3, auth_by=$4' + (fields.length === 5 ? ', name=$5' : '') + ' WHERE id=$1 AND password IS NULL;', fields, function(err, result) {
          if (err || result.rowCount !== 1) {
            if (err && err.code === '23505') {
              cb({success: false, errors: ['Login name already taken']})
            } else {
              console.error('Register user failed', err, req.session.user_id, req.body, result);
              cb({ success: false, errors: ['There was a problem creating your account. Please try again later.'] })
            }
          } else {
            cb({ success: true, user_id: req.session.user_id })
          }
        })
      })
    })
  },

  updateSession(req, cb) {
    this.find({ id: req.session.user_id }, (err, user) => {
      req.login(user, err => {
        cb(err)
      })
    })
  },

  updateProfile(req, cb) {
    // Validate fields
    const errors = []
    const fieldsDict = {}
    if (!req.session.user_id) {
      errors.push('Not logged in')
    }
    if (req.body.name) {
      if (req.body.name.length > 16) {
        errors.push('Display name too long')
      } else {
        fieldsDict.name = req.body.name
      }
    }
    if (_.keys(fieldsDict).length === 0) {
      errors.push('Nothing to update')
    }
    if (errors.length !== 0) {
      cb({success: false, errors: errors})
      return
    }

    // Update DB
    let n = 2
    const sql = _.reduce(fieldsDict, (result, value, key) => {
      result.fields.push(`${key}=$${n}`)
      result.values.push(value)
      n++
      return result
    }, { fields: [], values: [] })
    db.query('UPDATE users SET ' + sql.fields.join(', ') + ' WHERE id=$1;', _.concat(req.session.user_id, sql.values), (err, result) => {
      if (err || result.rowCount !== 1) {
        console.error('Update user failed', err, req.session.user_id, req.body, result);
        cb({ success: false, errors: ['There was a problem updating your profile. Please try again later.'] })
      } else {
        this.updateSession(req, err => {
          if (err) {
            cb({ success: false })
          } else {
            cb({ success: true })
          }
        })
      }
    })
  }
}
