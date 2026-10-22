import test from 'node:test'
import assert from 'node:assert/strict'
process.env.VERCEL = '1'
process.env.BASIC_AUTH_USER = 'test-owner'
process.env.BASIC_AUTH_PASSWORD = 'test-password'
const { requireOperator, publicSourceUrl } = await import('../.security-test/_security.js')
const { setArenaTokenCookie, readArenaStateCookie } = await import('../.security-test/_arenaAuth.js')
const research = (await import('../.security-test/research.js')).default
const explore = (await import('../.security-test/arena/explore-blocks.js')).default
const publish = (await import('../.security-test/arena.js')).default
function response() {
  return { code: 200, headers: {}, status(code) { this.code = code; return this }, json(body) { this.body = body; return this },
    setHeader(k, v) { this.headers[k] = v }, getHeader(k) { return this.headers[k] } }
}
const auth = 'Basic ' + Buffer.from('test-owner:test-password').toString('base64')
test('all paid/publishing/explore routes deny anonymous requests before external fetch', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = () => { throw new Error('unexpected external request') }
  try {
    for (const handler of [research, explore, publish]) {
      const res = response()
      await handler({ method: 'POST', headers: {}, query: {} }, res)
      assert.equal(res.code, 401)
      assert.equal(res.headers['Cache-Control'], 'private, no-store')
    }
  } finally { globalThis.fetch = originalFetch }
})
test('missing operator config fails closed', () => {
  delete process.env.BASIC_AUTH_PASSWORD
  const res = response()
  assert.equal(requireOperator({ headers: {}, method: 'GET' }, res), false)
  assert.equal(res.code, 503)
  process.env.BASIC_AUTH_PASSWORD = 'test-password'
})
test('same-site sibling POST is denied; same origin is accepted', () => {
  const request = { method: 'POST', headers: { authorization: auth, host: 'reblock.tomsanee.com', origin: 'https://ipohero.tomsanee.com' } }
  const res = response()
  assert.equal(requireOperator(request, res), false)
  assert.equal(res.code, 403)
  request.headers.origin = 'https://reblock.tomsanee.com'
  assert.equal(requireOperator(request, response()), true)
})
test('source links exclude internal destinations and non-HTTPS schemes', () => {
  for (const url of ['http://127.0.0.1', 'https://127.0.0.1', 'https://169.254.169.254/latest', 'https://[::1]', 'file:///etc/passwd', 'https://a:b@example.com', 'https://metadata.internal', 'https://example.com:8443']) assert.equal(publicSourceUrl(url), false, url)
  assert.equal(publicSourceUrl('https://example.org/article'), true)
})
test('OAuth cookies are host-only, Secure, HttpOnly and bounded on Vercel', () => {
  const res = response()
  setArenaTokenCookie(res, 'test-only-token')
  assert.match(res.headers['Set-Cookie'], /^__Host-reblock_arena_token=/)
  for (const attribute of ['Secure', 'HttpOnly', 'Max-Age=28800']) assert.ok(res.headers['Set-Cookie'].includes(attribute))
  assert.equal(readArenaStateCookie({ headers: { cookie: '__Host-reblock_arena_state=%E0%A4%A' } }), undefined)
})
