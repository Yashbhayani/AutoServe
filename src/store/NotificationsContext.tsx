import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { shop, type NotesResponse } from "../api/shop"
import { useApp } from "./AppContext"
const empty: NotesResponse = {
  items: [],
  total: 0,
  unreadCount: 0,
  page: 1,
  size: 5,
}
const Context = createContext({
  data: empty,
  loading: false,
  error: "",
  revision: 0,
  refresh: () => {},
  markRead: async (_id?: number) => {},
})
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { accountId } = useApp()
  const [owner, setOwner] = useState<string | null>(null)
  const [data, setData] = useState(empty),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false),
    [revision, setRevision] = useState(0)
  const serial = useRef(0),
    identity = useRef(accountId)
  identity.current = accountId
  const refresh = useCallback(() => setRevision((v) => v + 1), [])
  useEffect(() => {
    const request = ++serial.current
    if (!accountId) {
      setData(empty)
      setError("")
      setLoading(false)
      return
    }
    setLoading(true)
    shop
      .notes("all", 1, 5)
      .then((next) => {
        if (serial.current === request) {
          setOwner(accountId)
          setData(next)
          setError("")
        }
      })
      .catch((e) => {
        if (serial.current === request)
          setError(
            e instanceof Error ? e.message : "Unable to load notifications.",
          )
      })
      .finally(() => {
        if (serial.current === request) setLoading(false)
      })
    return () => {
      serial.current++
    }
  }, [accountId, revision])
  useEffect(() => {
    setData(empty)
  }, [accountId])
  useEffect(() => {
    if (!accountId) return
    const timer = setInterval(refresh, 30000)
    window.addEventListener("focus", refresh)
    return () => {
      clearInterval(timer)
      window.removeEventListener("focus", refresh)
    }
  }, [accountId, refresh])
  const markRead = useCallback(
    async (id?: number) => {
      const original = identity.current
      try {
        await shop.read(id)
        if (identity.current === original) {
          setError("")
          refresh()
        }
      } catch (e) {
        if (identity.current === original)
          setError(
            e instanceof Error ? e.message : "Unable to update notification.",
          )
        throw e
      }
    },
    [refresh],
  )
  return (
    <Context.Provider
      value={{ data: owner === accountId ? data : empty, error, loading, revision, refresh, markRead }}
    >
      {children}
    </Context.Provider>
  )
}
export const useNotifications = () => useContext(Context)
