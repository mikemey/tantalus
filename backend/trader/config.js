const traderConfigs = [{ // =========================== T 200
  clientId: 'T(200) B(15.0 / 3) S(- 0.6 / 2)',
  exchangeHost: 'http://localhost:8000/api/simex',
  timeslotSeconds: 200,
  tickSchedule: '2-58/10 * * * * *',
  buying: {
    ratio: 15.0, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 3,
    volumeLimitPence: 100000,
    lowerLimitPence: 5000
  },
  selling: {
    ratio: -0.6, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 2
  }
}, {
  clientId: 'T(200) B(12.5 / 3) S(- 0.1 / 2)',
  exchangeHost: 'http://localhost:8000/api/simex',
  timeslotSeconds: 200,
  tickSchedule: '2-59/10 * * * * *',
  buying: {
    ratio: 12.5, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 3,
    volumeLimitPence: 100000,
    lowerLimitPence: 5000
  },
  selling: {
    ratio: -0.1, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 2
  }
}, {
  clientId: 'T(200) B(10.0 / 3) S(  0.0 / 2)',
  exchangeHost: 'http://localhost:8000/api/simex',
  timeslotSeconds: 200,
  tickSchedule: '2-59/10 * * * * *',
  buying: {
    ratio: 10.0, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 3,
    volumeLimitPence: 100000,
    lowerLimitPence: 5000
  },
  selling: {
    ratio: 0, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 2
  }
}, {
  clientId: 'T(200) B( 7.0 / 3) S(- 0.1 / 2)',
  exchangeHost: 'http://localhost:8000/api/simex',
  timeslotSeconds: 200,
  tickSchedule: '3-59/10 * * * * *',
  buying: {
    ratio: 7.0, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 3,
    volumeLimitPence: 100000,
    lowerLimitPence: 5000
  },
  selling: {
    ratio: -0.1, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 2
  }
}, { // ================================================ T 150
  clientId: 'T(150) B( 7.0 / 4) S(- 0.1 / 2)',
  exchangeHost: 'http://localhost:8000/api/simex',
  timeslotSeconds: 150,
  tickSchedule: '4-59/10 * * * * *',
  buying: {
    ratio: 7.0, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 4,
    volumeLimitPence: 100000,
    lowerLimitPence: 5000
  },
  selling: {
    ratio: -0.1, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 2
  }
}, {
  clientId: 'T(150) B( 5.0 / 4) S(- 0.1 / 2)',
  exchangeHost: 'http://localhost:8000/api/simex',
  timeslotSeconds: 150,
  tickSchedule: '4-59/10 * * * * *',
  buying: {
    ratio: 5.0, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 4,
    volumeLimitPence: 100000,
    lowerLimitPence: 5000
  },
  selling: {
    ratio: -0.1, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 2
  }
}, {
  clientId: 'T(150) B( 3.0 / 4) S(  0.0 / 2)',
  exchangeHost: 'http://localhost:8000/api/simex',
  timeslotSeconds: 150,
  tickSchedule: '5-59/10 * * * * *',
  buying: {
    ratio: 3.0, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 4,
    volumeLimitPence: 100000,
    lowerLimitPence: 5000
  },
  selling: {
    ratio: 0, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 2
  }
}, { // ================================================ T 50
  clientId: 'T( 50) B( 5.0 /10) S(- 0.5 / 2)',
  exchangeHost: 'http://localhost:8000/api/simex',
  timeslotSeconds: 50,
  tickSchedule: '5-59/10 * * * * *',
  buying: {
    ratio: 5.0, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 10,
    volumeLimitPence: 100000,
    lowerLimitPence: 5000
  },
  selling: {
    ratio: -0.5, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 2
  }
}, {
  clientId: 'T( 50) B( 3.0 /10) S(- 0.5 / 2)',
  exchangeHost: 'http://localhost:8000/api/simex',
  timeslotSeconds: 50,
  tickSchedule: '6-59/10 * * * * *',
  buying: {
    ratio: 3.0, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 10,
    volumeLimitPence: 100000,
    lowerLimitPence: 5000
  },
  selling: {
    ratio: -0.5, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 2
  }
}, { // ================================================ T 300
  clientId: 'T(300) B(10.0 / 3) S(- 0.3 / 2)',
  exchangeHost: 'http://localhost:8000/api/simex',
  timeslotSeconds: 300,
  tickSchedule: '6-59/10 * * * * *',
  buying: {
    ratio: 10.0, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 3,
    volumeLimitPence: 100000,
    lowerLimitPence: 5000
  },
  selling: {
    ratio: -0.3, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 2
  }
}, {
  clientId: 'T(300) B( 7.0 / 3) S(- 0.3 / 2)',
  exchangeHost: 'http://localhost:8000/api/simex',
  timeslotSeconds: 300,
  tickSchedule: '7-59/10 * * * * *',
  buying: {
    ratio: 7.0, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 3,
    volumeLimitPence: 100000,
    lowerLimitPence: 5000
  },
  selling: {
    ratio: -0.3, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 2
  }
}, {
  clientId: 'T(300) B( 5.0 / 3) S(- 0.3 / 2)',
  exchangeHost: 'http://localhost:8000/api/simex',
  timeslotSeconds: 300,
  tickSchedule: '8-59/10 * * * * *',
  buying: {
    ratio: 5.0, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 3,
    volumeLimitPence: 100000,
    lowerLimitPence: 5000
  },
  selling: {
    ratio: -0.3, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 2
  }
}, {
  clientId: 'T(300) B( 3.5 / 3) S(- 0.1 / 2)',
  exchangeHost: 'http://localhost:8000/api/simex',
  timeslotSeconds: 300,
  tickSchedule: '9-59/10 * * * * *',
  buying: {
    ratio: 3.5, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 3,
    volumeLimitPence: 100000,
    lowerLimitPence: 5000
  },
  selling: {
    ratio: -0.1, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 2
  }
}]

module.exports = { traderConfigs }
