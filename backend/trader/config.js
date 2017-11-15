const deepAssign = require('assign-deep')

const traderConfigs = [{ // =========================== T 200
  clientId: 'T(200) B(15.0 / 4) S(- 0.6 / 3)',
  timeslotSeconds: 200,
  buying: {
    ratio: 15.0, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 4
  },
  selling: {
    ratio: -0.6, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 3
  }
}, {
  clientId: 'T( 50) B( 1.5 / 3) S(- 0.4 / 2)',
  timeslotSeconds: 50,
  buying: {
    ratio: 1.5, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 3
  },
  selling: {
    ratio: -0.4, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 2
  }
}, {
  clientId: 'T( 50) B( 2.0 / 3) S(- 0.4 / 2)',
  timeslotSeconds: 50,
  buying: {
    ratio: 2, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 3
  },
  selling: {
    ratio: -0.4, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 2
  }
}, {
  clientId: 'T( 50) B( 1.0 / 3) S(- 0.4 / 2)',
  timeslotSeconds: 50,
  buying: {
    ratio: 1, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 3
  },
  selling: {
    ratio: -0.4, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 2
  }
}, {
  clientId: 'T(200) B(12.5 / 4) S(- 0.1 / 3)',
  timeslotSeconds: 200,
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

const getTraderConfigs = () => {
  checkForDuplicates()
  const clientPrefix = process.argv[2] ? process.argv[2] : ''
  return traderConfigs.map(config => {
    config.clientId = clientPrefix + config.clientId
    return deepAssign(config, commonConfig)
  })
}

const checkForDuplicates = () => traderConfigs.reduce((existing, config) => {
  if (existing.includes(config.clientId)) {
    throw Error(`duplicate client ID [${config.clientId}]`)
  }
  existing.push(config.clientId)
  return existing
}, [])

const config = {
  tickSchedule: '2-12/5,12-59/4 * * * * *',
  traderConfigs: getTraderConfigs()
}

module.exports = config
