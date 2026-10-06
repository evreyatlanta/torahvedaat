export async function loadNews() {
    const response = await fetch('/test/data/news.js');
    if (!response.ok) throw new Error('News data unavailable');
    const news = await response.json();
    if (!Array.isArray(news)) throw new Error('Invalid news data');
    return news;
}
