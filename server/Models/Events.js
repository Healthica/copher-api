const _ = require('lodash')
const uuid = require('uuid')
const moment = require('moment')
const async = require('async')

/**
 * Mocking client-server processing
 */
const _events = {
  success: true,
  version: 1,
  data: [
    {
      id: uuid.v4(),
      title: 'Sleep',
      time: moment().subtract(1, 'days').subtract(Math.round(1000 * Math.random()), 'minutes').format(),
      fields: [
        {
          id: '_sleep_duration',
          title: 'Duration',
          type: 'duration',
          value: 450
        }, {
          id: '_sleep_quality',
          title: 'Quality',
          type: 'rank_stars',
          value: 3
        }, {
          id: '_sleep_type',
          title: 'Type',
          type: 'select',
          value: 'Regular',
          options: {
            options: [
              'Nap',
              'Regular',
              'Other'
            ]
          }
        }, {
          id: '_sleep_is_natural',
          title: 'Natural Wakeup',
          type: 'switch',
          value: false
        }
      ]
    }, {
      id: uuid.v4(),
      title: 'Body Weight',
      time: moment().subtract(2, 'days').subtract(Math.round(1000 * Math.random()), 'minutes').format(),
      fields: [
        {
          id: '_body_weight',
          title: 'Weight',
          type: 'weight',
          value: 85,
          options: {
            units: 'kg'
          }
        }, {
          id: '_body_number',
          title: 'Some Number',
          type: 'number',
          value: 43
        }
      ]
    }, {
      id: uuid.v4(),
      title: 'Run',
      time: moment().subtract(2, 'days').subtract(Math.round(1000 * Math.random()), 'minutes').format(),
      fields: [
        {
          id: '_run_duration',
          title: 'Duration',
          type: 'duration',
          value: 130
        }, {
          id: '_run_length',
          title: 'Length',
          type: 'length',
          value: 4.5,
          options: {
            units: 'km'
          }
        }, {
          id: '_sleep_notes',
          title: 'Notes',
          type: 'text',
          value: "It was slightly raining.\nSlowed down a bit as a precaution."
        }
      ]
    }, {
      id: uuid.v4(),
      title: 'Sleep',
      time: moment().subtract(3, 'days').subtract(Math.round(1000 * Math.random()), 'minutes').format(),
      fields: [
        {
          // id: '_sleep_quality',
          // title: 'Quality',
          // type: 'rank_stars',
          // value: 4.0
        // }, {
          id: '_sleep_duration1',
          title: 'Duration1',
          type: 'duration',
          value: 600
        }, {
          id: '_sleep_duration2',
          title: 'Duration2',
          type: 'duration',
          value: 500
        }, {
          id: '_sleep_duration3',
          title: 'Duration3',
          type: 'duration',
          value: 400
        }
      ]
    }, {
      id: uuid.v4(),
      title: 'Headache',
      time: moment().subtract(4, 'days').subtract(Math.round(1000 * Math.random()), 'minutes').format(),
      fields: [
        {
          id: '_headache_duration',
          title: 'Duration',
          type: 'duration',
          value: 15
        }, {
          id: '_headache_intensity',
          title: 'Intensity',
          type: 'scale',
          options: {
            min: 1,
            max: 10
          },
          value: 7
        }, {
          id: '_headache_pain_areas',
          title: 'Pain Areas',
          type: 'checkbox',
          options: {
            options: [
              'Head',
              'Behind the eye',
              'Neck',
              'Back of the head'
            ]
          },
          value: ['Behind the eye', 'Neck']
        }
      ]
    }
  ]
}
// _events.data = []
const _events_new_version = {
  success: false,
  has_new_version: true,
  errors: [
    { id: 'events_merged_new_version', text: 'New version exists, reload to sync' }
  ]
}
const _events_errors = {
  success: false,
  errors: [
    { id: 'something_went_wrong', text: 'Something went wrong!' },
    { id: 'some_error', text: 'Old server version' }
  ]
}

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
        fields.push(field)
      }, [])
    }
  })
}

function parseFieldValue(field_type, value) {
  switch (field_type) {
    case 'duration':
    case 'rank_stars':
    case 'weight':
    case 'length':
    case 'length':
    case 'number':
      return parseFloat(value)
      break;
    case 'checkbox':
      return JSON.parse(value)
      break;
    case 'switch':
      return value === true
      break;
    default:
      return value
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
  console.log('ADD', event);
  incrementEventsVersion(user_id, err => {
    cb(err)
  })
}
function updateEvent(user_id, event, cb) {
  console.log('UPDATE', event);
  incrementEventsVersion(user_id, err => {
    cb(err)
  })
}
function deleteEvent(user_id, event, cb) {
  console.log('DELETE', event);
  incrementEventsVersion(user_id, err => {
    cb(err)
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
        return res.json({
          success: true,
          version: 1,
          data: normalizeEvents(result.rows)
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
