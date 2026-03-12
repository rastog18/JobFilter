from selenium import webdriver
from selenium.webdriver.common.by import By
import time
import csv
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")

def find_scroll_container(driver):
    """
    Walk up from the custom scrollbar to find the div that actually has
    scrollable overflow content. Tries parent, then grandparent, then
    falls back to any div with scrollHeight > clientHeight.
    """

    # Last resort: scan every div for scrollable overflow
    for d in driver.find_elements(By.TAG_NAME, "div"):
        try:
            sh = driver.execute_script("return arguments[0].scrollHeight;", d)
            ch = driver.execute_script("return arguments[0].clientHeight;", d)
            if sh > ch + 200:
                cls = d.get_attribute("class") or ""
                print(f"✅ Scroll container (scan): {cls[:60]}  scrollHeight={sh}")
                return d
        except Exception:
            continue

    print("❌ No scroll container found — will scroll document")
    return None


def scroll(driver, container, px: int = 1200):
    if container:
        driver.execute_script("arguments[0].scrollTop += arguments[1];", container, px)
    else:
        driver.execute_script("document.documentElement.scrollTop += arguments[0];", px)


def scrape_intern_list(n: int = 50):
    chrome_options = webdriver.ChromeOptions()
    chrome_options.add_experimental_option("detach", True)
    driver = webdriver.Chrome(options=chrome_options)

    driver.get("https://www.intern-list.com/?k=swe")
    time.sleep(10)

    driver.switch_to.frame(0)
    time.sleep(3)

    container = find_scroll_container(driver)

    collected  = {}  # keyed by title — deduplicates automatically
    no_progress = 0
    MAX_STALL   = 8

    while len(collected) < n and no_progress < MAX_STALL:
        before = len(collected)

        for row in driver.find_elements(By.CSS_SELECTOR, "tr[class*='tableRow']"):
            try:
                title    = row.find_element(By.CSS_SELECTOR, "span[class*='positionTitle']").text.strip()
                apply    = row.find_element(By.CSS_SELECTOR, "a[class*='ApplyLink']").get_attribute("href")
                cells    = row.find_elements(By.CSS_SELECTOR, "span[class*='cellText']")
                location = cells[0].text.strip() if len(cells) > 0 else ""
                company  = cells[1].text.strip() if len(cells) > 1 else ""
                salary   = cells[2].text.strip() if len(cells) > 2 else ""

                if title and title not in collected:
                    collected[title] = {
                        "title": title, "company": company,
                        "location": location, "salary": salary, "apply": apply,
                    }
            except Exception:
                continue

        if len(collected) >= n:
            break

        if len(collected) == before:
            no_progress += 1
            print(f"  [stall {no_progress}/{MAX_STALL}]")
        else:
            no_progress = 0
            print(f"  {len(collected)}/{n} collected...")

        scroll(driver, container, px=1200)
        time.sleep(1.5)

    results = list(collected.values())[:n]

    print(f"\nCollected {len(results)} jobs:\n")
    for i, job in enumerate(results, 1):
        print(f"{i:>3}. {job['title']} | {job['company']} | {job['location']} | {job['salary']}")
        print(f"       {job['apply']}\n")

    os.makedirs(DATA, exist_ok=True)
    with open(os.path.join(DATA, "jobs.csv"), "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["title", "company", "location", "salary", "posted", "apply"])
        writer.writeheader()
        writer.writerows(results)

    driver.quit()
    return results


# if __name__ == "__main__":
#     scrape_intern_list(n=20)