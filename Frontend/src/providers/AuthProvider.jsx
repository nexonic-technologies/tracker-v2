/**
 * Re-export shim — the canonical AuthProvider lives in @context/authProvider.
 * This file exists so that imports using `@providers/AuthProvider` resolve
 * to the SAME React context that is mounted in main.jsx.
 *
 * DO NOT add a second createContext() here — that causes useAuth() to return
 * undefined for any component outside this file's Provider tree.
 */
export { AuthProvider, useAuth, validateToken } from '@context/authProvider';
