import { sha256 as nobleSha256 } from '@noble/hashes/sha256.js'
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js'

export function sha256(input: string): string {
  return bytesToHex(nobleSha256(utf8ToBytes(input)))
}
