/* global describe before beforeEach it */
const nock = require('nock')
require('chai').should()

const TransactionsConnector = require('../../backend/trader/transactionsConnector')

describe('Transactions connector', () => {
  const testHost = 'http://localhost:14144'
  const testPath = '/test/transactions'

  const testConfig = {
    transactionListServiceUrl: testHost + testPath
  }
  const transactionsConnector = TransactionsConnector(console, testConfig)

  const mockTransactionsResponse = transactionsList => nock(testHost)
    .get(testPath)
    .reply(200, { transactionsList })

  afterEach(() => nock.cleanAll())

  it('should request transactions', () => {
    const testTxs = [
      { tid: 3, amount: '1.2254', date: 199, price: 5500 },
      { tid: 2, amount: '0.0871', date: 0, price: 5488 }
    ]
    mockTransactionsResponse(testTxs)

    return transactionsConnector.getTransactions()
      .then(transactions => transactions.should.deep.equal(testTxs))
  })
})
