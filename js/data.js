export async function readArray(path) {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`Data unavailable: ${path}`);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error(`Invalid array: ${path}`);
    return data;
}
