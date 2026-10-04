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

  const puterModels = await page.evaluate(async () => {
    if (!window.puter?.ai?.listModels) return []
    return await window.puter.ai.listModels()
  })
  const modelIds = new Set(puterModels.map(model => model.id))
  const supported = [
    'openai/gpt-6.1-sol-pro', 'gpt-6.1-sol-pro',
    'openai/gpt-6.1-sol', 'gpt-6.1-sol',
    'openai/gpt-5.6-sol-pro', 'gpt-5.6-sol-pro',
    'openai/gpt-5.6-sol', 'gpt-5.6-sol',
    'openai/gpt-5.6-luna', 'gpt-5.6-luna'
  ]
  const available = supported.filter(id => modelIds.has(id))
  if (!available.length) {
    throw new Error(`No supported Puter reasoning model exposed by the live catalog. Received ${puterModels.length} models.`)
  }
  console.log('Puter model catalog verified:', available[0])

  if (!await page.getByText('FrontendAI', { exact: true }).first().isVisible()) {
    throw new Error('FrontendAI landing page did not render')
  }

  const orb = page.getByRole('button', { name: /FrontendAI idle/i })
  await orb.click()
  await page.getByRole('heading', { name: 'FrontendAI OS' }).waitFor()

  const autonomousButton = page.getByRole('button', { name: 'Autonomous', exact: true }).first()
  if (!await autonomousButton.isVisible()) {
    throw new Error('Agent mode controls did not render')
  }

  await autonomousButton.click()
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
