
const responseError = (res, error, status = 400) => res.status(status).json({ error })

module.exports = {
  responseError
}
