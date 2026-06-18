import { test as teardown } from '@playwright/test'
import { resetDb } from './db'

teardown('reset the test database', async () => {
  resetDb()
})
