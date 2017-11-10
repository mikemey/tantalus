const traderConfigs = [{
  clientId: 1,
  exchangeHost: 'http://localhost:8000/api/simex',
  timeslotSeconds: 300,
  tickSchedule: '3-58/12 * * * * *',
  buying: {
    ratio: 7, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 2,
    volumeLimitPence: 100000,
    lowerLimitPence: 5000
  },
  selling: {
    ratio: -1, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 1
  }
}, {
  clientId: 'T200_B5_2_S0_1',
  exchangeHost: 'http://localhost:8000/api/simex',
  timeslotSeconds: 200,
  tickSchedule: '4-59/4 * * * * *',
  buying: {
    ratio: 5, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 2,
    volumeLimitPence: 100000,
    lowerLimitPence: 5000
  },
  selling: {
    ratio: -0.1, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 1
  }
}, {
  clientId: 'T200_B7_2_S0_1',
  exchangeHost: 'http://localhost:8000/api/simex',
  timeslotSeconds: 200,
  tickSchedule: '5-59/4 * * * * *',
  buying: {
    ratio: 7, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 2,
    volumeLimitPence: 100000,
    lowerLimitPence: 5000
  },
  selling: {
    ratio: -0.1, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 1
  }
}, {
  clientId: 'T200_B10_2_S0_1',
  exchangeHost: 'http://localhost:8000/api/simex',
  timeslotSeconds: 200,
  tickSchedule: '6-59/12 * * * * *',
  buying: {
    ratio: 10, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 2,
    volumeLimitPence: 100000,
    lowerLimitPence: 5000
  },
  selling: {
    ratio: -0.1, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 1
  }
}, {
  clientId: 'T400_B7_2_S0_1',
  exchangeHost: 'http://localhost:8000/api/simex',
  timeslotSeconds: 400,
  tickSchedule: '7-59/12 * * * * *',
  buying: {
    ratio: 7, // price change (£/Ƀ) per timeslotSeconds
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
