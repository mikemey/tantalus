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
    binance: { bid: 3544.99, ask: 3562.5 },
    gdax: { bid: 3675.69, ask: 3454.54 }
  }
  const testData = () => {
    return Array.from({ length: tickerCount }).map((_, ix) => {
      const created = datePast(ix)
      const tickers = [
        { name: 'gdax', bid: prices.gdax.bid + ix, ask: prices.gdax.ask + ix },
        { name: 'binance', bid: prices.binance.bid + ix, ask: prices.binance.ask + ix },
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
          'binance ask', 'binance bid', 'coindesk ask', 'gdax ask', 'gdax bid'
        ])

        expectGraphAverage(graphsSorted[0], prices.binance.ask)
        expectGraphAverage(graphsSorted[1], prices.binance.bid)
        expectGraphAverage(graphsSorted[2], prices.coindesk.ask)
        expectGraphAverage(graphsSorted[3], prices.gdax.ask)
        expectGraphAverage(graphsSorted[4], prices.gdax.bid)
      })
    // graphData looks sth like this, order of data objects isn't deterministic, just as example:
    // [{
    //   label: 'binance ask',
    //   data: [
    //     { x: 2018 - 12 - 10T19: 38: 17.950Z, y: 3583 },
    //     { x: 2018 - 12 - 09T01: 38: 17.950Z, y: 3625 },
    //     { x: 2018 - 12 - 07T07: 38: 17.950Z, y: 3667 },
    //     { x: 2018 - 12 - 05T13: 38: 17.950Z, y: 3700 }]
    // }, {
    //   label: 'binance bid',
    //   data: [
    //     { x: 2018 - 12 - 10T19: 38: 17.950Z, y: 3565 },
    //     { x: 2018 - 12 - 05T13: 38: 17.950Z, y: 3682 },
    //     { x: 2018 - 12 - 09T01: 38: 17.950Z, y: 3607 },
    //     { x: 2018 - 12 - 07T07: 38: 17.950Z, y: 3649 }]
    // }, {
    //   label: 'coindesk ask',
    //   data: [
    //     { x: 2018 - 12 - 07T07: 38: 17.950Z, y: 3688 },
    //     { x: 2018 - 12 - 09T01: 38: 17.950Z, y: 3646 },
    //     { x: 2018 - 12 - 10T19: 38: 17.950Z, y: 3604 },
    //     { x: 2018 - 12 - 05T13: 38: 17.950Z, y: 3721 }]
    // }, {
    //   label: 'gdax ask',
    //   data: [
    //     { x: 2018 - 12 - 05T13: 38: 17.950Z, y: 3592 },
    //     { x: 2018 - 12 - 10T19: 38: 17.950Z, y: 3475 },
    //     { x: 2018 - 12 - 09T01: 38: 17.950Z, y: 3517 },
    //     { x: 2018 - 12 - 07T07: 38: 17.950Z, y: 3559 }]
    // }, {
    //     label: 'gdax bid',
    //     data: [
    //       { x: 2018 - 12 - 07T07: 38: 17.950Z, y: 3780 },
    //       { x: 2018 - 12 - 05T13: 38: 17.950Z, y: 3813 },
    //       { x: 2018 - 12 - 10T19: 38: 17.950Z, y: 3696 },
    //       { x: 2018 - 12 - 09T01: 38: 17.950Z, y: 3738 }]
    //   }]
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
