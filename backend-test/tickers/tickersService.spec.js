/* global describe before beforeEach it */

const TickerService = require('../../backend/tickers/tickersService')
const moment = require('moment')
require('chai').should()

const helpers = require('../helpers')

describe('TickerService', () => {
  const tickerService = TickerService()

  beforeEach(helpers.dropDatabase)

  const dbDate = dateStr => moment.utc(dateStr).toDate()
  const testData = [{
    created: dbDate('2017-08-02T10:26:00.256Z'),
    tickers: [
      { name: 'lakebtc', bid: 3856.08, ask: 3879.06 },
      { name: 'coinfloor', bid: 2222 },
      { name: 'solidi', bid: 3906.82, ask: 'N/A' },
      { name: 'cex', bid: 1234.82, ask: 2345.67 },
      { name: 'coindesk', ask: 3821.79 }]
  }, {
    created: dbDate('2017-08-03T00:26:00.256Z'),
    tickers: [
      { name: 'lakebtc', bid: 3857.84, ask: 3865.78 },
      { name: 'coinfloor', bid: 2222 },
      { name: 'solidi', bid: 3915.58, ask: 'N/A' },
      { name: 'cex', bid: 1235.82, ask: 2346.67 },
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
      { name: 'lakebtc', bid: 999999, ask: 999999 },
      { name: 'solidi', bid: 999999, ask: 999999 },
      { name: 'coindesk', ask: 999999 }]
  }]

  const expectedResult = [{
    label: 'solidi bid',
    data: [
      { x: dbDate('2017-08-02T10:26:00.256Z'), y: 3906.82 },
      { x: dbDate('2017-08-03T00:26:00.256Z'), y: 3915.58 },
      { x: dbDate('2017-08-04T08:26:00.256Z'), y: 3904.59 },
      { x: dbDate('2017-08-05T00:26:00.256Z'), y: 3675.14 }
    ]
  }, {
    label: 'solidi ask',
    data: [
      { x: dbDate('2017-08-02T10:26:00.256Z'), y: null },
      { x: dbDate('2017-08-03T00:26:00.256Z'), y: null },
      { x: dbDate('2017-08-04T08:26:00.256Z'), y: null },
      { x: dbDate('2017-08-05T00:26:00.256Z'), y: 3454.12 }
    ]
  }, {
    label: 'coinfloor bid',
    data: [
      { x: dbDate('2017-08-02T10:26:00.256Z'), y: 2222 },
      { x: dbDate('2017-08-03T00:26:00.256Z'), y: 2222 }
    ]
  }, {
    label: 'coinfloor ask',
    data: [
      { x: dbDate('2017-08-02T10:26:00.256Z'), y: null },
      { x: dbDate('2017-08-03T00:26:00.256Z'), y: null }
    ]
  }, {
    label: 'lakebtc bid',
    data: [
      { x: dbDate('2017-08-02T10:26:00.256Z'), y: 3856.08 },
      { x: dbDate('2017-08-03T00:26:00.256Z'), y: 3857.84 },
      { x: dbDate('2017-08-04T08:26:00.256Z'), y: null },
      { x: dbDate('2017-08-05T00:26:00.256Z'), y: 3490 }
    ]
  }, {
    label: 'lakebtc ask',
    data: [
      { x: dbDate('2017-08-02T10:26:00.256Z'), y: 3879.06 },
      { x: dbDate('2017-08-03T00:26:00.256Z'), y: 3865.78 },
      { x: dbDate('2017-08-04T08:26:00.256Z'), y: null },
      { x: dbDate('2017-08-05T00:26:00.256Z'), y: 3567 }
    ]
  }, {
    label: 'cex bid',
    data: [
      { x: dbDate('2017-08-02T10:26:00.256Z'), y: 1234.82 },
      { x: dbDate('2017-08-03T00:26:00.256Z'), y: 1235.82 }
    ]
  }, {
    label: 'cex ask',
    data: [
      { x: dbDate('2017-08-02T10:26:00.256Z'), y: 2345.67 },
      { x: dbDate('2017-08-03T00:26:00.256Z'), y: 2346.67 }
    ]
  }, {
    label: 'coindesk',
    data: [
      { x: dbDate('2017-08-02T10:26:00.256Z'), y: 3821.79 },
      { x: dbDate('2017-08-03T00:26:00.256Z'), y: 3802.64 },
      { x: dbDate('2017-08-04T08:26:00.256Z'), y: 3814.19 },
      { x: dbDate('2017-08-05T00:26:00.256Z'), y: 3584.93 }
    ]
  }]

  it('should return sorted graph data', () => {
    const testSince = dbDate('2017-08-02T05:26:00Z')
    return helpers.insertTickers(testData)
      .then(() => tickerService.getGraphData(testSince))
      .then(result => result.should.deep.equal(expectedResult))
  })

  it(`should return the average of at most ${tickerService.LIMIT_RESULTS} data points`, () => {
    const length = 2000
    const cutoffIx = 1300

    const createTicker = (created, ix) => {
      return {
        created,
        tickers: [
          { name: 'solidi', bid: ix, ask: ix },
          { name: 'lakebtc', bid: ix, ask: ix },
          { name: 'coindesk', ask: ix }]
      }
    }

    const datePast = daysPast => moment.utc().subtract(daysPast, 'd').toDate()
    const testData = Array.from({ length }, (_, ix) => createTicker(datePast(length - 1 - ix), (ix + 1 - cutoffIx)))

    const cutoffDate = moment.utc().subtract((length - 1 - cutoffIx), 'd').subtract(1, 'h').toDate()

    const sliceLen = (length - cutoffIx) / tickerService.LIMIT_RESULTS
    const oldestSliceDistance = sliceLen * (tickerService.LIMIT_RESULTS - 1) + sliceLen / 2
    const oldestSliceStartIx = length - Math.floor(oldestSliceDistance) - 1
    const oldestDateExpected = moment.utc(testData[oldestSliceStartIx].created).toJSON()

    const newestDateExpected = moment.utc(testData[length - Math.floor(sliceLen / 2) - 1].created).toJSON()

    return helpers.insertTickers(testData)
      .then(() => tickerService.getGraphData(cutoffDate))
      .then(result => {
        result.should.have.length(5)
        result.forEach(chart => {
          const chartData = chart.data
          chartData.should.have.length(tickerService.LIMIT_RESULTS)

          chartData[0].x.toJSON().should.equal(oldestDateExpected)
          chartData[chartData.length - 1].x.toJSON().should.equal(newestDateExpected)
          chartData.forEach((datapoint, ix) => {
            const expectedAverage = (Math.floor(ix * sliceLen + 1) + Math.floor((ix + 1) * sliceLen)) / 2
            datapoint.y.should.equal(Math.round(expectedAverage))
          })
        })
      })
  })
})
