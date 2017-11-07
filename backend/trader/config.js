const traderConfig = {
  clientId: 100,
  exchangeHost: 'http://localhost:14005',
  transactionListServiceUrl: 'http://localhost:14006',
  timeslotSeconds: 100,
  buying: {
    ratio: 0.1, // price change per second
    useTimeslots: 3,
    volumeLimitPence: 10000,
    lowerLimitPence: 2000
  },
  selling: {
    ratio: -0.05,
    useTimeslots: 2
  }
}

module.exports = { traderConfig }
