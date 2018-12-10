const moment = require('moment')

const helpers = require('../utils-test/helpers')
const ScheduleRepo = require('../schedule/scheduleRepo')
const { _1w } = require('../backend/tickers/graphPeriods')

describe('Schedule repository', () => {
  const scheduleRepo = ScheduleRepo()
  const tickerCount = 150
  const GRAPH_DATA_POINTS = 4

  after(helpers.closeMongodb)
  beforeEach(helpers.dropDatabase)

  const datePast = hoursPast => moment.utc().subtract(hoursPast, 'h').toDate()

  const prices = {
    coindesk: { ask: 3583.71 },
    coinfloor: { bid: 3544.99, ask: 3562.5 },
    gdax: { bid: 3675.69, ask: 3454.54 }
  }
  const testData = () => {
    return Array.from({ length: tickerCount }).map((_, ix) => {
      const created = datePast(ix)
      const tickers = [
        { name: 'gdax', bid: prices.gdax.bid + ix, ask: prices.gdax.ask + ix },
        { name: 'coinfloor', bid: prices.coinfloor.bid + ix, ask: prices.coinfloor.ask + ix },
        { name: 'coindesk', ask: prices.coindesk.ask + ix }
      ]
      return { created, tickers }
    })
  }

  it('should store sorted graph data', () => {
    return helpers.insertTickers(testData())
      .then(() => scheduleRepo.getGraphdata(_1w, GRAPH_DATA_POINTS))
      .then(graphs => {
        graphs.length.should.equal(5)
        const graphsSorted = graphs.sort((a, b) => {
          if (a.label < b.label) { return -1 }
          if (a.label > b.label) { return 1 }
          return 0
        })
        graphsSorted.map(graph => graph.label).should.deep.equal([
          'coindesk ask', 'coinfloor ask', 'coinfloor bid', 'gdax ask', 'gdax bid'
        ])

        expectGraphAverage(graphsSorted[0], prices.coindesk.ask)
        expectGraphAverage(graphsSorted[1], prices.coinfloor.ask)
        expectGraphAverage(graphsSorted[2], prices.coinfloor.bid)
        expectGraphAverage(graphsSorted[3], prices.gdax.ask)
        expectGraphAverage(graphsSorted[4], prices.gdax.bid)
      })
  })

  const expectGraphAverage = (graph, startPrice) => {
    // slice length 42h (168h for a week / 4)
    // increase of price 1 unit per hour -> first slice average = startPrice + (42 / 2)
    // last slice contains only 24 tickers -> last slice avg = startPrice + (3 * 42) + 12
    const averageAdd = Array.from([21, (42 + 21), (42 + 42 + 21), (42 + 42 + 42 + 12)])
    const avgPrices = averageAdd.map(avgAdd => Math.floor(startPrice) + avgAdd)
    graph.data.map(coord => coord.y).sort()
      .should.deep.equal(avgPrices)
  }
})
