import { chromium } from '@playwright/test';
import process from 'node:process';

// Optional integration smoke test against a real local model; never runs as
// part of the deterministic browser suite. Only the built-in demo is shared.
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:5173/#explainer');
  await page.getByRole('button', { name: 'Provider', exact: true }).click();
  await page.getByRole('button', { name: /Ollama Ask a local language model/ }).click();
  await page.getByRole('button', { name: 'Test connection' }).click();
  await page.locator('.success-message').waitFor({ timeout: 10_000 });
  process.stdout.write((await page.locator('.success-message').innerText()) + '\n');
  await page.getByRole('button', { name: 'Save provider' }).click();
  await page
    .getByRole('textbox', { name: 'Ask about this project' })
    .fill('What does Orbit do? Answer in one sentence and name one source file.');
  await page.getByRole('button', { name: 'Send question' }).click();
  await page.locator('.message.assistant').waitFor({ timeout: 100_000 });
  const result = await page.locator('.message.assistant').innerText();
  if (!(await page.locator('.message.assistant .message-label').innerText()).includes('Ollama')) {
    throw new Error(
      'The request fell back to local analysis: ' +
        (await page.locator('.chat-notice').innerText()),
    );
  }
  process.stdout.write('Live Ollama response:\n' + result.slice(0, 1400) + '\n');
} finally {
  await browser.close();
}
