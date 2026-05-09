const K = [
  0x428A2F98,
  0x71374491,
  0xB5C0FBCF,
  0xE9B5DBA5,
  0x3956C25B,
  0x59F111F1,
  0x923F82A4,
  0xAB1C5ED5,
  0xD807AA98,
  0x12835B01,
  0x243185BE,
  0x550C7DC3,
  0x72BE5D74,
  0x80DEB1FE,
  0x9BDC06A7,
  0xC19BF174,
  0xE49B69C1,
  0xEFBE4786,
  0x0FC19DC6,
  0x240CA1CC,
  0x2DE92C6F,
  0x4A7484AA,
  0x5CB0A9DC,
  0x76F988DA,
  0x983E5152,
  0xA831C66D,
  0xB00327C8,
  0xBF597FC7,
  0xC6E00BF3,
  0xD5A79147,
  0x06CA6351,
  0x14292967,
  0x27B70A85,
  0x2E1B2138,
  0x4D2C6DFC,
  0x53380D13,
  0x650A7354,
  0x766A0ABB,
  0x81C2C92E,
  0x92722C85,
  0xA2BFE8A1,
  0xA81A664B,
  0xC24B8B70,
  0xC76C51A3,
  0xD192E819,
  0xD6990624,
  0xF40E3585,
  0x106AA070,
  0x19A4C116,
  0x1E376C08,
  0x2748774C,
  0x34B0BCB5,
  0x391C0CB3,
  0x4ED8AA4A,
  0x5B9CCA4F,
  0x682E6FF3,
  0x748F82EE,
  0x78A5636F,
  0x84C87814,
  0x8CC70208,
  0x90BEFFFA,
  0xA4506CEB,
  0xBEF9A3F7,
  0xC67178F2,
]

function rightRotate(value: number, amount: number): number {
  return (value >>> amount) | (value << (32 - amount))
}

function utf8Bytes(input: string): number[] {
  const bytes: number[] = []
  for (let i = 0; i < input.length; i++) {
    let codePoint = input.charCodeAt(i)
    if (codePoint >= 0xD800 && codePoint <= 0xDBFF && i + 1 < input.length) {
      const next = input.charCodeAt(++i)
      codePoint = 0x10000 + ((codePoint - 0xD800) << 10) + (next - 0xDC00)
    }

    if (codePoint < 0x80) {
      bytes.push(codePoint)
    }
    else if (codePoint < 0x800) {
      bytes.push(0xC0 | (codePoint >>> 6), 0x80 | (codePoint & 0x3F))
    }
    else if (codePoint < 0x10000) {
      bytes.push(
        0xE0 | (codePoint >>> 12),
        0x80 | ((codePoint >>> 6) & 0x3F),
        0x80 | (codePoint & 0x3F),
      )
    }
    else {
      bytes.push(
        0xF0 | (codePoint >>> 18),
        0x80 | ((codePoint >>> 12) & 0x3F),
        0x80 | ((codePoint >>> 6) & 0x3F),
        0x80 | (codePoint & 0x3F),
      )
    }
  }
  return bytes
}

export function sha256(input: string): string {
  const bytes = utf8Bytes(input)
  const bitLength = bytes.length * 8

  bytes.push(0x80)
  while ((bytes.length % 64) !== 56)
    bytes.push(0)

  const high = Math.floor(bitLength / 0x100000000)
  const low = bitLength >>> 0
  for (let shift = 24; shift >= 0; shift -= 8)
    bytes.push((high >>> shift) & 0xFF)
  for (let shift = 24; shift >= 0; shift -= 8)
    bytes.push((low >>> shift) & 0xFF)

  let h0 = 0x6A09E667
  let h1 = 0xBB67AE85
  let h2 = 0x3C6EF372
  let h3 = 0xA54FF53A
  let h4 = 0x510E527F
  let h5 = 0x9B05688C
  let h6 = 0x1F83D9AB
  let h7 = 0x5BE0CD19

  const w = Array.from({ length: 64 })
  for (let chunk = 0; chunk < bytes.length; chunk += 64) {
    for (let i = 0; i < 16; i++) {
      const offset = chunk + i * 4
      w[i] = (
        (bytes[offset] << 24)
        | (bytes[offset + 1] << 16)
        | (bytes[offset + 2] << 8)
        | bytes[offset + 3]
      ) >>> 0
    }

    for (let i = 16; i < 64; i++) {
      const s0 = rightRotate(w[i - 15], 7) ^ rightRotate(w[i - 15], 18) ^ (w[i - 15] >>> 3)
      const s1 = rightRotate(w[i - 2], 17) ^ rightRotate(w[i - 2], 19) ^ (w[i - 2] >>> 10)
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0
    }

    let a = h0
    let b = h1
    let c = h2
    let d = h3
    let e = h4
    let f = h5
    let g = h6
    let h = h7

    for (let i = 0; i < 64; i++) {
      const s1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)
      const ch = (e & f) ^ (~e & g)
      const temp1 = (h + s1 + ch + K[i] + w[i]) >>> 0
      const s0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)
      const maj = (a & b) ^ (a & c) ^ (b & c)
      const temp2 = (s0 + maj) >>> 0

      h = g
      g = f
      f = e
      e = (d + temp1) >>> 0
      d = c
      c = b
      b = a
      a = (temp1 + temp2) >>> 0
    }

    h0 = (h0 + a) >>> 0
    h1 = (h1 + b) >>> 0
    h2 = (h2 + c) >>> 0
    h3 = (h3 + d) >>> 0
    h4 = (h4 + e) >>> 0
    h5 = (h5 + f) >>> 0
    h6 = (h6 + g) >>> 0
    h7 = (h7 + h) >>> 0
  }

  return [h0, h1, h2, h3, h4, h5, h6, h7]
    .map(value => value.toString(16).padStart(8, '0'))
    .join('')
}
