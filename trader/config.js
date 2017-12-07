const deepAssign = require('assign-deep')

const traderConfigs = [{
  clientId: 'T( 340)_B(   2 / 3)_S(  -12 / 5)',
  timeslotSeconds: 340,
  buying: {
    ratio: 2,
    useTimeslots: 3
  },
  selling: {
    ratio: -12,
    useTimeslots: 5
  }
}, {
  clientId: 'T( 340)_B( 4.8 / 3)_S(-11.6 / 5)',
  timeslotSeconds: 340,
  buying: {
    ratio: 4.8,
    useTimeslots: 3
  },
  selling: {
    ratio: -11.6,
    useTimeslots: 5
  }
}, {
  clientId: 'T( 440)_B(  17 / 2)_S(-11.2 / 4)',
  timeslotSeconds: 440,
  buying: {
    ratio: 17,
    useTimeslots: 2
  },
  selling: {
    ratio: -11.2,
    useTimeslots: 4
  }
}, {
  clientId: 'T( 600)_B( 9.2 / 2)_S(   -4 / 6)',
  timeslotSeconds: 600,
  buying: {
    ratio: 9.2,
    useTimeslots: 2
  },
  selling: {
    ratio: -4,
    useTimeslots: 6
  }
}, {
  clientId: 'T( 300)_B( 6.4 / 3)_S(  -12 / 5)',
  timeslotSeconds: 300,
  buying: {
    ratio: 6.4,
    useTimeslots: 3
  },
  selling: {
    ratio: -12,
    useTimeslots: 5
  }
}, {
  clientId: 'T( 300)_B( 7.2 / 3)_S(-11.6 / 5)',
  timeslotSeconds: 300,
  buying: {
    ratio: 7.2,
    useTimeslots: 3
  },
  selling: {
    ratio: -11.6,
    useTimeslots: 5
  }
}, {
  clientId: 'T( 300)_B( 6.4 / 3)_S(-11.2 / 5)',
  timeslotSeconds: 300,
  buying: {
    ratio: 6.4,
    useTimeslots: 3
  },
  selling: {
    ratio: -11.2,
    useTimeslots: 5
  }
}, {
  clientId: 'T( 300)_B( 6.4 / 3)_S(-11.6 / 5)',
  timeslotSeconds: 300,
  buying: {
    ratio: 6.4,
    useTimeslots: 3
  },
  selling: {
    ratio: -11.6,
    useTimeslots: 5
  }
}, {
  clientId: 'T( 300)_B( 5.2 / 3)_S(-11.6 / 5)',
  timeslotSeconds: 300,
  buying: {
    ratio: 5.2,
    useTimeslots: 3
  },
  selling: {
    ratio: -11.6,
    useTimeslots: 5
  }
}, {
  clientId: 'T( 100)_B( 7.6 / 3)_S( -3.2 /10)',
  timeslotSeconds: 100,
  buying: {
    ratio: 7.6,
    useTimeslots: 3
  },
  selling: {
    ratio: -3.2,
    useTimeslots: 10
  }
}, {
  clientId: 'T( 100)_B( 7.6 / 3)_S(   -2 /10)',
  timeslotSeconds: 100,
  buying: {
    ratio: 7.6,
    useTimeslots: 3
  },
  selling: {
    ratio: -2,
    useTimeslots: 10
  }
}, {
  clientId: 'T( 600)_B(   7 / 2)_S(   -8 / 5)',
  timeslotSeconds: 600,
  buying: {
    ratio: 7,
    useTimeslots: 2
  },
  selling: {
    ratio: -8,
    useTimeslots: 5
  }
}, {
  clientId: 'T( 300)_B( 5.6 / 3)_S( -9.5 / 5)',
  timeslotSeconds: 300,
  buying: {
    ratio: 5.6,
    useTimeslots: 3
  },
  selling: {
    ratio: -9.5,
    useTimeslots: 5
  }
}, {
  clientId: 'T( 380)_B( 3.6 / 3)_S(-14.4 / 4)',
  timeslotSeconds: 380,
  buying: {
    ratio: 3.6,
    useTimeslots: 3
  },
  selling: {
    ratio: -14.4,
    useTimeslots: 4
  }
}, {
  clientId: 'T( 300)_B( 4.5 / 3)_S(  -12 / 5)',
  timeslotSeconds: 300,
  buying: {
    ratio: 4.5,
    useTimeslots: 3
  },
  selling: {
    ratio: -12,
    useTimeslots: 5
  }
}, {
  clientId: 'T( 600)_B(   4 / 2)_S(   -8 / 5)',
  timeslotSeconds: 600,
  buying: {
    ratio: 4,
    useTimeslots: 2
  },
  selling: {
    ratio: -8,
    useTimeslots: 5
  }
}, {
  clientId: 'T( 300)_B( 5.2 / 3)_S(-10.8 / 5)',
  timeslotSeconds: 300,
  buying: {
    ratio: 5.2,
    useTimeslots: 3
  },
  selling: {
    ratio: -10.8,
    useTimeslots: 5
  }
}, {
  clientId: 'T( 300)_B( 4.8 / 3)_S(-10.8 / 5)',
  timeslotSeconds: 300,
  buying: {
    ratio: 4.8,
    useTimeslots: 3
  },
  selling: {
    ratio: -10.8,
    useTimeslots: 5
  }
}, {
  clientId: 'T( 100)_B(   8 / 3)_S( -3.2 /10)',
  timeslotSeconds: 100,
  buying: {
    ratio: 8,
    useTimeslots: 3
  },
  selling: {
    ratio: -3.2,
    useTimeslots: 10
  }
}, {
  clientId: 'T( 100)_B(   8 / 3)_S(   -2 /10)',
  timeslotSeconds: 100,
  buying: {
    ratio: 8,
    useTimeslots: 3
  },
  selling: {
    ratio: -2,
    useTimeslots: 10
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
