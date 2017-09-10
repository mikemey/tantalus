
const responseError = (res, error, status = 400) => res.status(status).json({ error })

const apiSlug = '/api'

const apiLinks = slugs => {
  const links = Object.keys(slugs).reduce((result, key) => {
    result[key] = apiSlug + slugs[key]
    return result
  }, {})
  return { links }
}

module.exports = {
  responseError,
  apiSlug,
  apiLinks
}
