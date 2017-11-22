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
  timeslotSeconds: { start: 50, end: 60, step: 50 },
  buying: {
    ratio: { start: 2, end: 4.5, step: 0.5 },
    useTimeslots: { start: 2, end: 5, step: 1 }
  },
  selling: {
    ratio: { start: -5, end: 0.5, step: 0.5 },
    useTimeslots: { start: 2, end: 5, step: 1 }
  },
  commonTraderConfig
}

// const tooLarge = {
//   timeslotSeconds: { start: 10, end: 820, step: 40 },
//   buying: {
//     ratio: { start: 2, end: 12, step: 0.5 },
//     useTimeslots: { start: 2, end: 10, step: 1 }
//   },
//   selling: {
//     ratio: { start: -5, end: 0, step: 0.5 },
//     useTimeslots: { start: 2, end: 8, step: 1 }
//   }
// }

const executorConfig = {
  mongodb: {
    url: 'mongodb://127.0.0.1:27017/tantalus'
  },
  batchSeconds: 3600 * 4,
  transactionsUpdateSeconds: 10,
  partitionWorkerCount: 7,
  rankingLimit: 100,
  generatorConfig
}

module.exports = executorConfig
