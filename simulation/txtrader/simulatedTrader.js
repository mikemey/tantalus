const mmBTC = 10000
const BUY = 1
const SELL = -1

const checkConfig = config => {
  checkLimis(config)
  checkRatio(config, 'buying')
  checkRatio(config, 'selling')
  checkUseTimeslots(config, 'buying')
  checkUseTimeslots(config, 'selling')
}

const checkLimis = config => {
  if (!config.buying || !config.buying.volumeLimitPence) throw Error('Buy volume limit parameter missing!')
  if (!config.buying || !config.buying.lowerLimitPence) throw Error('Buy volume lower limit parameter missing!')
  if (!config.selling || !config.selling.lowerLimit_mmBtc) throw Error('Sell volume lower limit parameter missing!')
}

const checkRatio = (config, type) => {
  if (config[type].ratio === undefined) {
    throw Error(`${type} ratio parameter missing!`)
  }
}

const checkUseTimeslots = (config, type) => {
  if (config[type].useTimeslots === undefined || config[type].useTimeslots < 2) {
    throw Error(`${type} timeslots parameter missing or less than 2!`)
  }
}

const SimulatedTrader = (traderConfig, startBalance) => {
  checkConfig(traderConfig)
  const volUpperLimit = traderConfig.buying.volumeLimitPence
  const volLowerLimit = traderConfig.buying.lowerLimitPence
  const amtLowerLimit = traderConfig.selling.lowerLimit_mmBtc

  const buyRatio = traderConfig.buying.ratio
  const buyRatioCount = traderConfig.buying.useTimeslots - 1
  const sellRatio = traderConfig.selling.ratio
  const sellRatioCount = traderConfig.selling.useTimeslots - 1

  const defaultBalance = {
    clientId: traderConfig.clientId,
    xbt_balance: 0,
    gbp_balance: traderConfig.buying.volumeLimitPence,
    latestPrice: 0
  }

  const data = {
    balance: startBalance !== undefined ? startBalance : defaultBalance,
    orderAmount: 0,
    orderDirection: 0
  }

  const nextTick = (txsUpdate, ratios) => {
    resolvePreviousOrders(txsUpdate)
    checkBalance()
    issueOrders(ratios)
  }

  const resolvePreviousOrders = txs => {
    if (data.orderAmount > 0) {
      for (let txId = 0, len = txs.length, tradeAmount, tradeGbp;
        txId < len && data.orderAmount > 0;
        txId++) {
        if ((data.balance.latestPrice - txs[txId].price) * data.orderDirection >= 0) {
          tradeAmount = Math.min(txs[txId].amount, data.orderAmount)
          tradeGbp = Math.floor(tradeAmount * data.balance.latestPrice / mmBTC)

          data.orderAmount -= tradeAmount
          data.balance.gbp_balance -= tradeGbp * data.orderDirection
          data.balance.xbt_balance += tradeAmount * data.orderDirection
        }
      }
    }

    if (txs.length) data.balance.latestPrice = txs[txs.length - 1].price
  }

  const checkBalance = () => {
    if (data.balance.gbp_balance < 0 || data.balance.xbt_balance < 0) {
      console.log(data.balance)
      throw Error('balance under 0!')
    }
  }

  const issueOrders = ratios => {
    data.orderAmount = 0
    data.orderDirection = 0
    let buy = true
    let sell = true
    for (let rix = 0, len = Math.max(ratios.length, buyRatio, sellRatio); rix < len; rix++) {
      if (rix < buyRatioCount && ratios[rix] < buyRatio) buy = false
      if (rix < sellRatioCount && ratios[rix] > sellRatio) sell = false
    }

    if (buy && data.balance.gbp_balance >= volLowerLimit) {
      const buyBalance = Math.min(data.balance.gbp_balance, volUpperLimit)
      data.orderAmount = Math.floor(buyBalance / data.balance.latestPrice * mmBTC)
      data.orderDirection = BUY
    }
    if (sell && data.balance.xbt_balance >= amtLowerLimit) {
      data.orderAmount = data.balance.xbt_balance
      data.orderDirection = SELL
    }
  }

  const getBalance = () => data.balance

  return {
    nextTick,
    getBalance
  }
}

module.exports = SimulatedTrader
