const commonTraderConfig = {
  buying: {
    volumeLimitPence: 100000,
    lowerLimitPence: 5000
  },
  selling: {
    lowerLimit_mmBtc: 80
  }
}

const initialGeneratorRanges = {
  timeslotSeconds: { start: 50, end: 650, step: 150 },
  buying: {
    ratio: { start: 2, end: 8, step: 3 },
    useTimeslots: { start: 2, end: 8, step: 2 }
  },
  selling: {
    ratio: { start: -8, end: -2, step: 3 },
    useTimeslots: { start: 2, end: 8, step: 2 }
  },
  commonTraderConfig
}

const genAlgoConfig = {
  iterations: 500,
  minSelectionCutoff: 0.2,
  crossoverRate: 0.25,
  mutationRate: 0.01,
  mutationBoundaries: {
    ts: { start: 20, step: 20, mutationStepsMax: 4 },
    bratio: { step: 0.4, mutationStepsMax: 2 },
    bslots: { start: 2, step: 1, mutationStepsMax: 2 },
    sratio: { step: 0.4, mutationStepsMax: 2 },
    sslots: { start: 2, step: 1, mutationStepsMax: 2 }
  },
  problemSpaceRanges: {
    timeslotSeconds: { start: 20, end: 1500, step: 20 },
    buying: {
      ratio: { start: 0.0, end: 20, step: 0.5 },
      useTimeslots: { start: 2, end: 20, step: 1 }
    },
    selling: {
      ratio: { start: -20.0, end: 0, step: 0.5 },
      useTimeslots: { start: 2, end: 20, step: 1 }
    },
    commonTraderConfig
  }
}

const executorConfig = {
  mongodb: {
    url: '',
    dbName: ''
  },
  batchSeconds: 3600 * 10,
  transactionsUpdateSeconds: 10,
  partitionWorkerCount: 6,
  rankingLimit: 3,
  startInvestment: commonTraderConfig.buying.volumeLimitPence
}

module.exports = {
  executorConfig,
  initialGeneratorRanges,
  genAlgoConfig
}
