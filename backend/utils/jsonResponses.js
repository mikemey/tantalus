
const responseError = (res, error, status = 400) => res.status(status).json({ error })

const ClientErrorType = 'ClientError'
const clientError = message => ({ name: ClientErrorType, message })

const defaultErrorHandler = (res, logger) => err => {
  switch (err.name) {
    case ClientErrorType:
      return responseError(res, err.message)
    default:
      logger.log(err)
      return responseError(res, err.message, 500)
  }
}
module.exports = {
  responseError,
  clientError,
  defaultErrorHandler
}
