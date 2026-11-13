import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"
import type { Account, Role } from "../types"
import type { RegistrationData } from "../lib/registration"
import { ROLE_PRIORITY } from "../lib/constants"
import { currentAccount, login, logout, register } from "../api/auth"
import { clearSession, getTokens, onSessionCleared } from "../api/session"
export type ActionResult = { ok: true } | { ok: false; error: string }
type AuthResult = { ok: true; account: Account } | { ok: false; error: string }
type Context = {
  accountId: string | null
  userName: string | null
  availableRoles: Role[]
  role: Role
  isAdmin: boolean
  hasRole: (role: Role) => boolean
  authLoading: boolean
  authError: string
  signIn: (email: string, password: string) => Promise<AuthResult>
  registerCustomer: (body: RegistrationData) => Promise<ActionResult>
  signOut: () => void
  refreshAccount: () => Promise<Account>
}
const AppContext = createContext<Context | null>(null)
export function AppProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<Account | null>(null),
    [authLoading, setAuthLoading] = useState(() => !!getTokens()),
    [authError, setAuthError] = useState("")
  const attempt = useRef(0)
  useEffect(
    () =>
      onSessionCleared((reason) => {
        attempt.current++
        setAccount(null)
        setAuthLoading(false)
        setAuthError(reason ?? "")
      }),
    [],
  )
  useEffect(() => {
    if (!getTokens()) return
    let active = true
    const original = attempt.current
    currentAccount()
      .then((next) => {
        if (active && original === attempt.current) setAccount(next)
      })
      .catch((error) => {
        if (active && original === attempt.current)
          clearSession(
            error instanceof Error ? error.message : "Please sign in again.",
          )
      })
      .finally(() => {
        if (active) setAuthLoading(false)
      })
    return () => {
      active = false
    }
  }, [])
  async function signIn(email: string, password: string): Promise<AuthResult> {
    const original = ++attempt.current
    setAuthError("")
    try {
      const next = await login(email, password)
      if (original !== attempt.current)
        return { ok: false, error: "Authentication was cancelled." }
      setAccount(next)
      return { ok: true, account: next }
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Unable to sign in.",
      }
    }
  }
  async function registerCustomer(
    body: RegistrationData,
  ): Promise<ActionResult> {
    try {
      await register(body)
      return { ok: true }
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Unable to register.",
      }
    }
  }
  async function refreshAccount() {
    const next = await currentAccount()
    setAccount(next)
    return next
  }
  const availableRoles = account?.roles ?? [],
    role = ROLE_PRIORITY.find((r) => availableRoles.includes(r)) ?? "customer"
  return (
    <AppContext.Provider
      value={{
        accountId: account?.id ?? null,
        userName: account?.name ?? null,
        availableRoles,
        role,
        isAdmin: availableRoles.includes("admin"),
        hasRole: (r) => availableRoles.includes(r),
        authLoading,
        authError,
        signIn,
        registerCustomer,
        refreshAccount,
        signOut: () => {
          setAuthError("")
          void logout().catch(() => {})
        },
      }}
    >
      {children}
    </AppContext.Provider>
  )
}
export function useApp() {
  const context = useContext(AppContext)
  if (!context) throw new Error("useApp must be used within AppProvider")
  return context
}
