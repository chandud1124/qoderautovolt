
from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        page.goto("http://localhost:5174/login")
        page.fill('input[name="email"]', "admin@company.com")
        page.fill('input[name="password"]', "admin123456")
        page.click('button[type="submit"]')
        page.wait_for_url("http://localhost:5174/overview", timeout=60000)

        page.goto("http://localhost:5174/energy-monitoring")
        page.wait_for_selector(".recharts-surface", timeout=60000)

        page.screenshot(path="jules-scratch/verification/analytics_dashboard.png")
    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
