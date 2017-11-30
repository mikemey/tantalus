const commonTraderConfig = {
  syncedMode: true,
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
    ratio: { start: 2, end: 8, step: 2 },
    useTimeslots: { start: 2, end: 8, step: 2 }
  },
  selling: {
    ratio: { start: -8, end: -2, step: 2 },
    useTimeslots: { start: 2, end: 8, step: 2 }
  },
  commonTraderConfig
}

const genAlgoConfig = {
  iterations: 10,
  selectionCutoff: 0.7,
  crossoverRate: 0.4,
  mutationRate: 0.015,
  mutationBoundaries: {
    ts: { start: 10, step: 10, mutationStepsMax: 5 },
    bratio: { step: 0.2, mutationStepsMax: 3 },
    bslots: { start: 2, step: 1, mutationStepsMax: 2 },
    sratio: { step: 0.2, mutationStepsMax: 3 },
    sslots: { start: 2, step: 1, mutationStepsMax: 2 }
  },
  problemSpaceRanges: {
    timeslotSeconds: { start: 10, end: 2000, step: 10 },
    buying: {
      ratio: { start: 0.0, end: 20, step: 0.2 },
      useTimeslots: { start: 2, end: 200, step: 1 }
    },
    selling: {
      ratio: { start: -20.0, end: 0, step: 0.2 },
      useTimeslots: { start: 2, end: 200, step: 1 }
    },
    commonTraderConfig
  }
}

const executorConfig = {
  version: 'v2.5.0',
  mongodb: {
    url: 'mongodb://127.0.0.1:27017/tantalus'
  },
  batchSeconds: 3600 * 4,
  transactionsUpdateSeconds: 10,
  partitionWorkerCount: 7,
  rankingLimit: 3,
  startInvestment: commonTraderConfig.buying.volumeLimitPence
}

module.exports = {
  executorConfig,
  initialGeneratorRanges,
  genAlgoConfig
}
