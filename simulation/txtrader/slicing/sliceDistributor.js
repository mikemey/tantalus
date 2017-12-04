
const createTraderMap = (traderConfigs, createTrader) => {
  const traderMap = new Map()
  traderConfigs.forEach(cfg => {
    checkConfig(cfg)
    traderMap.set(createTrader(cfg), cfg.timeslotSeconds)
  })
  return traderMap
}

const checkConfig = cfg => {
  if (!cfg.timeslotSeconds) throw Error('timeslotSeconds not configured!')
}

const SliceDistributor = (workerConfigs, createTrader) => {
  const traderMap = createTraderMap(workerConfigs.traderConfigs, createTrader)

  const distribute = (txsUpdate, slotRatios) => {
    traderMap.forEach((tssecs, trader) => {
      trader.nextTick(txsUpdate, slotRatios[tssecs])
    })
  }

  return {
    distribute
  }
}

module.exports = SliceDistributor
