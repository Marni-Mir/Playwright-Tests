// Универсальная функция выбора option по видимому тексту для Puppeteer
// frame — объект Frame или Page Puppeteer
// selector — CSS-селектор select
// visibleText — текст, который виден в option

async function selectByVisibleText(frame, selector, visibleText) {
    await frame.evaluate((selector, visibleText) => {
        const select = document.querySelector(selector);
        if (!select) return;
        const options = Array.from(select.options);
        const option = options.find(opt => opt.text.trim() === visibleText.trim());
        if (option) {
            select.value = option.value;
            select.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }, selector, visibleText);
}

module.exports = { selectByVisibleText };