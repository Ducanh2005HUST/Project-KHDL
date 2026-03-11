const INDEX_KEY = 'news_rag_chat_index_v1';
const CHAT_KEY_PREFIX = 'news_rag_chat_v1_';
const LEGACY_SINGLE_KEY = 'news_rag_chat_history_v1';

export function initStore({ welcomeMessages }) {
    const existing = _loadIndex();
    if (existing) return existing;

    // One-time migration from the old single-history key.
    const legacyMessages = _safeJsonParse(localStorage.getItem(LEGACY_SINGLE_KEY));
    const hasLegacy = Array.isArray(legacyMessages) && legacyMessages.length > 0;

    const firstChatId = _newId();
    const index = {
        version: 1,
        activeId: firstChatId,
        chats: [
            {
                id: firstChatId,
                title: hasLegacy ? 'Đoạn chat đã lưu' : 'Đoạn chat mới',
                createdAt: Date.now(),
                updatedAt: Date.now(),
            },
        ],
    };

    _saveIndex(index);
    _saveChat(firstChatId, hasLegacy ? legacyMessages : welcomeMessages);

    if (hasLegacy) {
        try {
            localStorage.removeItem(LEGACY_SINGLE_KEY);
        } catch {
            // ignore
        }
    }

    return index;
}

export function listChats(index) {
    return [...(index?.chats ?? [])].sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
}

export function loadChatMessages(chatId, { welcomeMessages }) {
    const data = _safeJsonParse(localStorage.getItem(_chatKey(chatId)));
    if (Array.isArray(data) && data.length > 0) return data;
    return welcomeMessages;
}

export function createChat(index, { welcomeMessages }) {
    const id = _newId();
    const now = Date.now();
    const chat = { id, title: 'Đoạn chat mới', createdAt: now, updatedAt: now };
    const nextIndex = {
        ...index,
        activeId: id,
        chats: [chat, ...(index?.chats ?? [])],
    };
    _saveIndex(nextIndex);
    _saveChat(id, welcomeMessages);
    return nextIndex;
}

export function setActiveChat(index, chatId) {
    if (!chatId) return index;
    if (index?.activeId === chatId) return index;
    const exists = (index?.chats ?? []).some((c) => c.id === chatId);
    if (!exists) return index;
    const nextIndex = { ...index, activeId: chatId };
    _saveIndex(nextIndex);
    return nextIndex;
}

export function renameChat(index, chatId, title) {
    const nextTitle = String(title ?? '').trim() || 'Đoạn chat';
    const nextIndex = {
        ...index,
        chats: (index?.chats ?? []).map((c) => (c.id === chatId ? { ...c, title: nextTitle } : c)),
    };
    _saveIndex(nextIndex);
    return nextIndex;
}

export function deleteChat(index, chatId, { welcomeMessages }) {
    const remaining = (index?.chats ?? []).filter((c) => c.id !== chatId);
    try {
        localStorage.removeItem(_chatKey(chatId));
    } catch {
        // ignore
    }

    let nextIndex;
    if (remaining.length === 0) {
        nextIndex = createChat({ version: 1, activeId: null, chats: [] }, { welcomeMessages });
    } else {
        const nextActive =
            index?.activeId === chatId ? remaining.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))[0].id : index?.activeId;
        nextIndex = { ...index, chats: remaining, activeId: nextActive };
        _saveIndex(nextIndex);
    }

    return nextIndex;
}

export function upsertChatMessages(index, chatId, messages) {
    _saveChat(chatId, messages);
    const now = Date.now();
    const derivedTitle = _deriveTitle(messages);

    const nextIndex = {
        ...index,
        chats: (index?.chats ?? []).map((c) => {
            if (c.id !== chatId) return c;
            const shouldDerive = !c.title || c.title === 'Đoạn chat mới' || c.title === 'Đoạn chat';
            return {
                ...c,
                updatedAt: now,
                title: shouldDerive && derivedTitle ? derivedTitle : c.title,
            };
        }),
    };
    _saveIndex(nextIndex);
    return nextIndex;
}

export function exportChat(index, chatId) {
    const chat = (index?.chats ?? []).find((c) => c.id === chatId);
    const messages = _safeJsonParse(localStorage.getItem(_chatKey(chatId))) ?? [];
    return {
        exported_at: new Date().toISOString(),
        chat: chat ?? { id: chatId },
        messages: Array.isArray(messages) ? messages : [],
    };
}

export function loadIndexOrNull() {
    return _loadIndex();
}

function _deriveTitle(messages) {
    if (!Array.isArray(messages)) return '';
    const firstUser = messages.find((m) => m && m.role === 'user' && typeof m.text === 'string' && m.text.trim());
    const text = firstUser?.text?.trim?.() ?? '';
    if (!text) return '';
    return text.length > 48 ? `${text.slice(0, 48)}...` : text;
}

function _newId() {
    const rand = Math.random().toString(16).slice(2, 10);
    return `c_${Date.now()}_${rand}`;
}

function _chatKey(id) {
    return `${CHAT_KEY_PREFIX}${id}`;
}

function _loadIndex() {
    const raw = _safeJsonParse(localStorage.getItem(INDEX_KEY));
    if (!raw || typeof raw !== 'object') return null;
    if (!Array.isArray(raw.chats)) return null;
    if (typeof raw.activeId !== 'string' && raw.activeId != null) return null;
    return raw;
}

function _saveIndex(index) {
    try {
        localStorage.setItem(INDEX_KEY, JSON.stringify(index));
    } catch {
        // ignore
    }
}

function _saveChat(chatId, messages) {
    try {
        localStorage.setItem(_chatKey(chatId), JSON.stringify(messages ?? []));
    } catch {
        // ignore
    }
}

function _safeJsonParse(raw) {
    try {
        if (!raw) return null;
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

