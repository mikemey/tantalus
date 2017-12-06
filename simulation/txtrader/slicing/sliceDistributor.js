
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

const SliceDistributor = (traderConfigs, createTrader) => {
  const traderMap = createTraderMap(traderConfigs, createTrader)

  const distribute = (txsUpdate, slotRatios) => {
    traderMap.forEach((tssecs, trader) => {
      trader.nextTick(txsUpdate, slotRatios[tssecs])
    })
  }

  const getBalances = () => [...traderMap.keys()].map(trader => trader.getBalance())

  return {
    distribute,
    getBalances
  }
}

module.exports = SliceDistributor
