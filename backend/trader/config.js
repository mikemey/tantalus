const deepAssign = require('assign-deep')

const traderConfigs = [{ // =========================== T 200
  clientId: 'T(200) B(15.0 / 4) S(- 0.6 / 3)',
  timeslotSeconds: 200,
  tickSchedule: '2-58/17 * * * * *',
  buying: {
    ratio: 15.0, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 4
  },
  selling: {
    ratio: -0.6, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 3
  }
}, {
  clientId: 'T(200) B(12.5 / 4) S(- 0.1 / 3)',
  timeslotSeconds: 200,
  tickSchedule: '2-59/17 * * * * *',
  buying: {
    ratio: 12.5, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 4
  },
  selling: {
    ratio: -0.1, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 3
  }
}, {
  clientId: 'T(200) B(10.0 / 4) S(  0.0 / 3)',
  timeslotSeconds: 200,
  tickSchedule: '2-59/17 * * * * *',
  buying: {
    ratio: 10.0, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 4
  },
  selling: {
    ratio: 0, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 3
  }
}, {
  clientId: 'T(200) B( 7.0 / 4) S(- 0.1 / 3)',
  timeslotSeconds: 200,
  tickSchedule: '3-59/17 * * * * *',
  buying: {
    ratio: 7.0, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 4
  },
  selling: {
    ratio: -0.1, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 3
  }
}, { // ================================================ T 150
  clientId: 'T(150) B( 7.0 / 5) S(- 0.1 / 3)',
  timeslotSeconds: 150,
  tickSchedule: '4-59/17 * * * * *',
  buying: {
    ratio: 7.0, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 5
  },
  selling: {
    ratio: -0.1, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 3
  }
}, {
  clientId: 'T(150) B( 5.0 / 5) S(- 0.1 / 3)',
  timeslotSeconds: 150,
  tickSchedule: '4-59/17 * * * * *',
  buying: {
    ratio: 5.0, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 5
  },
  selling: {
    ratio: -0.1, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 3
  }
}, {
  clientId: 'T(150) B( 3.0 / 5) S(  0.0 / 3)',
  timeslotSeconds: 150,
  tickSchedule: '5-59/17 * * * * *',
  buying: {
    ratio: 3.0, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 5
  },
  selling: {
    ratio: 0, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 3
  }
}, { // ================================================ T 50
  clientId: 'T( 50) B( 5.0 /10) S(- 0.5 / 3)',
  timeslotSeconds: 50,
  tickSchedule: '5-59/17 * * * * *',
  buying: {
    ratio: 5.0, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 10
  },
  selling: {
    ratio: -0.5, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 3
  }
}, {
  clientId: 'T( 50) B( 3.0 /10) S(- 0.5 / 3)',
  timeslotSeconds: 50,
  tickSchedule: '6-59/17 * * * * *',
  buying: {
    ratio: 3.0, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 10
  },
  selling: {
    ratio: -0.5, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 3
  }
}, {
  clientId: 'T( 50) B( 5.0 / 7) S(- 0.5 / 3)',
  timeslotSeconds: 50,
  tickSchedule: '10-59/17 * * * * *',
  buying: {
    ratio: 5.0, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 7
  },
  selling: {
    ratio: -0.5, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 3
  }
}, {
  clientId: 'T( 50) B( 3.0 / 7) S(- 0.5 / 3)',
  timeslotSeconds: 50,
  tickSchedule: '3-59/17 * * * * *',
  buying: {
    ratio: 3.0, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 7
  },
  selling: {
    ratio: -0.5, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 3
  }
}, {
  clientId: 'T( 50) B( 5.0 / 4) S(- 0.5 / 2)',
  timeslotSeconds: 50,
  tickSchedule: '1-59/17 * * * * *',
  buying: {
    ratio: 5.0, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 4
  },
  selling: {
    ratio: -0.5, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 2
  }
}, {
  clientId: 'T( 50) B( 4.0 / 4) S(- 0.5 / 2)',
  timeslotSeconds: 50,
  tickSchedule: '6-59/17 * * * * *',
  buying: {
    ratio: 4.0, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 4
  },
  selling: {
    ratio: -0.5, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 2
  }
}, { // ================================================ T 300
  clientId: 'T(300) B(10.0 / 4) S(- 0.3 / 3)',
  timeslotSeconds: 300,
  tickSchedule: '6-59/17 * * * * *',
  buying: {
    ratio: 10.0, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 4
  },
  selling: {
    ratio: -0.3, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 3
  }
}, {
  clientId: 'T(300) B( 7.0 / 4) S(- 0.3 / 3)',
  timeslotSeconds: 300,
  tickSchedule: '7-59/17 * * * * *',
  buying: {
    ratio: 7.0, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 4
  },
  selling: {
    ratio: -0.3, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 3
  }
}, {
  clientId: 'T(300) B( 5.0 / 4) S(- 0.3 / 3)',
  timeslotSeconds: 300,
  tickSchedule: '8-59/17 * * * * *',
  buying: {
    ratio: 5.0, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 4
  },
  selling: {
    ratio: -0.3, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 3
  }
}, {
  clientId: 'T(300) B( 3.5 / 4) S(- 0.1 / 3)',
  timeslotSeconds: 300,
  tickSchedule: '9-59/17 * * * * *',
  buying: {
    ratio: 3.5, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 4
  },
  selling: {
    ratio: -0.1, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 3
  }
}, {
  clientId: 'T(300) B( 7.0 / 3) S(- 1.0 / 2)',
  timeslotSeconds: 300,
  tickSchedule: '3-58/9 * * * * *',
  buying: {
    ratio: 7.0, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 3
  },
  selling: {
    ratio: -0.50, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 2
  }
}, {
  clientId: 'T(200) B( 5.0 / 3) S(- 0.1 / 2)',
  timeslotSeconds: 200,
  tickSchedule: '5-59/9 * * * * *',
  buying: {
    ratio: 5.0, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 3
  },
  selling: {
    ratio: -0.1, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 2
  }
}, {
  clientId: 'T(200) B( 7.0 / 3) S(- 0.1 / 2)',
  timeslotSeconds: 200,
  tickSchedule: '7-59/9 * * * * *',
  buying: {
    ratio: 7.0, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 3
  },
  selling: {
    ratio: -0.1, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 2
  }
}, {
  clientId: 'T(200) B(10.0 / 3) S(- 0.1 / 2)',
  timeslotSeconds: 200,
  tickSchedule: '9-59/9 * * * * *',
  buying: {
    ratio: 10.0, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 3
  },
  selling: {
    ratio: -0.1, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 2
  }
}]

const commonConfig = {
  exchangeHost: 'http://localhost:8000/api/simex',
  buying: {
    volumeLimitPence: 100000,
    lowerLimitPence: 5000
  },
  selling: {
    lowerLimit_mmBtc: 80
  }
}

const checkForDuplicates = () => traderConfigs.reduce((existing, config) => {
  if (existing.includes(config.clientId)) {
    throw Error(`duplicate client ID [${config.clientId}]`)
  }
  existing.push(config.clientId)
  return existing
}, [])

const getTraderConfigs = () => {
  checkForDuplicates()
  const clientPrefix = process.argv[2] ? process.argv[2] : ''
  return traderConfigs.map(config => {
    config.clientId = clientPrefix + config.clientId
    return deepAssign(config, commonConfig)
  })
}

module.exports = { getTraderConfigs }
