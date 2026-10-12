import { describe, expect, it } from 'vitest'
import { userNamespace } from './store'
import { memoryKV, openKV } from './db'

describe('userNamespace', () => {
  it('reads user from the query or after the hash route', () => {
    expect(userNamespace('?user=abc_12-X')).toBe('abc_12-X')
    expect(userNamespace('', '#/field/hearing?user=u42')).toBe('u42')
    expect(userNamespace('?user=a', '#/x?user=b')).toBe('b')
  })
  it('ignores missing or unsafe ids', () => {
    expect(userNamespace('')).toBe('')
    expect(userNamespace('?user=')).toBe('')
    expect(userNamespace('?user=a.b')).toBe('')
    expect(userNamespace('?user=' + 'x'.repeat(65))).toBe('')
    expect(userNamespace('?user=%2B998901234567')).toBe('')
  })
})

describe('storage backends', () => {
  it('memory store round trip', async () => {
    const kv = memoryKV()
    expect(await kv.get('k')).toBeNull()
    await kv.set('k', 'v')
    expect(await kv.get('k')).toBe('v')
    await kv.remove('k')
    expect(await kv.get('k')).toBeNull()
  })
  it('falls back to memory when neither IndexedDB nor localStorage exist', async () => {
    expect((await openKV(50)).kind).toBe('memory')
  })
})
