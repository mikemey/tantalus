
const RatioBuilder = (timeslotSeconds, timeslotCount) => {
  const calculateRatios = (transactions, slotsIndices, slotWindowEndDate) => {
    return buildRatios(buildAverages(transactions, slotsIndices, slotWindowEndDate))
  }

  const buildAverages = (transactions, slotsIndices, slotWindowEndDate) => {
    const averages = []
    let slotStartDate
    let slotEndDate = slotWindowEndDate
    for (let slotIx = 0; slotIx < timeslotCount; slotIx++) {
      slotStartDate = slotEndDate - timeslotSeconds
      averages.push(averageWindowTransactions(transactions, slotsIndices, slotStartDate, slotEndDate))
      slotEndDate = slotStartDate
    }
    return averages
  }

  const buildRatios = averages => {
    const ratios = []
    let avg
    for (let previousAvg = averages[0], ix = 1, len = averages.length;
      ix < len; ix++) {
      avg = previousAvg === 0 || averages[ix] === 0
        ? 0
        : (previousAvg - averages[ix]) / timeslotSeconds
      ratios.push(avg)
      previousAvg = averages[ix]
    }
    return ratios
  }

  return {
    timeslotSeconds,
    calculateRatios
  }
}

const averageWindowTransactions = (transactions, slotsIndices, slotStartDate, slotEndDate) => {
  let totalVolume = 0
  let totalAmount = 0
  for (let txIx = slotsIndices.get(slotStartDate), endIx = slotsIndices.get(slotEndDate);
    txIx < endIx; txIx++) {
    totalVolume += transactions[txIx].price * transactions[txIx].amount
    totalAmount += transactions[txIx].amount
  }
  return totalVolume === 0 ? 0 : totalVolume / totalAmount
}

const createRatioBuilders = traderConfigs => {
  const configTimeslotGroups = traderConfigs.reduce((cfgGroups, cfg) => {
    checkConfig(cfg)
    const tssecs = cfg.timeslotSeconds
    if (!cfgGroups.has(tssecs)) {
      cfgGroups.set(tssecs, [])
    }
    cfgGroups.get(tssecs).push(cfg)
    return cfgGroups
  }, new Map())

  const ratioBuilders = new Array(configTimeslotGroups.size)
  configTimeslotGroups.forEach((configs, tssecs) => {
    const maxUseTimeslots = findMaxUseTimeslots(configs)
    ratioBuilders.push(RatioBuilder(tssecs, maxUseTimeslots))
  })

  return ratioBuilders
}

const checkConfig = (cfg) => {
  if (!cfg.timeslotSeconds) throw Error('timeslotSeconds not configured!')
  checkMinUseTimeslots(cfg.buying.useTimeslots)
  checkMinUseTimeslots(cfg.selling.useTimeslots)
}

const checkMinUseTimeslots = ts => {
  if (ts === undefined || ts < 2) throw Error(`useTimeslots less than 2, was: ${ts}`)
}

const findMaxUseTimeslots = configs => {
  return configs.reduce((maxTs, currentCfg) => {
    return Math.max(maxTs, currentCfg.buying.useTimeslots, currentCfg.selling.useTimeslots)
  }, 0)
}

const SlotsAnalyzer = traderConfigs => {
  const ratioBuilders = createRatioBuilders(traderConfigs)

  const buildSlotsRatios = (transactions, slotsIndices, slotEndDate) => {
    const slotsRatios = {}
    ratioBuilders.forEach(builder => {
      slotsRatios[builder.timeslotSeconds] = builder.calculateRatios(transactions, slotsIndices, slotEndDate)
    })
    return slotsRatios
  }

  return {
    buildSlotsRatios
  }
}

module.exports = SlotsAnalyzer
