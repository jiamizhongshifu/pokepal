"""Exercise the local development app using a fresh Chrome profile for each case."""
import argparse
from pathlib import Path
from urllib.parse import urlsplit

from playwright.sync_api import sync_playwright

CASES = Path(__file__).resolve().parent
EMPTY_PROFILE = {"save-commit", "trainer-commit", "diary-restore"}


def run_case(browser, base, case):
    with browser.new_context() as context:
        page = context.new_page()
        if case.suffix == ".html":
            page.goto(f"{base}/scripts/tests/{case.name}")
            page.wait_for_function("window.__result")
            result = page.evaluate("window.__result")
        else:
            # These cases test state after navigation. Visual transitions are covered by real clicks in the website preview.
            page.add_init_script("Object.defineProperty(document,'startViewTransition',{value:undefined})")
            page.goto(base, wait_until="domcontentloaded")
            page.wait_for_function("window.__game?.getState().loaded")
            if case.name.split(".")[0] not in EMPTY_PROFILE:
                page.mouse.click(2, 2)
                if not page.evaluate("window.__game.getState().createTrainer('avatar-red')"):
                    raise RuntimeError("未能创建测试用的小岛主人")
                page.evaluate("async()=>{const s=await import('/src/lib/speech.ts');s.unlockAudio()}")
            result = page.evaluate(case.read_text())
        if not result.get("passed"):
            raise RuntimeError(str(result))


def main():
    parser = argparse.ArgumentParser(description="在本地网页开发服务上运行浏览器验收")
    parser.add_argument("url", nargs="?", default="http://127.0.0.1:5180")
    url = parser.parse_args().url.rstrip("/")
    if urlsplit(url).hostname not in {"127.0.0.1", "localhost", "::1"}:
        parser.error("请指定本机开发服务地址")
    cases = sorted([*CASES.glob("*.browser.js"), *CASES.glob("*.browser.html")])
    with sync_playwright() as engine:
        with engine.chromium.launch(channel="chrome") as browser:
            for case in cases:
                print(case.name, flush=True)
                run_case(browser, url, case)


if __name__ == "__main__":
    main()
