// Polyfills required by @solana/web3.js in a React Native / Hermes environment.
// Import this file once at the very top of app/_layout.tsx so the globals are
// available before any Solana code runs.

import { Buffer } from "buffer";

// Make Buffer available globally (web3.js reads it from global.Buffer).
if (typeof global.Buffer === "undefined") {
  global.Buffer = Buffer;
}

// Hermes ships without a crypto.getRandomValues implementation.
// expo-crypto provides a compatible polyfill.
import * as ExpoCrypto from "expo-crypto";

if (typeof global.crypto === "undefined") {
  (global as any).crypto = {};
}

if (typeof (global.crypto as any).getRandomValues === "undefined") {
  (global.crypto as any).getRandomValues = (array: Uint8Array) => {
    const bytes = ExpoCrypto.getRandomBytes(array.length);
    array.set(bytes);
    return array;
  };
}
