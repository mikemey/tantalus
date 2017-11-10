const traderConfigs = [{
  clientId: 'T(300) B( 7.0 / 2) S(- 1.0 / 1)',
  exchangeHost: 'http://localhost:8000/api/simex',
  timeslotSeconds: 300,
  tickSchedule: '2-58/10 * * * * *',
  buying: {
    ratio: 7.0, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 2,
    volumeLimitPence: 100000,
    lowerLimitPence: 5000
  },
  selling: {
    ratio: -1.0, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 1
  }
}, {
  clientId: 'T(200) B( 5.0 / 2) S(- 0.1 / 1)',
  exchangeHost: 'http://localhost:8000/api/simex',
  timeslotSeconds: 200,
  tickSchedule: '4-59/10 * * * * *',
  buying: {
    ratio: 5.0, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 2,
    volumeLimitPence: 100000,
    lowerLimitPence: 5000
  },
  selling: {
    ratio: -0.1, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 1
  }
}, {
  clientId: 'T(200) B( 7.0 / 2) S(- 0.1 / 1)',
  exchangeHost: 'http://localhost:8000/api/simex',
  timeslotSeconds: 200,
  tickSchedule: '5-59/10 * * * * *',
  buying: {
    ratio: 7.0, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 2,
    volumeLimitPence: 100000,
    lowerLimitPence: 5000
  },
  selling: {
    ratio: -0.1, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 1
  }
}, {
  clientId: 'T(200) B(10.0 / 2) S(- 0.1 / 1)',
  exchangeHost: 'http://localhost:8000/api/simex',
  timeslotSeconds: 200,
  tickSchedule: '7-59/10 * * * * *',
  buying: {
    ratio: 10.0, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 2,
    volumeLimitPence: 100000,
    lowerLimitPence: 5000
  },
  selling: {
    ratio: -0.1, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 1
  }
}, {
  clientId: 'T(400) B( 7.0 / 2) S(- 0.1 / 1)',
  exchangeHost: 'http://localhost:8000/api/simex',
  timeslotSeconds: 400,
  tickSchedule: '9-59/10 * * * * *',
  buying: {
    ratio: 7.0, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 2,
    volumeLimitPence: 100000,
    lowerLimitPence: 5000
  },
  selling: {
    ratio: -0.1, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 1
  }
}]

module.exports = { traderConfigs }
