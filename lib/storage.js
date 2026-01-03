import { kvRead, kvWrite, kvAppend, kvUpdate } from './kv-storage.js';

// Re-export KV functions with legacy names for backwards compatibility
export async function readData(filename) {
    return kvRead(filename);
}

export async function writeData(filename, data) {
    return kvWrite(filename, data);
}

export async function appendData(filename, item) {
    return kvAppend(filename, item);
}

export async function upsertContact(emailStr) {
    if (!emailStr) return;

    // Extract name and email
    let name = '';
    let email = emailStr;
    const match = emailStr.match(/(.*)<(.*)>/);
    if (match) {
        name = match[1].trim();
        email = match[2].trim();
    }

    const contacts = await kvRead('contacts');
    const index = contacts.findIndex(c => c.email.toLowerCase() === email.toLowerCase());

    if (index !== -1) {
        contacts[index] = {
            ...contacts[index],
            name: name || contacts[index].name,
            lastInteraction: new Date().toISOString(),
            interactionCount: (contacts[index].interactionCount || 0) + 1
        };
    } else {
        contacts.unshift({
            id: crypto.randomUUID(),
            email,
            name: name || email.split('@')[0],
            createdAt: new Date().toISOString(),
            lastInteraction: new Date().toISOString(),
            interactionCount: 1
        });
    }

    await kvWrite('contacts', contacts);
}
