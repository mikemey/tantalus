/* global describe before beforeEach it */

const TickerService = require('../../backend/tickers/tickersService')
const moment = require('moment')
require('chai').should()

const helpers = require('../helpers')

describe('TickerService', () => {
  const tickerService = TickerService()

  beforeEach(() => helpers.dropDatabase())

  const dbDate = dateStr => moment.utc(dateStr).toDate()
  const testData = [{
    created: dbDate('2017-08-02T10:26:00.256Z'),
    tickers: [
      { name: 'solidi', bid: 3906.82, ask: 'N/A' },
      { name: 'lakebtc', bid: 3856.08, ask: 3879.06 },
      { name: 'coindesk', ask: 3821.79 }]
  }, {
    created: dbDate('2017-08-03T00:26:00.256Z'),
    tickers: [
      { name: 'solidi', bid: 3915.58, ask: 'N/A' },
      { name: 'lakebtc', bid: 3857.84, ask: 3865.78 },
      { name: 'coindesk', ask: 3802.64 }]
  }, {
    created: dbDate('2017-08-04T08:26:00.256Z'),
    tickers: [
      { name: 'solidi', bid: 3904.59, ask: 0 },
      { name: 'lakebtc', bid: 'N/A', ask: 'N/A' },
      { name: 'coindesk', ask: 3814.19 }]
  }, {
    created: dbDate('2017-08-05T00:26:00.256Z'),
    tickers: [
      { name: 'solidi', bid: 3675.14, ask: 3454.12 },
      { name: 'lakebtc', bid: 3490, ask: 3567 },
      { name: 'coindesk', ask: 3584.93 }]
  }, {
    created: dbDate('2017-08-02T00:26:00.256Z'),
    tickers: [
      { name: 'solidi', bid: 999999, ask: 999999 },
      { name: 'lakebtc', bid: 999999, ask: 999999 },
      { name: 'coindesk', ask: 999999 }]
  }]

  const expectedResult = [{
    label: 'solidi bid',
    data: [
      { x: '2017-08-05T00:26:00.256Z', y: 3675.14 },
      { x: '2017-08-04T08:26:00.256Z', y: 3904.59 },
      { x: '2017-08-03T00:26:00.256Z', y: 3915.58 },
      { x: '2017-08-02T10:26:00.256Z', y: 3906.82 }
    ]
  }, {
    label: 'solidi ask',
    data: [
      { x: '2017-08-05T00:26:00.256Z', y: 3454.12 }
    ]
  }, {
    label: 'lakebtc bid',
    data: [
      { x: '2017-08-05T00:26:00.256Z', y: 3490 },
      { x: '2017-08-03T00:26:00.256Z', y: 3857.84 },
      { x: '2017-08-02T10:26:00.256Z', y: 3856.08 }
    ]
  }, {
    label: 'lakebtc ask',
    data: [
      { x: '2017-08-05T00:26:00.256Z', y: 3567 },
      { x: '2017-08-03T00:26:00.256Z', y: 3865.78 },
      { x: '2017-08-02T10:26:00.256Z', y: 3879.06 }
    ]
  }, {
    label: 'coindesk',
    data: [
      { x: '2017-08-05T00:26:00.256Z', y: 3584.93 },
      { x: '2017-08-04T08:26:00.256Z', y: 3814.19 },
      { x: '2017-08-03T00:26:00.256Z', y: 3802.64 },
      { x: '2017-08-02T10:26:00.256Z', y: 3821.79 }
    ]
  }]

  it('should return graph data', () => {
    const testSince = dbDate('2017-08-02T05:26:00Z')
    return helpers.insertTickers(testData)
      .then(() => tickerService.getGraphData(testSince))
      .then(result => result.should.deep.equal(expectedResult))
  })

  it('should return at most 100 data points', () => {
    const length = 2000
    const cutoffIx = 1300

    const datePast = daysPast => moment.utc().subtract(daysPast, 'd').toDate()
    const createTicker = created => {
      return {
        created,
        tickers: [
          { name: 'solidi', bid: 999999, ask: 999999 },
          { name: 'lakebtc', bid: 999999, ask: 999999 },
          { name: 'coindesk', ask: 999999 }]
      }
    }

    const testData = Array.from({ length }, (_, i) => createTicker(datePast(length - i)))

    const cutoffDate = moment.utc().subtract(cutoffIx, 'd').subtract(1, 'h').toDate()

    const oldestDate = moment.utc(testData[length - cutoffIx].created).toJSON()
    const newestDate = moment.utc(testData[length - 1].created).toJSON()

    return helpers.insertTickers(testData)
      .then(() => tickerService.getGraphData(cutoffDate))
      .then(result => {
        result.should.have.length(5)
        result.forEach(chart => {
          const chartData = chart.data
          chartData.should.have.length(tickerService.LIMIT_RESULTS)
          chartData[0].x.should.equal(newestDate)
          chartData[chartData.length - 1].x.should.equal(oldestDate)
        })
      })
  })
})
