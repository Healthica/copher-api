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

module.exports = {
  getEvents(req, res) {
    res.json(_.cloneDeep(_events))
    // res.json(_events_errors)
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
