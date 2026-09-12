// noble instead of node:crypto on purpose: keeps browser and edge runtimes working (see CHANGELOG 1.5.0).
import { sha256 as nobleSha256 } from '@noble/hashes/sha256.js'
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js'

export function sha256(input: string): string {
  return bytesToHex(nobleSha256(utf8ToBytes(input)))
}
