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

const generatorConfig = {
  timeslotSeconds: { start: 300, end: 400, step: 100 },
  buying: {
    ratio: { start: 2, end: 4, step: 1 },
    useTimeslots: { start: 2, end: 4, step: 1 }
  },
  selling: {
    ratio: { start: -3, end: -0.5, step: 0.75 },
    useTimeslots: { start: 2, end: 4, step: 1 }
  },
  commonTraderConfig
}

const executorConfig = {
  mongodb: {
    url: 'mongodb://127.0.0.1:27017/tantalus'
  },
  batchSeconds: 3600 * 4,
  transactionsUpdateSeconds: 10,
  partitionWorkerCount: 3,
  rankingLimit: 100
}

module.exports = {
  executorConfig,
  generatorConfig
}
