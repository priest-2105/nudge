import initSqlJs from 'sql.js'
import type { Database } from 'sql.js'
import { app } from 'electron'
import { createRequire } from 'module'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import log from 'electron-log'
import { runMigrations } from './migrations'

const require = createRequire(import.meta.url)

let db: Database | null = null
let dbPath: string | null = null

export function getDb(): Database {
  if (!db) throw new Error('Database not initialized — call initDb() first')
  return db
}

export async function initDb(): Promise<void> {
  const SQL = await initSqlJs({
    locateFile: (file) => join(dirname(require.resolve('sql.js/dist/sql-wasm.js')), file)
  })

  dbPath = join(app.getPath('userData'), 'nudge.db')
  mkdirSync(dirname(dbPath), { recursive: true })

  const existing = existsSync(dbPath) ? readFileSync(dbPath) : undefined
  db = existing ? new SQL.Database(existing) : new SQL.Database()

  runMigrations(db)
  persist()

  log.info(`[db] initialized at ${dbPath}`)
}

/**
 * sql.js keeps the whole database in memory — it has no file I/O of its
 * own — so every mutating operation must call this afterwards to flush the
 * in-memory database back to disk.
 */
export function persist(): void {
  if (!db || !dbPath) return
  const data = db.export()
  writeFileSync(dbPath, Buffer.from(data))
}
