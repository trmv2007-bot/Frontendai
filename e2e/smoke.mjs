import { chromium } from 'playwright'

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

try {
  const errors = []
  page.on('pageerror', error => errors.push(error))
  page.on('console', message => {
    if (message.type() === 'error') errors.push(new Error(message.text()))
  })

  await page.goto(process.env.BASE_URL || 'http://127.0.0.1:4173', { waitUntil: 'networkidle' })

  if (!await page.getByText('FrontendAI', { exact: true }).first().isVisible()) {
    throw new Error('FrontendAI landing page did not render')
  }

  const orb = page.getByRole('button', { name: /FrontendAI idle/i })
  await orb.click()
  await page.getByRole('heading', { name: 'FrontendAI OS' }).waitFor()

  if (!await page.getByRole('button', { name: 'Autonomous' }).isVisible()) {
    throw new Error('Agent mode controls did not render')
  }

  await page.getByRole('button', { name: 'Autonomous' }).click()
  await page.getByRole('button', { name: 'Activity' }).click()
  await page.getByRole('button', { name: 'Vision' }).click()
  await page.getByRole('button', { name: 'Chat' }).click()

  const input = page.getByPlaceholder(/Ask, or/i)
  await input.fill('What can you do?')
  await input.press('Enter')

  await page.getByText('What can you do?', { exact: true }).waitFor({ state: 'visible', timeout: 10000 })
  await page.waitForTimeout(500)

  if (errors.length) {
    throw new Error('Browser console/page errors: ' + errors.map(error => error.message).join(' | '))
  }

  console.log('FrontendAI E2E smoke test passed')
} finally {
  await browser.close()
}
