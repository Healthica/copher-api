const _ = require('lodash')
const uuid = require('uuid')
const moment = require('moment')

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
              WHERE e.user_id=$1 ORDER BY time DESC LIMIT 1000`, [req.session.user_id], function(err, result) {
      if (err) {
        console.error(req.user.id, err)
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
    _.each(req.body.transactions, t => {
      if (t.type === 'ADD') {
        _events.data.push(_.cloneDeep(t).event)
      } else if (t.type === 'UPDATE') {
        const index =  _.findIndex(_events.data, { id: t.event.id })
        _events.data.splice(index, 1, _.cloneDeep(t.event))
      } else if (t.type === 'DELETE') {
        const index =  _.findIndex(_events.data, { id: t.event.id })
        _events.data.splice(index, 1)
      }
    })
    // No new events from other clients since last sync
    _events.version++
    res.json({ success: true, version: _.cloneDeep(_events).version })

    // New events from other clients since last sync
    // _events.version = version + 1
    // _events.data.push({ id: Math.round(100 * Math.random()), title: 'new stuff' })
    // res.json(_.cloneDeep(_events))
  }
}
