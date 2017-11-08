const traderConfig = {
  clientId: 100,
  exchangeHost: 'http://localhost:14005',
  timeslotSeconds: 100,
  buying: {
    ratio: 10, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 3,
    volumeLimitPence: 100000,
    lowerLimitPence: 2000
  },
  selling: {
    ratio: -5, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 2
  }
}

module.exports = { traderConfig }
