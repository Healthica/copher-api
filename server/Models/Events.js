const _ = require('lodash')
const uuid = require('uuid')
const moment = require('moment')
const async = require('async')

function normalizeEvents(rows) {
  const events = _.values(_.groupBy(rows, 'id'))
  return _.map(events, e => {
    return {
      id: e[0].id,
      title: e[0].title,
      time: moment(e[0].time).format(),
      fields: _.transform(e, (fields, f) => {
        const field = {
          id: f.field_id,
          title: f.field_title,
          type: f.type,
          value: parseFieldValue(f.type, f.value)
        }
        if (f.options) {
          field.options = f.options
        }
        if (field.id !== null && field.type !== null) {
          fields.push(field)
        }
      }, [])
    }
  })
}

function parseFieldValue(field_type, value) {
  switch (field_type) {
    case 'duration':
    case 'intensity':
    case 'weight':
    case 'length':
    case 'rank_stars':
    case 'units':
      return parseFloat(value)
      break;
    case 'switch':
      return value === 'true'
      break;
    case 'text':
    case 'select':
    default:
      return value
  }
}

function stringifyFieldValue(field_type, value) {
  switch (field_type) {
    case 'text':
    case 'select':
      return value
      break;
    default:
    case 'duration':
    case 'intensity':
    case 'weight':
    case 'length':
    case 'rank_stars':
    case 'switch':
    case 'units':
      return JSON.stringify(value)
  }
}

function processTransactions(user_id, transactions, cb) {
  let processed_transactions = { success: 0, failures: [] }
  const q = async.queue((transaction, cb) => {
    switch (transaction.type) {
      case 'ADD':
        addEvent(user_id, transaction.event, cb)
        break;
      case 'UPDATE':
        updateEvent(user_id, transaction.event, cb)
        break;
      case 'DELETE':
        deleteEvent(user_id, transaction.event, cb)
        break;
      default:
        console.error(`Unknown transaction type: ${transaction.type} for user ${user_id}`)
        cb(new Error('Unknown transaction type'))
    }
  }, 1)
  q.drain = () => {
    cb(processed_transactions)
  }
  q.push(transactions, err => {
    if (err) {
      processed_transactions.failures.push(err)
    } else {
      processed_transactions.success++
    }
  })
}

function addEvent(user_id, event, cb) {
  //TODO validate event
  // Create Event
  db.query('INSERT INTO events (id, user_id, title, "time") VALUES ($1, $2, $3, $4)', [event.id, user_id, event.title, event.time], (err, result) => {
    if (err || result.rowCount !== 1) {
      console.error('Create event failed', user_id, err, result)
      cb(new Error('Create event failed'))
    } else {
      if (event.fields.length > 0) {
        // Create Fields
        addEventFields(user_id, event.id, event.fields, err => {
          if (err) {
            cb(err)
          } else {
            incrementEventsVersion(user_id, cb)
          }
        })
      } else {
        incrementEventsVersion(user_id, cb)
      }
    }
  })
}
function addEventFields(user_id, event_id, fields, cb) {
  //TODO validate type/value
  const flat_variables = []
  const flat_values = []
  let n = 1
  _.each(fields, (f, i) => {
    flat_values.push(f.id)
    flat_values.push(event_id)
    flat_values.push(f.title)
    flat_values.push(f.type)
    flat_values.push(stringifyFieldValue(f.type, f.value))
    flat_values.push(f.options || null)
    flat_values.push(i + 1)
    const vars = []
    _.times(7, () => {
      vars.push('$' + n)
      n++
    })
    flat_variables.push(`(${vars.join(',')})`)
  })
  db.query('INSERT INTO event_fields (id, event_id, title, type, value, options, "order") VALUES ' + flat_variables.join(','), flat_values, (err, result) => {
    if (err || result.rowCount !== fields.length) {
      console.error('Create fields failed', user_id, event_id, err, result)
      cb(new Error('Create fields failed'))
    } else {
      cb(null)
    }
  })
}
function updateEvent(user_id, event, cb) {
  //TODO validate event
  // Update Event
  db.query('UPDATE events SET title=$3, "time"=$4 WHERE id=$1 AND user_id=$2', [event.id, user_id, event.title, event.time], (err, result) => {
    if (err || result.rowCount !== 1) {
      console.error('Update event failed', user_id, event.id, err, result)
      cb(new Error('Update event failed'))
    } else {
      // Delete Fields
      deleteEventFields(user_id, event, err => {
        if (err) {
          cb(err)
        } else {
          if (event.fields.length > 0) {
            // Create Fields
            addEventFields(user_id, event.id, event.fields, err => {
              if (err) {
                cb(err)
              } else {
                incrementEventsVersion(user_id, cb)
              }
            })
          } else {
            incrementEventsVersion(user_id, cb)
          }
        }
      })
    }
  })

}
function deleteEvent(user_id, event, cb) {
  // Delete Fields
  deleteEventFields(user_id, event, err => {
    if (err) {
      cb(err)
    } else {
      // Delete Event
      db.query('DELETE FROM events WHERE events.id=$1 AND events.user_id=$2', [event.id, user_id], (err, result) => {
        if (err) {
          console.error('Delete event failed', user_id, event_id, err, result)
          cb(new Error('Delete event failed'))
        } else {
          incrementEventsVersion(user_id, cb)
        }
      })
    }
  })
}
function deleteEventFields(user_id, event, cb) {
  db.query('DELETE FROM event_fields USING events WHERE events.id=event_fields.event_id AND events.id = $1 AND events.user_id = $2', [event.id, user_id], (err, result) => {
    if (err) {
      console.error('Delete fields failed', user_id, event_id, err, result)
      cb(new Error('Delete fields failed'))
    } else {
      cb(null)
    }
  })
}

function getEventsVersion(user_id, cb) {
  db.query(`SELECT events_version FROM users WHERE id=$1 LIMIT 1`, [user_id], (err, result) => {
    if (err || result.rows.length !== 1 || typeof result.rows[0].events_version === undefined) {
      console.error('Error fetching events version for user ' + user_id)
      cb(null)
    } else {
      cb(result.rows[0].events_version)
    }
  })
}

function incrementEventsVersion(user_id, cb) {
  db.query(`UPDATE users SET events_version = events_version + 1 WHERE id=$1`, [user_id], (err, result) => {
    if (err || result.rowCount !== 1) {
      console.error('Error incrementing events version for user ' + user_id)
      cb(new Error('Error incrementing events version'))
    } else {
      cb(null)
    }
  })
}

let db

module.exports = {
  setDb(pool) {
    db = pool
  },

  getAllEvents(req, cb) {
    if (!req.session || !req.session.user_id) {
      cb(new Error('Not logged in'))
    }
    db.query(`SELECT e.id, e.title, e.time, f.id "field_id", f.title "field_title", f.type, f.value, f.options
              FROM events e LEFT OUTER JOIN event_fields f ON e.id = f.event_id
              WHERE e.user_id=$1 ORDER BY time DESC, f.order`, [req.session.user_id], (err, result) => {
      if (err) {
        cb(err)
      } else {
        cb(null, normalizeEvents(result.rows))
      }
    })
  },

  getEvents(req, res) {
    if (!req.session || !req.session.user_id) {
      return res.json({
        success: false,
        errors: [
          { id: 'no_user', text: 'Not logged in' }
        ]
      })
    }
    db.query(`SELECT e.id, e.title, e.time, f.id "field_id", f.title "field_title", f.type, f.value, f.options
              FROM events e LEFT OUTER JOIN event_fields f ON e.id = f.event_id
              WHERE e.user_id=$1 ORDER BY time DESC LIMIT 1000`, [req.session.user_id], (err, result) => {
      if (err) {
        console.error(req.session.user_id, err)
        return res.json({
          success: false,
          errors: [
            { id: 'get_events_failed', text: 'There was a problem loading your events' }
          ]
        })
      } else {
        getEventsVersion(req.session.user_id, version => {
          return res.json({
            success: true,
            version: version,
            data: normalizeEvents(result.rows)
          })
        })
      }
    })
  },

  postEvents(req, res) {
    getEventsVersion(req.session.user_id, last_version => {
      processTransactions(req.session.user_id, req.body.transactions, (processed_transactions) => {
        getEventsVersion(req.session.user_id, new_version => {
          res.json({
            success: true,
            version: new_version,
            processed_transactions: processed_transactions,
            has_new_events: req.body.version !== last_version
          })
        })
      })
    })
  }
}
