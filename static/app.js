/* ====================== СПИСОК ЖАНРОВ ====================== */
const GENRES = [
    'Тёмное фэнтези','Эпическое фэнтези','Городское фэнтези','Юмористическое фэнтези',
    'Историческое фэнтези','Научная фантастика','Космическая фантастика','Киберпанк',
    'Стимпанк','Постапокалипсис','Антиутопия','Утопия','Хоррор','Мистика',
    'Триллер','Детектив','Криминал','Боевик','Приключения','Исторический роман',
    'Историческая проза','Любовный роман','Романтическое фэнтези','Современная проза',
    'Классическая проза','Драма','Трагедия','Комедия','Сатира','Поэзия',
    'Публицистика','Биография','Мемуары','Нон-фикшн','Философия','Психология',
    'Саморазвитие','Религия и духовность','Детская литература','Подростковая литература',
    'Young Adult','Новелла','Рассказ','Сборник','Фанфик','ЛитРПГ','РеалРПГ',
    'Попаданцы','Бояръ-аниме','Славянское фэнтези','Другое'
];

/* ====================== ХРАНИЛИЩЕ ====================== */
const KEYS = {
    users: 'sb_users_v5', session: 'sb_session_v5', books: 'sb_books_v5',
    chats: 'sb_chats_v5', messages: 'sb_messages_v5', lastReads: 'sb_lastreads_v5',
    lastSeen: 'sb_lastseen_v5', friends: 'sb_friends_v5', communities: 'sb_communities_v5',
    theme: 'sb_theme_v5', readingProgress: 'sb_reading_progress_v1'
};

function load(key, fallback) {
    try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; } catch(e){ return fallback; }
}
function save(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch(e){} }

/* ====================== API-КЛИЕНТ ====================== */
const API_BASE = '';

async function api(path, options = {}) {
    const opts = {
        method: options.method || 'GET',
        credentials: 'include',
        headers: { 'Accept': 'application/json', ...(options.headers || {}) },
    };
    if (options.body !== undefined) {
        opts.headers['Content-Type'] = 'application/json';
        opts.body = JSON.stringify(options.body);
    }
    const res = await fetch(API_BASE + path, opts);
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch(e) { data = text; }
    if (!res.ok) {
        const msg = (data && (data.detail || data.error)) || `Ошибка ${res.status}`;
        const err = new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
        err.status = res.status;
        err.data = data;
        throw err;
    }
    return data;
}

/* ====================== API: КНИГИ ====================== */
async function apiGetBooks(params = {}) {
    const qs = new URLSearchParams(params).toString();
    const path = '/api/books' + (qs ? '?' + qs : '');
    const books = await api(path);
    return books.map(normalizeBook);
}
async function apiGetBook(id) {
    const b = await api('/api/books/' + id);
    return normalizeBookWithChapters(b);
}
async function apiGetMyBooks() {
    const books = await api('/api/books/me');
    return books.map(normalizeBook);
}
async function apiCreateBook(data) {
    const b = await api('/api/books', { method: 'POST', body: data });
    return normalizeBookWithChapters(b);
}
async function apiUpdateBook(id, data) {
    const b = await api('/api/books/' + id, { method: 'PUT', body: data });
    return normalizeBookWithChapters(b);
}
async function apiDeleteBook(id) {
    await api('/api/books/' + id, { method: 'DELETE' });
}
async function apiUploadImage(file) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/upload', {
        method: 'POST', credentials: 'include', body: formData,
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Ошибка загрузки');
    }
    return await res.json();
}

/* ====================== API: ПОЛЬЗОВАТЕЛИ ====================== */
async function apiGetUsers(q = '') {
    const qs = q ? '?q=' + encodeURIComponent(q) : '';
    const users = await api('/api/users' + qs);
    return users.map(normalizeUser);
}
async function apiGetUser(userId) {
    const u = await api('/api/users/' + userId);
    return normalizeUser(u);
}

/* ====================== API: ДРУЗЬЯ ====================== */
async function apiGetFriends() {
    try { const users = await api('/api/friends'); return users.map(normalizeUser); }
    catch(e) { return []; }
}
async function apiGetIncomingRequests() {
    try { const users = await api('/api/friends/incoming'); return users.map(normalizeUser); }
    catch(e) { return []; }
}
async function apiGetOutgoingRequests() {
    try { const users = await api('/api/friends/outgoing'); return users.map(normalizeUser); }
    catch(e) { return []; }
}
async function apiSendFriendRequest(userId) {
    return await api('/api/friends/request', { method: 'POST', body: { toUserId: userId } });
}
async function apiAcceptFriend(userId) {
    return await api('/api/friends/' + userId + '/accept', { method: 'POST' });
}
async function apiDeclineFriend(userId) {
    return await api('/api/friends/' + userId + '/decline', { method: 'POST' });
}
async function apiRemoveFriend(userId) {
    return await api('/api/friends/' + userId, { method: 'DELETE' });
}

/* ====================== API: СООБЩЕСТВА ====================== */
async function apiGetCommunities() {
    const list = await api('/api/communities');
    return list.map(normalizeCommunity);
}
async function apiGetCommunity(id) {
    const c = await api('/api/communities/' + id);
    return normalizeCommunity(c);
}
async function apiCreateCommunity(data) {
    const c = await api('/api/communities', { method: 'POST', body: data });
    return normalizeCommunity(c);
}
async function apiGetCommunityMembers(id) {
    const users = await api('/api/communities/' + id + '/members');
    return users.map(normalizeUser);
}
async function apiIsJoinedCommunity(id) {
    try { const r = await api('/api/communities/' + id + '/joined'); return !!r.joined; }
    catch(e) { return false; }
}
async function apiJoinCommunity(id) {
    return await api('/api/communities/' + id + '/join', { method: 'POST' });
}
async function apiLeaveCommunity(id) {
    return await api('/api/communities/' + id + '/leave', { method: 'POST' });
}
async function apiGetMyCommunities() {
    try { const list = await api('/api/communities/me/list'); return list.map(normalizeCommunity); }
    catch(e) { return []; }
}

/* ====================== НОРМАЛИЗАЦИЯ ====================== */
function normalizeCommunity(c) {
    if (!c) return null;
    return {
        id: c.id, title: c.title, username: c.username,
        desc: c.description || c.desc || '',
        avatar: c.avatarUrl || c.avatar || null,
        owner: c.ownerId || c.owner || null,
        members: c.members || [],
        membersCount: c.membersCount || (c.members ? c.members.length : 0),
        createdAt: c.createdAt ? new Date(c.createdAt).getTime() : Date.now(),
    };
}
function normalizeBook(b) {
    if (!b) return null;
    return {
        id: b.id, title: b.title,
        author: b.authorUsername || b.author || '?',
        annotation: b.annotation, genre: b.genre,
        cover: b.coverUrl || null,
        coverSymbol: b.coverSymbol || '📖',
        status: b.status || 'published',
        chaptersCount: b.chaptersCount || 0,
        createdAt: b.createdAt ? new Date(b.createdAt).getTime() : Date.now(),
        updatedAt: b.updatedAt ? new Date(b.updatedAt).getTime() : Date.now(),
    };
}
function normalizeBookWithChapters(b) {
    const base = normalizeBook(b);
    if (!base) return null;
    base.chapters = (b.chapters || []).map(ch => ({
        id: ch.id, title: ch.title, content: ch.content, order: ch.order,
    }));
    return base;
}
function normalizeUser(u) {
    if (!u) return null;
    return {
        username: u.username,
        id: u.id,
        handle: u.username,
        displayName: u.displayName || u.username,
        email: u.email || null,
        bio: u.bio || '',
        avatar: u.avatarUrl || null,
        lastSeen: u.lastSeen || null,
        google: false,
    };
}

/* ====================== API: ЧАТЫ ====================== */
async function apiOpenDM(userId) {
    const r = await api('/api/messages/dm', { method: 'POST', body: { userId } });
    return r.chatId;
}
async function apiGetMyChats() {
    try { const list = await api('/api/messages/chats'); return list; }
    catch(e) { console.error('Ошибка загрузки чатов:', e); return []; }
}
async function apiGetChatMessages(chatId) {
    try { const list = await api('/api/messages/chats/' + chatId + '/messages'); return list; }
    catch(e) { console.error('Ошибка загрузки сообщений:', e); return []; }
}

/* ====================== WEBSOCKET ====================== */
let _ws = null;
let _wsChatId = null;
let _wsHandlers = [];

function connectChatWS(chatId, onMessage) {
    if (_ws && _wsChatId === chatId) {
        if (onMessage) _wsHandlers.push(onMessage);
        return;
    }
    disconnectChatWS();
    _wsChatId = chatId;
    _wsHandlers = onMessage ? [onMessage] : [];
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = proto + '//' + location.host + '/ws/chat/' + chatId;
    try { _ws = new WebSocket(url); }
    catch(e) { console.error('WebSocket не создан:', e); return; }
    _ws.onopen = () => console.log('[WS] Подключено к чату', chatId);
    _ws.onmessage = (event) => {
        try { const msg = JSON.parse(event.data); _wsHandlers.forEach(h => h(msg)); }
        catch(e) { console.error('WS parse error:', e); }
    };
    _ws.onerror = (err) => console.error('[WS] Ошибка:', err);
    _ws.onclose = () => console.log('[WS] Отключено от чата', chatId);
}
function sendChatWS(text) {
    if (!_ws || _ws.readyState !== WebSocket.OPEN) { console.warn('[WS] Не подключено'); return false; }
    _ws.send(JSON.stringify({ text }));
    return true;
}
function disconnectChatWS() {
    if (_ws) {
        try { _ws.close(); } catch(e) {}
        _ws = null; _wsChatId = null; _wsHandlers = [];
    }
}

/* ====================== КЭШИ ====================== */
let _friendsCache = { friends: [], incoming: [], outgoing: [] };
let _usersCache = {};
let _communitiesCache = [];
let _booksCache = [];
let _currentUser = null;
let _currentUserLoaded = false;

async function loadFriendsData() {
    if (!getCurrentUser()) {
        _friendsCache = { friends: [], incoming: [], outgoing: [] };
        return;
    }
    try {
        const [friends, incoming, outgoing] = await Promise.all([
            apiGetFriends(), apiGetIncomingRequests(), apiGetOutgoingRequests()
        ]);
        _friendsCache = { friends, incoming, outgoing };
    } catch(e) {
        console.error('Ошибка загрузки друзей:', e);
        _friendsCache = { friends: [], incoming: [], outgoing: [] };
    }
    return _friendsCache;
}
async function loadUsersCache() {
    if (!getCurrentUser()) { _usersCache = {}; return; }
    try {
        const users = await apiGetUsers();
        _usersCache = {};
        users.forEach(u => {
            _usersCache[u.username] = {
                handle: u.username,
                email: u.email,
                displayName: u.displayName,
                bio: u.bio,
                avatar: u.avatar,
                id: u.id,
                lastSeen: u.lastSeen || null,
            };
        });
    } catch(e) { console.error('Ошибка загрузки пользователей:', e); }
    return _usersCache;
}
async function loadCommunitiesCache() {
    try { _communitiesCache = await apiGetCommunities(); }
    catch(e) { console.error('Ошибка загрузки сообществ:', e); _communitiesCache = []; }
    return _communitiesCache;
}
async function loadMyCommunitiesCache() {
    if (!getCurrentUser()) return [];
    try { return await apiGetMyCommunities(); }
    catch(e) { return []; }
}
async function loadBooks() {
    try { _booksCache = await apiGetBooks(); }
    catch(e) { console.error('Ошибка загрузки книг:', e); _booksCache = []; }
    return _booksCache;
}
async function loadCurrentUser() {
    try {
        const u = await api('/api/auth/me');
        _currentUser = u ? normalizeUser(u) : null;
    } catch(e) { _currentUser = null; }
    _currentUserLoaded = true;
    return _currentUser;
}
function getCurrentUser() { return _currentUser; }
function getAllBooks() { return _booksCache.slice(); }
function getBooksCount() { return _booksCache.length; }
function getUsers() { return _usersCache; }
function saveUsers() {}
function setSession() {}
function clearSession() {}
function findUserByUsername(handle) {
    if (!handle) return null;
    const u = _currentUser;
    if (u && (u.username === handle || u.handle === handle.replace(/^@/, ''))) return u;
    return null;
}
function findUserByEmail() { return null; }
function isHandleTaken() { return false; }
function displayName(user) {
    if (typeof user === 'string') {
        if (_currentUser && _currentUser.username === user) return _currentUser.displayName;
        return user;
    }
    if (!user) return '?';
    return user.displayName || user.username;
}
async function hash(s) { return s; }

/* ====================== API: ПРОГРЕСС ЧТЕНИЯ ====================== */
async function apiSaveProgress(bookId, chapterIndex) {
    try {
        await api('/api/books/' + bookId + '/progress', { method: 'POST', body: { chapterIndex } });
    } catch(e) { console.error('Ошибка сохранения прогресса:', e); }
}
async function apiGetMyReading() {
    try {
        const list = await api('/api/books/me/reading');
        return list.map(item => ({
            book: normalizeBook(item.book),
            chapterIndex: item.chapterIndex,
            updatedAt: item.updatedAt ? new Date(item.updatedAt).getTime() : Date.now(),
        }));
    } catch(e) { console.error('Ошибка загрузки прогресса:', e); return []; }
}

/* ====================== АВТОРИЗАЦИЯ ====================== */
async function apiRegister({ username, email, password, displayName }) {
    const u = await api('/api/auth/register', {
        method: 'POST', body: { username, email, password, displayName },
    });
    _currentUser = normalizeUser(u);
    _currentUserLoaded = true;
    return _currentUser;
}
async function apiLogin({ login, password }) {
    const u = await api('/api/auth/login', {
        method: 'POST', body: { login, password },
    });
    _currentUser = normalizeUser(u);
    _currentUserLoaded = true;
    return _currentUser;
}
async function apiLogout() {
    try { await api('/api/auth/logout', { method: 'POST' }); } catch(e) {}
    _currentUser = null;
}

/* ====================== ПРОГРЕСС ЧТЕНИЯ (localStorage) ====================== */
function getAllReadingProgress() { return load(KEYS.readingProgress, {}); }
function saveAllReadingProgress(p) { save(KEYS.readingProgress, p); }
function getReadingProgress(username, bookId) {
    if (!username || !bookId) return null;
    const all = getAllReadingProgress();
    return (all[username] && all[username][bookId]) || null;
}
function setReadingProgress(username, bookId, chapterIndex, chapterId) {
    if (!username || !bookId) return;
    const all = getAllReadingProgress();
    if (!all[username]) all[username] = {};
    all[username][bookId] = { chapterIndex, chapterId: chapterId || null, updatedAt: Date.now() };
    saveAllReadingProgress(all);
}
function removeReadingProgress(username, bookId) {
    if (!username || !bookId) return;
    const all = getAllReadingProgress();
    if (all[username] && all[username][bookId]) {
        delete all[username][bookId];
        if (Object.keys(all[username]).length === 0) delete all[username];
        saveAllReadingProgress(all);
    }
}
function getUserReadingList(username) {
    if (!username) return [];
    const all = getAllReadingProgress();
    const userProgress = all[username] || {};
    const books = getAllBooks();
    return Object.entries(userProgress)
        .map(([bookId, prog]) => {
            const book = books.find(b => b.id === bookId);
            if (!book) return null;
            const total = book.chaptersCount || 1;
            const idx = Math.min(prog.chapterIndex || 0, total - 1);
            const percent = Math.round(((idx + 1) / total) * 100);
            return { book, chapterIndex: idx, chapterTitle: '—', totalChapters: total, percent, updatedAt: prog.updatedAt || 0 };
        })
        .filter(Boolean)
        .sort((a, b) => b.updatedAt - a.updatedAt);
}

/* ====================== ОНЛАЙН-СТАТУС (через сервер) ====================== */
function isUserOnline(username) {
    // Сначала смотрим в кэш пользователей (там lastSeen с сервера)
    const cached = _usersCache[username];
    if (cached && cached.lastSeen) {
        const t = new Date(cached.lastSeen).getTime();
        return Date.now() - t < 2 * 60 * 1000;
    }
    // Если это текущий пользователь — считаем его онлайн
    const me = getCurrentUser();
    if (me && me.username === username) return true;
    return false;
}
function getLastSeenTime(username) {
    const cached = _usersCache[username];
    if (cached && cached.lastSeen) return new Date(cached.lastSeen).getTime();
    return 0;
}
function getOnlineCount() {
    const users = getUsers();
    return Object.keys(users).filter(u => isUserOnline(u)).length;
}

/* ====================== ЧАТЫ (localStorage) ====================== */
function getAllChats() { return load(KEYS.chats, {}); }
function saveAllChats(c) { save(KEYS.chats, c); }
function getAllMessages() { return load(KEYS.messages, {}); }
function saveAllMessages(m) { save(KEYS.messages, m); }
function makeChatId(a, b) { return 'dm_' + [a, b].sort().join('__'); }

async function getOrCreateDM(userA, userB) {
    const target = _usersCache[userB];
    if (!target || !target.id) {
        const chats = getAllChats();
        const id = makeChatId(userA, userB);
        if (!chats[id]) {
            chats[id] = { id, type: 'dm', members: [userA, userB].sort(), createdAt: Date.now(), lastMessageAt: Date.now() };
            saveAllChats(chats);
        }
        return chats[id];
    }
    const chatId = await apiOpenDM(target.id);
    const chats = getAllChats();
    if (!chats[chatId]) {
        chats[chatId] = {
            id: chatId, type: 'dm',
            members: [userA, userB].sort(),
            createdAt: Date.now(), lastMessageAt: Date.now()
        };
        saveAllChats(chats);
    }
    return chats[chatId];
}
function getOrCreateCommunityChat(communityId) {
    const chats = getAllChats();
    const id = 'comm_' + communityId;
    if (!chats[id]) {
        chats[id] = { id, type: 'community', communityId, members: [], createdAt: Date.now(), lastMessageAt: Date.now() };
        saveAllChats(chats);
    }
    return chats[id];
}
function getOrCreateGeneralChat() {
    const chats = getAllChats();
    if (!chats.general) {
        chats.general = { id: 'general', type: 'general', members: [], createdAt: Date.now(), lastMessageAt: Date.now() };
        saveAllChats(chats);
    }
    return chats.general;
}
function sendMessage(chatId, from, text) {
    text = text.trim();
    if (!text) return;
    const messages = getAllMessages();
    if (!messages[chatId]) messages[chatId] = [];
    messages[chatId].push({
        id: 'm' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        from, text, at: Date.now()
    });
    saveAllMessages(messages);
    const chats = getAllChats();
    if (chats[chatId]) { chats[chatId].lastMessageAt = Date.now(); saveAllChats(chats); }
}
function getMessages(chatId) { return getAllMessages()[chatId] || []; }
function getLastReads() { return load(KEYS.lastReads, {}); }
function saveLastReads(lr) { save(KEYS.lastReads, lr); }
function getLastRead(username, chatId) {
    const lr = getLastReads();
    return (lr[username] && lr[username][chatId]) || 0;
}
function markChatRead(username, chatId) {
    const lr = getLastReads();
    if (!lr[username]) lr[username] = {};
    lr[username][chatId] = Date.now();
    saveLastReads(lr);
}
function getUnreadCount(username, chatId) {
    const msgs = getMessages(chatId);
    const lastRead = getLastRead(username, chatId);
    return msgs.filter(m => m.at > lastRead && m.from !== username).length;
}
function getTotalUnread(username) {
    const chats = getAllChats();
    let total = 0;
    Object.keys(chats).forEach(id => {
        const c = chats[id];
        if (c.type === 'general' || c.type === 'community' || (c.members && c.members.includes(username))) {
            if (c.type === 'community') {
                const comm = getCommunity(c.communityId);
                if (!comm || !comm.members.includes(username)) return;
            }
            total += getUnreadCount(username, id);
        }
    });
    return total;
}

/* ====================== ДРУЗЬЯ (кэш) ====================== */
function getAllFriends() { return _friendsCache; }
function getFriendsData(username) { return _friendsCache; }
function ensureFriendsData() { return _friendsCache; }
function getFriendsCount(username) {
    if (!getCurrentUser()) return 0;
    return _friendsCache.friends.length;
}
function getIncomingCount(username) {
    if (!getCurrentUser()) return 0;
    return _friendsCache.incoming.length;
}
function getFriendStatus(me, other) {
    if (!me || me === other) return 'none';
    const f = _friendsCache.friends.map(u => u.username);
    const inc = _friendsCache.incoming.map(u => u.username);
    const out = _friendsCache.outgoing.map(u => u.username);
    if (f.includes(other)) return 'friends';
    if (out.includes(other)) return 'outgoing';
    if (inc.includes(other)) return 'incoming';
    return 'none';
}

/* ====================== СООБЩЕСТВА (кэш) ====================== */
function getAllCommunities() {
    const obj = {};
    _communitiesCache.forEach(c => { obj[c.id] = c; });
    return obj;
}
function getCommunity(id) {
    return _communitiesCache.find(c => c.id === id) || null;
}
function getCommunitiesCount() { return _communitiesCache.length; }
async function getMyCommunities(username) {
    if (!getCurrentUser()) return [];
    return await loadMyCommunitiesCache();
}
function findCommunityByUsername(handle) {
    if (!handle) return null;
    const lower = handle.replace(/^@/, '').toLowerCase();
    return _communitiesCache.find(c => c.username && c.username.toLowerCase() === lower) || null;
}
function isCommunityUsernameTaken(handle, exceptId) {
    if (!handle) return false;
    const lower = handle.toLowerCase();
    return _communitiesCache.some(c => {
        if (exceptId && c.id === exceptId) return false;
        return c.username && c.username.toLowerCase() === lower;
    });
}
function saveAllCommunities() {}
function createCommunity() {}
function joinCommunity() {}
function leaveCommunity() {}

/* ====================== ТЕМА ====================== */
function applyTheme(theme) {
    document.body.className = theme || 'theme-steel';
    try { localStorage.setItem(KEYS.theme, theme); } catch(e){}
}
applyTheme(localStorage.getItem(KEYS.theme) || 'theme-steel');

/* ====================== УВЕДОМЛЕНИЯ И УТИЛИТЫ ====================== */
function showToast(text, type = '') {
    const t = document.createElement('div');
    t.className = 'toast ' + type;
    t.textContent = text;
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, 2600);
}
function updateBookCounter() {
    const counter = document.getElementById('topCounter');
    if (!counter) return;
    const n = getBooksCount();
    counter.textContent = n + ' ' + plural(n, 'книга', 'книги', 'книг');
}
function plural(n, one, few, many) {
    const mod10 = n % 10, mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
    return many;
}
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
function isValidUsername(username) {
    return /^[A-Za-z0-9_]{2,20}$/.test(username);
}
function isValidCommunityUsername(username) {
    return /^[A-Za-z0-9_]{3,24}$/.test(username);
}

/* ====================== АВАТАР ====================== */
function avatarHTML(user, size = 'md') {
    if (typeof user === 'string') {
        const users = getUsers();
        user = users[user] ? { username: user, ...users[user] } : { username: user };
    }
    if (!user) return `<div class="avatar size-${size}">?</div>`;
    const initial = (user.displayName || user.username || '?').charAt(0).toUpperCase();
    const online = isUserOnline(user.username);
    const googleClass = user.google ? ' google' : '';
    if (user.avatar) {
        return `<div class="avatar size-${size}${googleClass}"><img src="${escapeAttr(user.avatar)}" alt=""><span class="status-dot ${online ? 'online' : ''}"></span></div>`;
    }
    return `<div class="avatar size-${size}${googleClass}">${initial}<span class="status-dot ${online ? 'online' : ''}"></span></div>`;
}

/* ====================== РОУТЕР ====================== */
let currentPage = 'home';
let currentBookId = null;
let currentChatId = null;
let currentProfileUser = null;
let currentCommunityId = null;
let currentCommunityTab = 'chat';
let chatTab = 'dialogs';
let friendsTab = 'friends';
let navData = {};

async function navigate(page, data = {}) {
    currentPage = page;
    navData = data;
    document.querySelectorAll('.nav-link').forEach(l => {
        l.classList.toggle('active', l.dataset.page === page);
    });
    await render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ====================== ШАПКА ====================== */
function renderTopbarUser() {
    const box = document.getElementById('topbarActions');
    if (!box) return;
    const user = getCurrentUser();
    const onlineCount = getOnlineCount();
    const friendRequests = user ? getIncomingCount(user.username) : 0;
    box.innerHTML = `
        <button class="icon-btn" id="usersBtn" title="Пользователи">
            ☺
            ${onlineCount > 0 ? `<span class="online-dot">${onlineCount}</span>` : ''}
        </button>
        <button class="icon-btn" id="friendsBtn" title="Друзья">
            ♥
            ${friendRequests > 0 ? `<span class="friend-dot">${friendRequests}</span>` : ''}
        </button>
        <button class="icon-btn" id="themeBtn" title="Сменить тему">◐</button>
        ${user ? `
            <button class="user-chip" id="userChip">
                ${avatarHTML(user, 'sm')}
                <span>${escapeHtml(displayName(user))}</span>
            </button>
            <button class="icon-btn" id="logoutBtn" title="Выйти">
                <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 27v2a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h15a1 1 0 0 1 1 1v2"/>
                    <path d="M24 10l6 6-6 6"/>
                    <path d="M14 16h16"/>
                </svg>
            </button>
        ` : `
            <button class="btn btn-ghost" id="loginBtn">Войти</button>
            <button class="btn btn-primary" id="registerBtn">Регистрация</button>
        `}
    `;
    document.getElementById('usersBtn').addEventListener('click', () => togglePanel('usersPanel', 'usersBackdrop'));
    document.getElementById('friendsBtn').addEventListener('click', () => {
        if (!user) { openAuth('login'); return; }
        togglePanel('friendsPanel', 'friendsBackdrop');
    });
    document.getElementById('themeBtn').addEventListener('click', () => {
        const order = ['theme-steel', 'light', 'night'];
        const idx = order.indexOf(localStorage.getItem(KEYS.theme) || 'theme-steel');
        applyTheme(order[(idx + 1) % order.length]);
        renderTopbarUser();
    });
    if (user) {
        document.getElementById('logoutBtn').addEventListener('click', () => openLogoutConfirm());
        document.getElementById('userChip').addEventListener('click', () => {
            currentProfileUser = user.username;
            navigate('profile');
        });
    } else {
        document.getElementById('loginBtn').addEventListener('click', () => openAuth('login'));
        document.getElementById('registerBtn').addEventListener('click', () => openAuth('register'));
    }
    updateBookCounter();
}
function updateUnreadBadge() {
    const user = getCurrentUser();
    const badge = document.getElementById('unreadBadge');
    if (!badge) return;
    if (!user) { badge.style.display = 'none'; return; }
    const total = getTotalUnread(user.username);
    if (total > 0) { badge.textContent = total; badge.style.display = 'inline-block'; }
    else { badge.style.display = 'none'; }
}

/* ====================== ПАНЕЛИ ====================== */
function togglePanel(panelId, backdropId) {
    const panel = document.getElementById(panelId);
    const backdrop = document.getElementById(backdropId);
    const isOpen = panel.classList.contains('open');
    if (isOpen) {
        panel.classList.remove('open');
        backdrop.classList.remove('active');
    } else {
        document.querySelectorAll('.side-panel').forEach(p => p.classList.remove('open'));
        document.querySelectorAll('.side-backdrop').forEach(b => b.classList.remove('active'));
        if (panelId === 'usersPanel') renderUsersPanel();
        if (panelId === 'friendsPanel') renderFriendsPanel();
        panel.classList.add('open');
        backdrop.classList.add('active');
    }
}
function closeAllPanels() {
    document.querySelectorAll('.side-panel').forEach(p => p.classList.remove('open'));
    document.querySelectorAll('.side-backdrop').forEach(b => b.classList.remove('active'));
}

/* ====================== ПАНЕЛЬ ПОЛЬЗОВАТЕЛЕЙ ====================== */
function renderUsersPanel() {
    const body = document.getElementById('usersPanelBody');
    const counter = document.getElementById('usersCounter');
    if (!body) return;
    const users = getUsers();
    const me = getCurrentUser();
    const searchEl = document.getElementById('usersSearch');
    const search = (searchEl && searchEl.value || '').trim().toLowerCase();
    let names = Object.keys(users);
    if (search) {
        names = names.filter(u => {
            const data = users[u];
            return u.toLowerCase().includes(search) ||
                (data.handle && data.handle.toLowerCase().includes(search.replace('@',''))) ||
                (data.displayName && data.displayName.toLowerCase().includes(search));
        });
    }
    names.sort((a, b) => {
        const aOnline = isUserOnline(a);
        const bOnline = isUserOnline(b);
        if (aOnline && !bOnline) return -1;
        if (!aOnline && bOnline) return 1;
        return (users[a].displayName || a).localeCompare(users[b].displayName || b);
    });
    const onlineCount = Object.keys(users).filter(u => isUserOnline(u)).length;
    if (counter) counter.innerHTML = `Всего: ${Object.keys(users).length} · <span class="online-num">${onlineCount} в сети</span>`;
    if (!names.length) {
        body.innerHTML = `<div class="side-panel-empty">${search ? 'Никого не найдено' : 'Пока нет пользователей'}</div>`;
        return;
    }
    body.innerHTML = names.map(u => userCardHTML(u, users[u], me)).join('');
    attachUserCardHandlers(body);
}

function userCardHTML(username, data, me) {
    const isMe = me && username === me.username;
    const online = isUserOnline(username);
    const friendStatus = getFriendStatus(me ? me.username : null, username);
    const booksCount = getAllBooks().filter(b => b.author === username).length;
    const handle = data.handle ? '@' + data.handle : '@' + username.toLowerCase();
    let actionBtn = '';
    if (isMe) {
        actionBtn = `<button class="user-card-write" data-action="edit-me">Редактировать</button>`;
    } else if (friendStatus === 'friends') {
        actionBtn = `<button class="user-card-write danger" data-action="unfriend" data-user="${escapeAttr(username)}">В друзьях</button>`;
    } else if (friendStatus === 'outgoing') {
        actionBtn = `<button class="user-card-write" data-action="cancel-outgoing" data-user="${escapeAttr(username)}">Заявка отправлена</button>`;
    } else if (friendStatus === 'incoming') {
        actionBtn = `<button class="user-card-write success" data-action="accept-friend" data-user="${escapeAttr(username)}">Принять</button>`;
    } else if (me) {
        actionBtn = `<button class="user-card-write" data-action="add-friend" data-user="${escapeAttr(username)}">+ В друзья</button>`;
    }
    return `
        <div class="user-card" data-user="${escapeAttr(username)}">
            ${avatarHTML({ username, ...data }, 'md')}
            <div class="user-card-info">
                <div class="user-card-name">
                    ${escapeHtml(displayName({ username, ...data }))}
                    ${isMe ? '<span class="me-tag" style="font-size:.65rem;color:var(--accent)">— это вы</span>' : ''}
                </div>
                <div class="user-card-username">${escapeHtml(handle)}</div>
                <div class="user-card-status ${online ? 'online' : ''}">${online ? 'в сети' : 'не в сети'} · ${booksCount} ${plural(booksCount, 'книга', 'книги', 'книг')}</div>
            </div>
            <div class="user-card-actions">
                ${!isMe && me ? `<button class="user-card-write" data-action="write" data-user="${escapeAttr(username)}">Написать</button>` : ''}
                ${actionBtn}
            </div>
        </div>
    `;
}

function friendCardHTML(user, mode) {
    let username, data;
    if (typeof user === 'string') {
        username = user;
        data = _usersCache[user] || { username, displayName: user, handle: user };
    } else {
        username = user.username;
        data = user;
    }
    const online = isUserOnline(username);
    const handle = '@' + (data.handle || username);
    const display = data.displayName || username;
    let actions = '';
    if (mode === 'friend') {
        actions = `
            <button class="user-card-write" data-faction="write" data-user="${escapeAttr(username)}">Написать</button>
            <button class="user-card-write danger" data-faction="unfriend" data-user="${escapeAttr(username)}">Удалить</button>
        `;
    } else if (mode === 'incoming') {
        actions = `
            <button class="user-card-write success" data-faction="accept" data-user="${escapeAttr(username)}">Принять</button>
            <button class="user-card-write danger" data-faction="decline" data-user="${escapeAttr(username)}">Отклонить</button>
        `;
    } else {
        actions = `
            <button class="user-card-write" data-faction="cancel" data-user="${escapeAttr(username)}">Отозвать</button>
        `;
    }
    return `
        <div class="user-card" data-user="${escapeAttr(username)}">
            ${avatarHTML({ username, ...data }, 'md')}
            <div class="user-card-info">
                <div class="user-card-name">${escapeHtml(display)}</div>
                <div class="user-card-username">${escapeHtml(handle)}</div>
                <div class="user-card-status ${online ? 'online' : ''}">${online ? 'в сети' : 'не в сети'}</div>
            </div>
            <div class="user-card-actions">${actions}</div>
        </div>
    `;
}

function attachUserCardHandlers(container) {
    container.querySelectorAll('.user-card').forEach(card => {
        const username = card.dataset.user;
        card.addEventListener('click', (e) => {
            if (e.target.closest('button')) return;
            currentProfileUser = username;
            closeAllPanels();
            navigate('profile');
        });
    });
    container.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const action = btn.dataset.action;
            const target = btn.dataset.user;
            const me = getCurrentUser();
            await handleUserAction(action, target, me);
        });
    });
}

async function handleUserAction(action, target, me) {
    if (!me) { openAuth('login'); return; }
    if (action === 'write') {
        const chat = await getOrCreateDM(me.username, target);
        currentChatId = chat.id;
        chatTab = 'dialogs';
        closeAllPanels();
        navigate('messages', { chatId: chat.id });
        return;
    }
    const targetUser = _usersCache[target];
    const targetId = targetUser ? targetUser.id : target;
    try {
        if (action === 'add-friend') {
            const r = await apiSendFriendRequest(targetId);
            showToast(r.msg || 'Заявка отправлена', 'success');
        } else if (action === 'accept-friend') {
            await apiAcceptFriend(targetId);
            showToast('Заявка принята', 'success');
        } else if (action === 'unfriend') {
            if (!confirm('Удалить из друзей?')) return;
            await apiRemoveFriend(targetId);
            showToast('Удалён из друзей', 'success');
        } else if (action === 'cancel-outgoing') {
            await apiRemoveFriend(targetId);
            showToast('Заявка отозвана', 'success');
        } else if (action === 'edit-me') {
            closeAllPanels();
            openEditProfile();
            return;
        }
        await loadFriendsData();
        await loadUsersCache();
        renderUsersPanel();
        renderFriendsPanel();
        renderTopbarUser();
    } catch(e) {
        showToast('Ошибка: ' + e.message, 'error');
    }
}

/* ====================== ПАНЕЛЬ ДРУЗЕЙ ====================== */
function renderFriendsPanel() {
    const body = document.getElementById('friendsPanelBody');
    const counter = document.getElementById('friendsCounter');
    const me = getCurrentUser();
    if (!body || !me) return;
    const data = _friendsCache;
    const friendsCount = data.friends.length;
    const incomingCount = data.incoming.length;
    const onlineFriends = data.friends.filter(u => isUserOnline(u.username)).length;
    if (counter) counter.innerHTML = `Друзей: ${friendsCount} · <span class="online-num">${onlineFriends} в сети</span>`;
    const fBadge = document.getElementById('friendsCountBadge');
    const iBadge = document.getElementById('incomingCountBadge');
    if (fBadge) {
        if (friendsCount > 0) { fBadge.textContent = friendsCount; fBadge.style.display = 'inline-block'; }
        else fBadge.style.display = 'none';
    }
    if (iBadge) {
        if (incomingCount > 0) { iBadge.textContent = incomingCount; iBadge.style.display = 'inline-block'; }
        else iBadge.style.display = 'none';
    }
    const searchEl = document.getElementById('friendsSearch');
    const search = (searchEl && searchEl.value || '').trim().toLowerCase();
    let list = [];
    if (friendsTab === 'friends') list = data.friends;
    else if (friendsTab === 'incoming') list = data.incoming;
    else if (friendsTab === 'outgoing') list = data.outgoing;
    if (search) {
        list = list.filter(u => {
            const uname = typeof u === 'string' ? u : (u.username || '');
            const dname = typeof u === 'string' ? u : (u.displayName || u.username || '');
            return uname.toLowerCase().includes(search) || dname.toLowerCase().includes(search);
        });
    }
    list.sort((a, b) => {
        const aO = isUserOnline(typeof a === 'string' ? a : a.username);
        const bO = isUserOnline(typeof b === 'string' ? b : b.username);
        if (aO && !bO) return -1;
        if (!aO && bO) return 1;
        const aN = typeof a === 'string' ? a : (a.displayName || a.username || '');
        const bN = typeof b === 'string' ? b : (b.displayName || b.username || '');
        return aN.localeCompare(bN);
    });
    if (!list.length) {
        let emptyMsg = 'Пусто';
        if (friendsTab === 'friends') emptyMsg = search ? 'Не найдено' : 'У вас пока нет друзей. Найдите их в панели пользователей!';
        if (friendsTab === 'incoming') emptyMsg = 'Нет входящих заявок';
        if (friendsTab === 'outgoing') emptyMsg = 'Нет отправленных заявок';
        body.innerHTML = `<div class="side-panel-empty">${emptyMsg}</div>`;
        return;
    }
    let html = '';
    if (friendsTab === 'friends') {
        const online = list.filter(u => isUserOnline(typeof u === 'string' ? u : u.username));
        const offline = list.filter(u => !isUserOnline(typeof u === 'string' ? u : u.username));
        if (online.length) {
            html += `<div class="users-section-label online-label">● В сети — ${online.length}</div>`;
            html += online.map(u => friendCardHTML(u, 'friend')).join('');
        }
        if (offline.length) {
            html += `<div class="users-section-label">Не в сети — ${offline.length}</div>`;
            html += offline.map(u => friendCardHTML(u, 'friend')).join('');
        }
    } else if (friendsTab === 'incoming') {
        html = list.map(u => friendCardHTML(u, 'incoming')).join('');
    } else {
        html = list.map(u => friendCardHTML(u, 'outgoing')).join('');
    }
    body.innerHTML = html;
    body.querySelectorAll('.user-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('button')) return;
            currentProfileUser = card.dataset.user;
            closeAllPanels();
            navigate('profile');
        });
    });
    body.querySelectorAll('[data-faction]').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const action = btn.dataset.faction;
            const target = btn.dataset.user;
            const me2 = getCurrentUser();
            if (!me2) return;
            if (action === 'write') {
                const chat = await getOrCreateDM(me2.username, target);
                currentChatId = chat.id;
                chatTab = 'dialogs';
                closeAllPanels();
                navigate('messages', { chatId: chat.id });
                return;
            }
            const targetUser = _usersCache[target];
            const targetId = targetUser ? targetUser.id : target;
            try {
                if (action === 'accept') {
                    await apiAcceptFriend(targetId);
                    showToast('Заявка принята', 'success');
                } else if (action === 'decline') {
                    await apiDeclineFriend(targetId);
                    showToast('Заявка отклонена', 'success');
                } else if (action === 'unfriend') {
                    if (!confirm('Удалить из друзей?')) return;
                    await apiRemoveFriend(targetId);
                    showToast('Удалён из друзей', 'success');
                } else if (action === 'cancel') {
                    await apiRemoveFriend(targetId);
                    showToast('Заявка отозвана', 'success');
                }
                await loadFriendsData();
                await loadUsersCache();
                renderFriendsPanel();
                renderUsersPanel();
                renderTopbarUser();
            } catch(err) {
                showToast('Ошибка: ' + err.message, 'error');
            }
        });
    });
}

/* ====================== АВТОРИЗАЦИЯ UI ====================== */
function openAuth(tab) {
    document.getElementById('authOverlay').classList.add('active');
    switchTab(tab);
}
function closeAuth() {
    document.getElementById('authOverlay').classList.remove('active');
    document.getElementById('loginError').textContent = '';
    document.getElementById('regError').textContent = '';
    document.getElementById('loginForm').reset();
    document.getElementById('registerForm').reset();
}
function switchTab(tab) {
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    document.getElementById('loginForm').style.display = tab === 'login' ? 'block' : 'none';
    document.getElementById('registerForm').style.display = tab === 'register' ? 'block' : 'none';
}
function openLogoutConfirm() {
    const me = getCurrentUser();
    if (!me) return;
    const box = document.getElementById('logoutUserBox');
    box.innerHTML = `
        ${avatarHTML(me, 'lg')}
        <div style="flex:1; min-width:0">
            <div style="font-family:var(--font-head); font-size:1rem; color:var(--text); letter-spacing:.5px; margin-bottom:2px">${escapeHtml(displayName(me))}</div>
            <div style="font-size:.8rem; color:var(--accent); font-family:var(--font-head); letter-spacing:.5px">@${escapeHtml(me.handle || me.username)}</div>
            ${me.email ? `<div style="font-size:.75rem; color:var(--text3); font-style:italic; margin-top:2px">${escapeHtml(me.email)}</div>` : ''}
        </div>
    `;
    document.getElementById('logoutOverlay').classList.add('active');
}

/* ====================== РЕДАКТИРОВАНИЕ ПРОФИЛЯ ====================== */
let editProfileAvatarData = null;
function openEditProfile() {
    const me = getCurrentUser();
    if (!me) return;
    document.getElementById('editDisplayName').value = me.displayName || me.username;
    document.getElementById('editUsername').value = me.handle || me.username;
    document.getElementById('editBio').value = me.bio || '';
    document.getElementById('bioCount').textContent = (me.bio || '').length;
    editProfileAvatarData = me.avatar || null;
    renderAvatarPreview();
    document.getElementById('editProfileError').textContent = '';
    document.getElementById('editProfileOverlay').classList.add('active');
}
function renderAvatarPreview() {
    const preview = document.getElementById('avatarPreview');
    if (!preview) return;
    if (editProfileAvatarData) {
        preview.innerHTML = `<img src="${escapeAttr(editProfileAvatarData)}" alt="">`;
    } else {
        const me = getCurrentUser();
        const initial = (me?.displayName || me?.username || '?').charAt(0).toUpperCase();
        preview.textContent = initial;
    }
}

/* ====================== ГЛОБАЛЬНЫЙ ПОИСК ====================== */
function initGlobalSearch() {
    const globalSearchInput = document.getElementById('globalSearchInput');
    const globalSearchResults = document.getElementById('globalSearchResults');
    if (!globalSearchInput) return;
    globalSearchInput.addEventListener('input', () => {
        const q = globalSearchInput.value.trim().toLowerCase();
        if (q.length < 2) { globalSearchResults.classList.remove('active'); return; }
        const results = [];
        const users = getUsers();
        const books = getAllBooks();
        const communities = getAllCommunities();
        Object.entries(users).forEach(([u, data]) => {
            const handle = data.handle || u;
            if (handle.toLowerCase().includes(q.replace('@','')) ||
                u.toLowerCase().includes(q) ||
                (data.displayName && data.displayName.toLowerCase().includes(q))) {
                results.push({
                    type: 'Пользователь',
                    title: displayName({ username: u, ...data }),
                    sub: '@' + handle,
                    onClick: () => { currentProfileUser = u; closeAllPanels(); navigate('profile'); }
                });
            }
        });
        books.forEach(b => {
            if (b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q)) {
                results.push({
                    type: 'Книга', title: b.title, sub: b.author,
                    onClick: () => { currentBookId = b.id; navigate('book'); }
                });
            }
        });
        Object.values(communities).forEach(c => {
            if (c.title.toLowerCase().includes(q) || c.username.toLowerCase().includes(q)) {
                results.push({
                    type: 'Сообщество', title: c.title, sub: '@' + c.username,
                    onClick: () => { currentCommunityId = c.id; navigate('community'); }
                });
            }
        });
        if (!results.length) {
            globalSearchResults.innerHTML = `<div class="search-result" style="cursor:default;color:var(--text3);font-style:italic">Ничего не найдено</div>`;
            globalSearchResults.classList.add('active');
            return;
        }
        globalSearchResults.innerHTML = results.slice(0, 20).map((r, i) => `
            <div class="search-result" data-idx="${i}">
                <div style="flex:1;min-width:0">
                    <div style="font-family:var(--font-head);color:var(--text);font-size:.9rem">${escapeHtml(r.title)}</div>
                    <div style="font-size:.75rem;color:var(--text3);font-style:italic">${escapeHtml(r.sub)}</div>
                </div>
                <div class="search-result-type">${r.type}</div>
            </div>
        `).join('');
        globalSearchResults.querySelectorAll('.search-result').forEach((el, i) => {
            el.addEventListener('click', () => {
                results[i].onClick();
                globalSearchResults.classList.remove('active');
                globalSearchInput.value = '';
            });
        });
        globalSearchResults.classList.add('active');
    });
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#globalSearchWrap')) {
            globalSearchResults.classList.remove('active');
        }
    });
}

/* ====================== РЕНДЕР (роутер) ====================== */
const app = document.getElementById('app');

async function render() {
    if (currentPage === 'home') await renderHome();
    else if (currentPage === 'catalog') await renderCatalog();
    else if (currentPage === 'book') await renderBookPage();
    else if (currentPage === 'reader') await renderReader();
    else if (currentPage === 'mybooks') await renderMyBooks();
    else if (currentPage === 'reading') await renderReadingPage();
    else if (currentPage === 'editor') await renderEditor();
    else if (currentPage === 'messages') renderMessages();
    else if (currentPage === 'profile') await renderProfilePage();
    else if (currentPage === 'communities') await renderCommunitiesPage();
    else if (currentPage === 'community') await renderCommunityPage();
    renderTopbarUser();
    updateUnreadBadge();
}

/* ---------- ГЛАВНАЯ ---------- */
async function renderHome() {
    if (_booksCache.length === 0) await loadBooks();
    const books = getAllBooks().slice().sort((a,b) => b.updatedAt - a.updatedAt).slice(0, 6);
    const user = getCurrentUser();
    const usersCount = Object.keys(getUsers()).length;
    const booksCount = getBooksCount();
    const onlineCount = getOnlineCount();
    const communitiesCount = getCommunitiesCount();
    app.innerHTML = `
        <div class="container">
            <section class="hero">
                <h1>Северная Библиотека</h1>
                <div class="subtitle">читай · публикуй · общайся · объединяйся</div>
                <p>Платформа для авторов и читателей. Выкладывайте книги, заводите друзей, создавайте сообщества.</p>
                <div style="display:flex; gap:12px; justify-content:center; flex-wrap:wrap">
                    <button class="btn btn-primary" onclick="navigate('catalog')">Открыть каталог</button>
                    ${user ? `<button class="btn" onclick="navigate('reading')">Моё чтение</button>` : `<button class="btn" onclick="openAuth('register')">Создать аккаунт</button>`}
                </div>
            </section>
            <section class="section" style="max-width:1000px; margin:0 auto">
                <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:16px; text-align:center">
                    <div class="card">
                        <div style="font-family:var(--font-display); font-size:2rem; color:var(--accent)">${booksCount}</div>
                        <div style="font-family:var(--font-head); font-size:.7rem; letter-spacing:1.5px; text-transform:uppercase; color:var(--text3); margin-top:6px">${plural(booksCount, 'Книга', 'Книги', 'Книг')}</div>
                    </div>
                    <div class="card">
                        <div style="font-family:var(--font-display); font-size:2rem; color:var(--accent)">${usersCount}</div>
                        <div style="font-family:var(--font-head); font-size:.7rem; letter-spacing:1.5px; text-transform:uppercase; color:var(--text3); margin-top:6px">Авторов</div>
                    </div>
                    <div class="card">
                        <div style="font-family:var(--font-display); font-size:2rem; color:var(--online)">${onlineCount}</div>
                        <div style="font-family:var(--font-head); font-size:.7rem; letter-spacing:1.5px; text-transform:uppercase; color:var(--text3); margin-top:6px">В сети</div>
                    </div>
                    <div class="card">
                        <div style="font-family:var(--font-display); font-size:2rem; color:var(--accent)">${communitiesCount}</div>
                        <div style="font-family:var(--font-head); font-size:.7rem; letter-spacing:1.5px; text-transform:uppercase; color:var(--text3); margin-top:6px">Сообществ</div>
                    </div>
                </div>
            </section>
            <section class="section">
                <div class="section-head">
                    <div class="section-title">Новинки</div>
                    <button class="btn btn-ghost btn-sm" onclick="navigate('catalog')">Все книги →</button>
                </div>
                ${books.length ? `<div class="books-grid">${books.map(bookCardHTML).join('')}</div>` : `<div class="empty">Пока ни одной книги</div>`}
            </section>
        </div>
        <footer class="footer"><div class="container">© Северная Библиотека</div></footer>
    `;
    attachBookClickHandlers();
}

/* ---------- КАТАЛОГ ---------- */
async function renderCatalog() {
    if (_booksCache.length === 0) await loadBooks();
    const books = getAllBooks().slice().sort((a,b) => b.updatedAt - a.updatedAt);
    app.innerHTML = `
        <div class="container">
            <section class="section" style="padding-top:60px">
                <div class="section-head">
                    <div class="section-title">Каталог книг</div>
                    <span style="color:var(--text3); font-size:.85rem; font-family:var(--font-head)">${books.length} ${plural(books.length, 'книга', 'книги', 'книг')}</span>
                </div>
                ${books.length ? `<div class="books-grid">${books.map(bookCardHTML).join('')}</div>` : `<div class="empty">Пока ни одной книги</div>`}
            </section>
        </div>
    `;
    attachBookClickHandlers();
}

function bookCardHTML(book) {
    const me = getCurrentUser();
    const prog = me ? getReadingProgress(me.username, book.id) : null;
    let badgeHTML = '';
    let progressHTML = '';
    if (prog && book.chaptersCount) {
        const idx = Math.min(prog.chapterIndex, book.chaptersCount - 1);
        const total = book.chaptersCount;
        const percent = Math.round(((idx + 1) / total) * 100);
        badgeHTML = `<div class="book-reading-badge">Читаю</div>`;
        progressHTML = `<div class="book-progress"><div class="book-progress-fill" style="width:${percent}%"></div></div>`;
    }
    const coverInner = book.cover
        ? `<img src="${escapeAttr(book.cover)}" alt="">`
        : `<div class="book-cover-symbol">${book.coverSymbol || '📖'}</div>`;
    return `
        <button class="book-card" data-book-id="${book.id}">
            <div class="book-cover">
                ${badgeHTML}
                ${coverInner}
            </div>
            <div class="book-title">${escapeHtml(book.title)}</div>
            <div class="book-author">${escapeHtml(book.author)}</div>
            <div class="book-meta">${book.chaptersCount} ${plural(book.chaptersCount, 'глава', 'главы', 'глав')}</div>
            ${progressHTML}
        </button>
    `;
}

function attachBookClickHandlers() {
    document.querySelectorAll('.book-card').forEach(card => {
        card.addEventListener('click', () => {
            currentBookId = card.dataset.bookId;
            navigate('book');
        });
    });
}

/* ---------- СТРАНИЦА КНИГИ ---------- */
async function renderBookPage() {
    let book;
    try { book = await apiGetBook(currentBookId); }
    catch(e) { showToast('Книга не найдена', 'error'); navigate('catalog'); return; }
    const user = getCurrentUser();
    const isOwner = user && book.author === user.username;
    let progress = null;
    if (user) {
        try {
            const readingList = await apiGetMyReading();
            progress = readingList.find(item => item.book.id === book.id) || null;
        } catch(e) { progress = null; }
    }
    const hasProgress = !!progress && book.chapters.length > 0;
    let mainBtnLabel = 'Начать чтение';
    let mainBtnTarget = 0;
    if (hasProgress) {
        mainBtnLabel = 'Продолжить читать';
        mainBtnTarget = Math.min(progress.chapterIndex, book.chapters.length - 1);
    }
    const progressInfo = hasProgress ? `
        <div style="display:flex; align-items:center; gap:12px; margin-bottom:20px; padding:14px 18px; background:var(--card); border:1px solid var(--accent); border-radius:10px">
            <div style="font-family:var(--font-head); font-size:.72rem; letter-spacing:1.5px; text-transform:uppercase; color:var(--accent)">Вы остановились на</div>
            <div style="font-family:var(--font-title); font-size:1rem; color:var(--text); flex:1">Глава ${mainBtnTarget + 1}: ${escapeHtml(book.chapters[mainBtnTarget] ? book.chapters[mainBtnTarget].title : '')}</div>
            <div style="font-family:var(--font-head); font-size:.85rem; color:var(--accent); letter-spacing:1px">${Math.round(((mainBtnTarget + 1) / book.chapters.length) * 100)}%</div>
        </div>
    ` : '';
    const coverHTML = book.cover
        ? `<div class="book-cover-large"><img src="${escapeAttr(book.cover)}" alt=""></div>`
        : `<div class="book-cover-large"><div class="book-cover-symbol">${book.coverSymbol || '📖'}</div></div>`;
    app.innerHTML = `
        <div class="container">
            <div class="book-page">
                <button class="btn btn-ghost btn-sm" onclick="navigate('catalog')" style="margin-bottom:24px">← В каталог</button>
                <div class="book-layout">
                    <div>${coverHTML}</div>
                    <div class="book-info">
                        <h1>${escapeHtml(book.title)}</h1>
                        <div class="author">${escapeHtml(book.author)}</div>
                        <div class="meta-line">
                            <span>${book.genre || 'без жанра'}</span>
                            <span>·</span>
                            <span>${book.chapters.length} ${plural(book.chapters.length, 'глава', 'главы', 'глав')}</span>
                            <span>·</span>
                            <span>обновлено ${formatDate(book.updatedAt)}</span>
                        </div>
                        <div class="book-annotation">${escapeHtml(book.annotation || 'Аннотация отсутствует.')}</div>
                        ${progressInfo}
                        ${book.chapters.length ? `
                            <div style="display:flex; gap:12px; flex-wrap:wrap">
                                <button class="btn btn-primary" id="startReadingBtn">${mainBtnLabel}</button>
                                ${hasProgress ? `<button class="btn btn-ghost" id="restartReadingBtn">Начать сначала</button>` : ''}
                                ${isOwner ? `<button class="btn" id="editBookBtn">Редактировать</button>` : ''}
                                ${isOwner ? `<button class="btn btn-ghost" id="deleteBookBtn">Удалить</button>` : ''}
                                ${user && !isOwner ? `<button class="btn" id="writeAuthorBtn">Написать автору</button>` : ''}
                            </div>
                        ` : `<div class="empty">В книге пока нет глав</div>`}
                        ${book.chapters.length ? `
                            <div class="chapters-preview">
                                <div class="section-title" style="margin-bottom:16px; font-size:.9rem">Оглавление</div>
                                ${book.chapters.map((ch, i) => {
                                    const isCurrent = hasProgress && mainBtnTarget === i;
                                    return `
                                        <div class="chapter-preview-item ${isCurrent ? 'current' : ''}" data-chapter-index="${i}">
                                            <div>
                                                <div class="num">Глава ${i + 1}</div>
                                                <div class="title">${escapeHtml(ch.title)}</div>
                                            </div>
                                            ${isCurrent ? `<div class="current-mark">вы здесь</div>` : '<div class="arrow">→</div>'}
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        </div>
    `;
    const startBtn = document.getElementById('startReadingBtn');
    if (startBtn) startBtn.addEventListener('click', () => navigate('reader', { chapterIndex: mainBtnTarget }));
    const restartBtn = document.getElementById('restartReadingBtn');
    if (restartBtn) restartBtn.addEventListener('click', async () => {
        await apiSaveProgress(book.id, 0);
        navigate('reader', { chapterIndex: 0 });
    });
    document.querySelectorAll('.chapter-preview-item').forEach(item => {
        item.addEventListener('click', () => navigate('reader', { chapterIndex: parseInt(item.dataset.chapterIndex) }));
    });
    if (isOwner) {
        document.getElementById('editBookBtn').addEventListener('click', () => navigate('editor', { editingBookId: book.id }));
        document.getElementById('deleteBookBtn').addEventListener('click', async () => {
            if (!confirm('Удалить книгу?')) return;
            try {
                await apiDeleteBook(book.id);
                await loadBooks();
                showToast('Книга удалена', 'success');
                updateBookCounter();
                navigate('catalog');
            } catch (e) { showToast('Ошибка удаления: ' + e.message, 'error'); }
        });
    }
    if (user && !isOwner) {
        const btn = document.getElementById('writeAuthorBtn');
        if (btn) btn.addEventListener('click', async () => {
            const chat = await getOrCreateDM(user.username, book.author);
            currentChatId = chat.id;
            navigate('messages', { chatId: chat.id });
        });
    }
}

/* ---------- ЧИТАЛКА ---------- */
async function renderReader() {
    let book;
    try { book = await apiGetBook(currentBookId); }
    catch(e) { navigate('book'); return; }
    if (!book || !book.chapters.length) { navigate('book'); return; }
    const idx = navData.chapterIndex || 0;
    const chapter = book.chapters[idx] || book.chapters[0];
    const realIdx = book.chapters.indexOf(chapter);
    const paragraphs = chapter.content.split('\n').filter(p => p.trim());
    const me = getCurrentUser();
    if (me) await apiSaveProgress(book.id, realIdx);
    app.innerHTML = `
        <div class="container">
            <div class="reader-view">
                <div class="reader-toolbar">
                    <button class="btn btn-ghost btn-sm" onclick="navigate('book')">← К книге</button>
                    <div class="current-chapter">${escapeHtml(book.title)} · ${escapeHtml(chapter.title)}</div>
                    <span style="font-family:var(--font-head); font-size:.75rem; color:var(--text3)">${realIdx + 1} / ${book.chapters.length}</span>
                </div>
                <div class="reader-content">
                    <h2>${escapeHtml(chapter.title)}</h2>
                    <div class="chapter-label">${escapeHtml(book.title)}</div>
                    ${paragraphs.map(p => `<p>${escapeHtml(p)}</p>`).join('')}
                    <div class="reader-nav">
                        <button class="btn ${realIdx === 0 ? 'btn-ghost' : ''}" id="prevChapter" ${realIdx === 0 ? 'disabled' : ''}>← Предыдущая</button>
                        <button class="btn btn-primary" id="nextChapter" ${realIdx === book.chapters.length - 1 ? 'disabled' : ''}>Следующая →</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.getElementById('prevChapter').addEventListener('click', () => {
        if (realIdx > 0) navigate('reader', { chapterIndex: realIdx - 1 });
    });
    document.getElementById('nextChapter').addEventListener('click', () => {
        if (realIdx < book.chapters.length - 1) navigate('reader', { chapterIndex: realIdx + 1 });
    });
}

/* ---------- МОИ КНИГИ ---------- */
async function renderMyBooks() {
    const user = getCurrentUser();
    if (!user) {
        app.innerHTML = `<div class="container"><section class="section" style="padding-top:80px; text-align:center">
            <h1 style="font-family:var(--font-title); font-size:2rem; margin-bottom:12px">Личный кабинет</h1>
            <p style="color:var(--text2); margin-bottom:24px">Войдите или создайте аккаунт</p>
            <div style="display:flex; gap:12px; justify-content:center; flex-wrap:wrap">
                <button class="btn btn-primary" onclick="openAuth('login')">Войти</button>
                <button class="btn" onclick="openAuth('register')">Регистрация</button>
            </div></section></div>`;
        return;
    }
    let myBooks = [];
    try { myBooks = await apiGetMyBooks(); }
    catch(e) { console.error('Ошибка загрузки моих книг:', e); myBooks = []; }
    const friendsCount = getFriendsCount(user.username);
    const communitiesList = await getMyCommunities(user.username);
    const communitiesCount = communitiesList.length;
    app.innerHTML = `
        <div class="container">
            <div class="dashboard">
                <div class="dashboard-head">
                    <div>
                        <h1>Мои книги</h1>
                        <div class="subtitle">${escapeHtml(displayName(user))} · ${myBooks.length} ${plural(myBooks.length, 'книга', 'книги', 'книг')} · ${friendsCount} ${plural(friendsCount, 'друг', 'друга', 'друзей')} · ${communitiesCount} ${plural(communitiesCount, 'сообщество', 'сообщества', 'сообществ')}</div>
                    </div>
                    <div style="display:flex;gap:8px;flex-wrap:wrap">
                        <button class="btn" onclick="navigate('profile', {username: '${escapeAttr(user.username)}'})">Мой профиль</button>
                        <button class="btn btn-primary" id="newBookBtn">+ Новая книга</button>
                    </div>
                </div>
                ${myBooks.length ? `
                    <div class="my-books">
                        ${myBooks.map(book => {
                            const coverInner = book.cover
                                ? `<img src="${escapeAttr(book.cover)}" alt="">`
                                : (book.coverSymbol || '📖');
                            return `
                            <div class="my-book-item">
                                <div class="my-book-cover">${coverInner}</div>
                                <div class="my-book-info">
                                    <div class="title">${escapeHtml(book.title)}</div>
                                    <div class="meta">${book.chaptersCount} ${plural(book.chaptersCount, 'глава', 'главы', 'глав')} · обновлено ${formatDate(book.updatedAt)}</div>
                                </div>
                                <div class="my-book-actions">
                                    <button class="btn btn-sm" data-view="${book.id}">Читать</button>
                                    <button class="btn btn-sm" data-edit="${book.id}">Редактировать</button>
                                    <button class="btn btn-ghost btn-sm" data-delete="${book.id}">Удалить</button>
                                </div>
                            </div>
                        `}).join('')}
                    </div>
                ` : `<div class="empty">У вас пока нет книг</div>`}
            </div>
        </div>
    `;
    document.getElementById('newBookBtn').addEventListener('click', () => navigate('editor', { editingBookId: null }));
    document.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => { currentBookId = b.dataset.view; navigate('book'); }));
    document.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => navigate('editor', { editingBookId: b.dataset.edit })));
    document.querySelectorAll('[data-delete]').forEach(b => b.addEventListener('click', async () => {
        if (!confirm('Удалить книгу?')) return;
        const bookId = b.dataset.delete;
        try {
            await apiDeleteBook(bookId);
            await loadBooks();
            showToast('Книга удалена', 'success');
            updateBookCounter();
            render();
        } catch (e) { showToast('Ошибка удаления: ' + e.message, 'error'); }
    }));
}

/* ---------- МОЁ ЧТЕНИЕ ---------- */
async function renderReadingPage() {
    const user = getCurrentUser();
    if (!user) {
        app.innerHTML = `<div class="container"><section class="section" style="padding-top:80px; text-align:center">
            <h1 style="font-family:var(--font-title); font-size:2rem; margin-bottom:12px">Моё чтение</h1>
            <p style="color:var(--text2); margin-bottom:24px">Войдите, чтобы отслеживать прогресс чтения</p>
            <div style="display:flex; gap:12px; justify-content:center; flex-wrap:wrap">
                <button class="btn btn-primary" onclick="openAuth('login')">Войти</button>
                <button class="btn" onclick="openAuth('register')">Регистрация</button>
            </div></section></div>`;
        return;
    }
    let list = await apiGetMyReading();
    app.innerHTML = `
        <div class="container">
            <div class="dashboard">
                <div class="dashboard-head">
                    <div>
                        <h1>Моё чтение</h1>
                        <div class="subtitle">Книги, которые вы читаете — ${list.length} ${plural(list.length, 'книга', 'книги', 'книг')}</div>
                    </div>
                    <button class="btn" onclick="navigate('catalog')">Найти новые книги →</button>
                </div>
                ${list.length ? `
                    <div class="reading-list">
                        ${list.map(item => {
                            const coverInner = item.book.cover
                                ? `<img src="${escapeAttr(item.book.cover)}" alt="">`
                                : (item.book.coverSymbol || '📖');
                            const total = item.book.chaptersCount || 1;
                            const idx = Math.min(item.chapterIndex || 0, total - 1);
                            const percent = Math.round(((idx + 1) / total) * 100);
                            return `
                            <div class="reading-item">
                                <div class="reading-cover">${coverInner}</div>
                                <div class="reading-info">
                                    <div class="title">${escapeHtml(item.book.title)}</div>
                                    <div class="author">${escapeHtml(item.book.author)}</div>
                                    <div class="chapter-now">Глава ${idx + 1} из ${total}</div>
                                    <div class="reading-progress-bar"><div style="width:${percent}%"></div></div>
                                    <div class="reading-progress-text">Прочитано ${percent}% · обновлено ${formatDate(item.updatedAt)}</div>
                                </div>
                                <div class="reading-actions">
                                    <button class="btn btn-primary btn-sm" data-continue="${item.book.id}" data-chapter="${idx}">Продолжить читать</button>
                                    <button class="btn btn-ghost btn-sm" data-restart="${item.book.id}">Начать сначала</button>
                                </div>
                            </div>
                        `}).join('')}
                    </div>
                ` : `<div class="empty">Вы пока не начали читать ни одной книги</div>`}
            </div>
        </div>
    `;
    document.querySelectorAll('[data-continue]').forEach(btn => {
        btn.addEventListener('click', () => {
            currentBookId = btn.dataset.continue;
            const ch = parseInt(btn.dataset.chapter);
            navigate('reader', { chapterIndex: ch });
        });
    });
    document.querySelectorAll('[data-restart]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const bookId = btn.dataset.restart;
            await apiSaveProgress(bookId, 0);
            currentBookId = bookId;
            navigate('reader', { chapterIndex: 0 });
        });
    });
}

/* ---------- РЕДАКТОР КНИГИ ---------- */
let bookCoverData = null;

async function renderEditor() {
    const user = getCurrentUser();
    if (!user) { navigate('mybooks'); return; }
    const editingId = navData.editingBookId;
    let existing = null;
    if (editingId) {
        try { existing = await apiGetBook(editingId); }
        catch(e) { showToast('Книга не найдена', 'error'); navigate('mybooks'); return; }
    }
    const isEdit = !!existing;
    if (isEdit && existing.author !== user.username) {
        showToast('Это не ваша книга', 'error');
        navigate('mybooks');
        return;
    }
    const draft = existing || {
        title: '', author: user.username, annotation: '',
        coverSymbol: '📖', cover: null, genre: '',
        chapters: [{ id: 'c' + Date.now(), title: 'Глава 1', content: '' }]
    };
    const isCustomGenre = draft.genre && !GENRES.includes(draft.genre);
    const genreOptions = GENRES.map(g => `<option value="${escapeAttr(g)}" ${(!isCustomGenre && draft.genre === g) ? 'selected' : ''}>${escapeHtml(g)}</option>`).join('');
    bookCoverData = draft.cover || null;
    app.innerHTML = `
        <div class="container">
            <div class="editor">
                <h1>${isEdit ? 'Редактирование книги' : 'Новая книга'}</h1>
                <div class="sub">Все условия должны быть выполнены перед публикацией</div>
                <div class="requirements">
                    <h3>Требования к публикации</h3>
                    <ul class="req-list" id="reqList"></ul>
                </div>
                <div class="card">
                    <div class="field"><label>Название <span class="req">*</span></label><input type="text" id="bookTitle" value="${escapeAttr(draft.title)}" placeholder="Название книги"></div>
                    <div class="field"><label>Автор (псевдоним) <span class="req">*</span></label><input type="text" id="bookAuthor" value="${escapeAttr(draft.author)}" placeholder="Ваш псевдоним"></div>
                    <div class="field">
                        <label>Жанр <span class="req">*</span></label>
                        <select id="bookGenre">
                            <option value="">— Выберите жанр —</option>
                            ${genreOptions}
                            <option value="__custom__" ${isCustomGenre ? 'selected' : ''}>Другое (ввести вручную)</option>
                        </select>
                    </div>
                    <div class="field" id="customGenreField" style="display:${isCustomGenre ? 'block' : 'none'}">
                        <label>Свой жанр <span class="req">*</span></label>
                        <input type="text" id="bookCustomGenre" value="${isCustomGenre ? escapeAttr(draft.genre) : ''}" placeholder="Введите свой жанр" maxlength="50">
                        <div class="hint">От 2 до 50 символов.</div>
                    </div>
                    <div class="field">
                        <label>Обложка книги</label>
                        <div class="cover-uploader">
                            <div class="cover-preview-box" id="coverPreviewBox">
                                ${bookCoverData
                                    ? `<img src="${escapeAttr(bookCoverData)}" alt="">`
                                    : `<div class="book-cover-symbol">${escapeHtml(draft.coverSymbol || '📖')}</div>`}
                            </div>
                            <div class="cover-uploader-info">
                                <p>Загрузите свою картинку-обложку (JPG, PNG, до 2 МБ). Если не загружать — на обложке будет показан символ.</p>
                                <input type="file" id="bookCoverInput" accept="image/*" style="display:none">
                                <div class="cover-uploader-actions">
                                    <button type="button" class="btn btn-sm" id="bookCoverChooseBtn">Загрузить обложку</button>
                                    <button type="button" class="btn btn-ghost btn-sm" id="bookCoverRemoveBtn">Убрать обложку</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="field"><label>Символ на обложке (если нет картинки)</label><input type="text" id="bookSymbol" value="${escapeAttr(draft.coverSymbol)}" maxlength="3" placeholder="✦"></div>
                    <div class="field"><label>Аннотация <span class="req">*</span></label><textarea id="bookAnnotation" placeholder="О чём книга...">${escapeHtml(draft.annotation)}</textarea><div class="hint"><span id="annotationCount">0</span> / 80</div></div>
                </div>
                <div class="section-head" style="margin-top:32px"><div class="section-title">Главы</div><button class="btn btn-sm" id="addChapterBtn">+ Добавить главу</button></div>
                <div id="chaptersList"></div>
                <label class="agree-row" id="agreeRow">
                    <input type="checkbox" id="agreeCheck">
                    <div class="agree-text">Я подтверждаю, что текст принадлежит мне или я имею право на публикацию. Я согласен с <a href="#" id="showRulesLink">правилами публикации</a>.</div>
                </label>
                <div style="display:flex; gap:12px; margin-top:12px; flex-wrap:wrap">
                    <button class="btn btn-primary" id="saveBookBtn" style="flex:1" disabled>${isEdit ? 'Сохранить' : 'Опубликовать'}</button>
                    <button class="btn btn-ghost" id="cancelBtn">Отмена</button>
                </div>
            </div>
        </div>
    `;
    const chaptersList = document.getElementById('chaptersList');
    const reqList = document.getElementById('reqList');
    const agreeCheck = document.getElementById('agreeCheck');
    const agreeRow = document.getElementById('agreeRow');
    const saveBtn = document.getElementById('saveBookBtn');
    const genreSelect = document.getElementById('bookGenre');
    const customGenreField = document.getElementById('customGenreField');
    const customGenreInput = document.getElementById('bookCustomGenre');
    const coverPreviewBox = document.getElementById('coverPreviewBox');
    genreSelect.addEventListener('change', () => {
        if (genreSelect.value === '__custom__') { customGenreField.style.display = 'block'; customGenreInput.focus(); }
        else customGenreField.style.display = 'none';
        checkAll();
    });
    customGenreInput.addEventListener('input', checkAll);
    document.getElementById('bookCoverChooseBtn').addEventListener('click', () => document.getElementById('bookCoverInput').click());
    document.getElementById('bookCoverInput').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) { showToast('Файл слишком большой (макс 2 МБ)', 'error'); return; }
        const reader = new FileReader();
        reader.onload = (ev) => {
            bookCoverData = ev.target.result;
            coverPreviewBox.innerHTML = `<img src="${escapeAttr(bookCoverData)}" alt="">`;
        };
        reader.readAsDataURL(file);
    });
    document.getElementById('bookCoverRemoveBtn').addEventListener('click', () => {
        bookCoverData = null;
        const sym = document.getElementById('bookSymbol').value.trim() || '📖';
        coverPreviewBox.innerHTML = `<div class="book-cover-symbol">${escapeHtml(sym)}</div>`;
    });
    document.getElementById('bookSymbol').addEventListener('input', () => {
        if (!bookCoverData) {
            const sym = document.getElementById('bookSymbol').value.trim() || '📖';
            coverPreviewBox.innerHTML = `<div class="book-cover-symbol">${escapeHtml(sym)}</div>`;
        }
    });
    function getSelectedGenre() {
        if (genreSelect.value === '__custom__') return customGenreInput.value.trim();
        return genreSelect.value;
    }
    function renderChapters(chapters) {
        chaptersList.innerHTML = chapters.map((ch, i) => `
            <div class="chapter-editor-item" data-idx="${i}">
                <div class="chapter-editor-head">
                    <input type="text" class="ch-title" value="${escapeAttr(ch.title)}" placeholder="Название главы">
                    <button class="icon-btn" data-remove="${i}" ${chapters.length === 1 ? 'disabled style="opacity:.3"' : ''}>×</button>
                </div>
                <textarea class="ch-content" placeholder="Текст главы. Абзацы разделяйте пустой строкой.">${escapeHtml(ch.content)}</textarea>
                <div class="hint"><span class="ch-counter">0</span> / 500</div>
            </div>
        `).join('');
        chaptersList.querySelectorAll('[data-remove]').forEach(btn => {
            btn.addEventListener('click', () => {
                const i = parseInt(btn.dataset.remove);
                if (chapters.length <= 1) return;
                chapters.splice(i, 1); renderChapters(chapters); checkAll();
            });
        });
        chaptersList.querySelectorAll('.ch-content').forEach(ta => {
            ta.addEventListener('input', () => {
                const counter = ta.parentElement.querySelector('.ch-counter');
                if (counter) counter.textContent = ta.value.trim().length;
                checkAll();
            });
        });
    }
    function checkAll() {
        const title = document.getElementById('bookTitle').value.trim();
        const author = document.getElementById('bookAuthor').value.trim();
        const genre = getSelectedGenre();
        const annotation = document.getElementById('bookAnnotation').value.trim();
        const chapterItems = chaptersList.querySelectorAll('.chapter-editor-item');
        const annCount = document.getElementById('annotationCount');
        if (annCount) annCount.textContent = annotation.length;
        const chaptersData = [];
        chapterItems.forEach(item => {
            const t = item.querySelector('.ch-title').value.trim();
            const c = item.querySelector('.ch-content').value.trim();
            chaptersData.push({ title: t, content: c, length: c.length });
        });
        const checks = [
            { ok: title.length >= 3, label: 'Название книги', hint: 'Не менее 3 символов', value: title.length + ' / 3' },
            { ok: author.length >= 2, label: 'Автор', hint: 'Имя автора или псевдоним', value: author.length + ' / 2' },
            { ok: genre.length >= 2, label: 'Жанр', hint: 'Не менее 2 символов', value: genre.length + ' / 2' },
            { ok: annotation.length >= 80, label: 'Аннотация', hint: 'Не менее 80 символов', value: annotation.length + ' / 80' },
            { ok: chaptersData.length >= 1 && chaptersData[0].content.length >= 500, label: 'Первая глава', hint: 'Не менее 500 символов', value: chaptersData[0] ? chaptersData[0].content.length + ' / 500' : '0 / 500' },
            { ok: chaptersData.every(c => c.title.length >= 1), label: 'Все главы названы', hint: 'У каждой главы название', value: chaptersData.every(c => c.title.length >= 1) ? 'ок' : 'есть пустые' },
            { ok: agreeCheck.checked, label: 'Согласие с правилами', hint: 'Отметьте галочку', value: agreeCheck.checked ? 'да' : 'нет' }
        ];
        reqList.innerHTML = checks.map(c => `
            <li class="req-item ${c.ok ? 'ok' : 'fail'}">
                <div class="req-icon">${c.ok ? '✓' : '!'}</div>
                <div class="req-text"><strong>${c.label}</strong><small>${c.hint} · ${c.value}</small></div>
            </li>
        `).join('');
        const allOk = checks.every(c => c.ok);
        saveBtn.disabled = !allOk;
        return allOk;
    }
    renderChapters(draft.chapters);
    ['bookTitle', 'bookAuthor', 'bookAnnotation'].forEach(id => {
        document.getElementById(id).addEventListener('input', checkAll);
    });
    agreeCheck.addEventListener('change', () => { agreeRow.classList.toggle('checked', agreeCheck.checked); checkAll(); });
    agreeRow.addEventListener('click', (e) => {
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'A') {
            agreeCheck.checked = !agreeCheck.checked;
            agreeRow.classList.toggle('checked', agreeCheck.checked);
            checkAll();
        }
    });
    document.getElementById('showRulesLink').addEventListener('click', (e) => { e.preventDefault(); document.getElementById('rulesOverlay').classList.add('active'); });
    document.getElementById('addChapterBtn').addEventListener('click', () => {
        draft.chapters.push({ id: 'c' + Date.now(), title: 'Глава ' + (draft.chapters.length + 1), content: '' });
        renderChapters(draft.chapters); checkAll();
    });
    checkAll();
    saveBtn.addEventListener('click', async () => {
        if (!checkAll()) { showToast('Не все условия выполнены', 'error'); return; }
        const title = document.getElementById('bookTitle').value.trim();
        const author = document.getElementById('bookAuthor').value.trim() || user.username;
        const genre = getSelectedGenre();
        const symbol = document.getElementById('bookSymbol').value.trim() || '📖';
        const annotation = document.getElementById('bookAnnotation').value.trim();
        const chapterItems = chaptersList.querySelectorAll('.chapter-editor-item');
        const newChapters = [];
        chapterItems.forEach((item, i) => {
            const t = item.querySelector('.ch-title').value.trim();
            const c = item.querySelector('.ch-content').value;
            if (t || c.trim()) newChapters.push({ title: t || ('Глава ' + (i + 1)), content: c });
        });
        let coverUrl = existing ? existing.cover : null;
        if (bookCoverData && bookCoverData.startsWith('data:')) {
            try {
                saveBtn.disabled = true;
                saveBtn.textContent = 'Загрузка обложки...';
                const blob = await (await fetch(bookCoverData)).blob();
                const file = new File([blob], 'cover.jpg', { type: blob.type });
                const up = await apiUploadImage(file);
                coverUrl = up.url;
            } catch (e) {
                showToast('Ошибка загрузки обложки: ' + e.message, 'error');
                saveBtn.disabled = false;
                saveBtn.textContent = isEdit ? 'Сохранить' : 'Опубликовать';
                return;
            }
        }
        if (bookCoverData === null) coverUrl = null;
        const payload = { title, annotation, genre, coverUrl, coverSymbol: symbol, status: 'published', chapters: newChapters };
        saveBtn.disabled = true;
        saveBtn.textContent = isEdit ? 'Сохранение...' : 'Публикация...';
        try {
            if (isEdit) { await apiUpdateBook(existing.id, payload); showToast('Книга обновлена', 'success'); }
            else { await apiCreateBook(payload); showToast('Книга опубликована!', 'success'); }
            await loadBooks();
            navigate('mybooks');
        } catch (e) {
            console.error('Ошибка сохранения:', e);
            showToast('Ошибка: ' + (e.message || 'не удалось сохранить'), 'error');
            saveBtn.disabled = false;
            saveBtn.textContent = isEdit ? 'Сохранить' : 'Опубликовать';
        }
    });
    document.getElementById('cancelBtn').addEventListener('click', () => navigate('mybooks'));
}

/* ---------- МЕССЕНДЖЕР ---------- */
function renderMessages() {
    const user = getCurrentUser();
    if (!user) {
        app.innerHTML = `<div class="container"><section class="section" style="padding-top:80px; text-align:center">
            <h1 style="font-family:var(--font-title); font-size:2rem; margin-bottom:12px">Сообщения</h1>
            <p style="color:var(--text2); margin-bottom:24px">Войдите, чтобы общаться</p>
            <div style="display:flex; gap:12px; justify-content:center; flex-wrap:wrap">
                <button class="btn btn-primary" onclick="openAuth('login')">Войти</button>
                <button class="btn" onclick="openAuth('register')">Регистрация</button>
            </div></section></div>`;
        return;
    }
    if (navData.chatId) { currentChatId = navData.chatId; navData.chatId = null; }
    getOrCreateGeneralChat();
    const allChats = getAllChats();
    const myChats = Object.values(allChats).filter(c => {
        if (c.type === 'general') return true;
        if (c.type === 'dm') return c.members && c.members.includes(user.username);
        if (c.type === 'community') {
            const comm = getCommunity(c.communityId);
            return comm && comm.members.includes(user.username);
        }
        return false;
    }).sort((a, b) => (b.lastMessageAt || 0) - (a.lastMessageAt || 0));
    if (!currentChatId && myChats.length) currentChatId = myChats[0].id;
    app.innerHTML = `
        <div class="messenger">
            <aside class="chat-sidebar" id="chatSidebar">
                <div class="chat-sidebar-head">
                    <h2>Сообщения</h2>
                    <button class="icon-btn" id="newChatBtn" title="Все пользователи">☺</button>
                </div>
                <div class="chat-tabs">
                    <button class="chat-tab ${chatTab === 'dialogs' ? 'active' : ''}" data-tab="dialogs">Диалоги</button>
                    <button class="chat-tab ${chatTab === 'general' ? 'active' : ''}" data-tab="general">Общий</button>
                    <button class="chat-tab ${chatTab === 'communities' ? 'active' : ''}" data-tab="communities">Сообщества</button>
                </div>
                <div class="chat-list" id="chatList"></div>
            </aside>
            <section class="chat-main" id="chatMain"></section>
        </div>
    `;
    document.getElementById('newChatBtn').addEventListener('click', () => togglePanel('usersPanel', 'usersBackdrop'));
    document.querySelectorAll('.chat-tab').forEach(t => {
        t.addEventListener('click', () => {
            chatTab = t.dataset.tab;
            if (chatTab === 'general') currentChatId = 'general';
            else if (chatTab === 'dialogs') {
                const first = myChats.find(c => c.type === 'dm');
                currentChatId = first ? first.id : null;
            } else {
                const first = myChats.find(c => c.type === 'community');
                currentChatId = first ? first.id : null;
            }
            renderMessages();
        });
    });
    renderChatList(myChats, user);
    renderChatMain(user);
    updateUnreadBadge();
}

function renderChatList(myChats, user) {
    const list = document.getElementById('chatList');
    let items = myChats;
    if (chatTab === 'general') items = myChats.filter(c => c.type === 'general');
    if (chatTab === 'dialogs') items = myChats.filter(c => c.type === 'dm');
    if (chatTab === 'communities') items = myChats.filter(c => c.type === 'community');
    if (!items.length) {
        list.innerHTML = `<div style="padding:24px; color:var(--text3); text-align:center; font-size:.85rem; font-style:italic">Нет чатов</div>`;
        return;
    }
    list.innerHTML = items.map(c => {
        const msgs = getMessages(c.id);
        const last = msgs[msgs.length - 1];
        const unread = getUnreadCount(user.username, c.id);
        let name, preview, avatarHTML_str;
        if (c.type === 'general') {
            name = 'Общий чат';
            preview = last ? `${displayName(last.from)}: ${truncate(last.text, 40)}` : 'Пока пусто';
            avatarHTML_str = `<div class="avatar size-md" style="background:var(--accent2)">#</div>`;
        } else if (c.type === 'dm') {
            const other = c.members.find(m => m !== user.username) || '?';
            const otherData = getUsers()[other] || {};
            name = displayName({ username: other, ...otherData });
            preview = last ? `${last.from === user.username ? 'Вы: ' : ''}${truncate(last.text, 40)}` : 'Начните переписку';
            avatarHTML_str = avatarHTML({ username: other, ...otherData }, 'md');
        } else {
            const comm = getCommunity(c.communityId);
            if (!comm) return '';
            name = comm.title;
            preview = last ? `${displayName(last.from)}: ${truncate(last.text, 40)}` : 'Пока пусто';
            avatarHTML_str = comm.avatar
                ? `<div class="avatar size-md" style="border-radius:10px"><img src="${escapeAttr(comm.avatar)}" alt=""></div>`
                : `<div class="avatar size-md" style="background:var(--accent2);border-radius:10px">#</div>`;
        }
        return `
            <div class="chat-item ${c.id === currentChatId ? 'active' : ''}" data-chat-id="${c.id}">
                ${avatarHTML_str}
                <div class="chat-item-info">
                    <div class="chat-item-name">${escapeHtml(name)}</div>
                    <div class="chat-item-preview">${escapeHtml(preview)}</div>
                </div>
                ${unread ? `<div class="chat-item-unread">${unread}</div>` : ''}
            </div>
        `;
    }).join('');
    list.querySelectorAll('.chat-item').forEach(el => {
        el.addEventListener('click', () => {
            currentChatId = el.dataset.chatId;
            markChatRead(user.username, currentChatId);
            renderMessages();
        });
    });
}

function renderChatMain(user) {
    const main = document.getElementById('chatMain');
    if (!currentChatId) {
        main.innerHTML = `<div class="chat-empty"><div class="chat-empty-icon">💬</div><div>Выберите чат<br>или начните новый</div></div>`;
        return;
    }
    const chats = getAllChats();
    const chat = chats[currentChatId];
    if (!chat) { main.innerHTML = `<div class="chat-empty">Чат не найден</div>`; return; }
    if (chat.type === 'dm' && !chat.members.includes(user.username)) { main.innerHTML = `<div class="chat-empty">Нет доступа</div>`; return; }
    if (chat.type === 'community') {
        const comm = getCommunity(chat.communityId);
        if (!comm || !comm.members.includes(user.username)) { main.innerHTML = `<div class="chat-empty">Нет доступа</div>`; return; }
    }
    let chatTitle, chatOnline = false, chatAvatar;
    if (chat.type === 'general') {
        chatTitle = 'Общий чат';
        chatAvatar = `<div class="avatar size-md" style="background:var(--accent2)">#</div>`;
    } else if (chat.type === 'dm') {
        chatTitle = chat.members.find(m => m !== user.username) || 'Диалог';
        chatOnline = isUserOnline(chatTitle);
        chatAvatar = avatarHTML(chatTitle, 'md');
    } else {
        const comm = getCommunity(chat.communityId);
        chatTitle = comm.title;
        chatAvatar = comm.avatar
            ? `<div class="avatar size-md" style="border-radius:10px"><img src="${escapeAttr(comm.avatar)}" alt=""></div>`
            : `<div class="avatar size-md" style="background:var(--accent2);border-radius:10px">#</div>`;
    }
    markChatRead(user.username, currentChatId);
    const msgs = getMessages(currentChatId);
    main.innerHTML = `
        <div class="chat-header">
            <button class="chat-back-btn" id="chatBackBtn">←</button>
            ${chatAvatar}
            <div style="flex:1;min-width:0">
                <div class="name">${escapeHtml(chatTitle)}</div>
                <div class="status">${chat.type === 'general' ? 'все пользователи' : chat.type === 'community' ? 'сообщество' : (chatOnline ? 'в сети' : 'не в сети')}</div>
            </div>
            ${chat.type === 'community' ? `<button class="btn btn-sm" onclick="navigate('community', {communityId:'${escapeAttr(chat.communityId)}'})">Открыть</button>` : ''}
        </div>
        <div class="chat-messages" id="chatMessages"></div>
        <div class="chat-input-area">
            <textarea id="chatInput" placeholder="Написать сообщение..." rows="1"></textarea>
            <button class="send-btn" id="sendBtn">Отправить</button>
        </div>
    `;
    const messagesBox = document.getElementById('chatMessages');
    messagesBox.innerHTML = msgs.map(m => {
        const isMine = m.from === user.username;
        return `
            <div class="msg ${isMine ? 'msg-out' : 'msg-in'}">
                ${!isMine && chat.type !== 'dm' ? `<div class="msg-author">${escapeHtml(displayName(m.from))}</div>` : ''}
                ${escapeHtml(m.text)}
                <div class="msg-time">${formatTime(m.at)}</div>
            </div>
        `;
    }).join('');
    messagesBox.scrollTop = messagesBox.scrollHeight;
    const input = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');
    function doSend() {
        const text = input.value.trim();
        if (!text) return;
        sendMessage(currentChatId, user.username, text);
        touchLastSeen(user.username);
        input.value = '';
        input.style.height = 'auto';
        renderChatMain(user);
    }
    sendBtn.addEventListener('click', doSend);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); }
    });
    input.addEventListener('input', () => {
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    });
    const backBtn = document.getElementById('chatBackBtn');
    if (backBtn) backBtn.addEventListener('click', () => document.getElementById('chatSidebar').classList.add('hide-mobile'));
    if (window.innerWidth <= 900) document.getElementById('chatSidebar').classList.add('hide-mobile');
}

/* ---------- ПРОФИЛЬ ---------- */
async function renderProfilePage() {
    const username = navData.username || currentProfileUser;
    const me = getCurrentUser();
    if (!username) { navigate('home'); return; }
    let user;
    if (me && username === me.username) { user = me; }
    else {
        try { user = await apiGetUser(username); }
        catch(e) { showToast('Пользователь не найден', 'error'); navigate('home'); return; }
    }
    if (!user || !user.username) { navigate('home'); return; }
    const isMe = me && me.username === username;
    const friendStatus = isMe ? 'me' : getFriendStatus(me ? me.username : null, username);
    const online = isUserOnline(username);
    const handle = user.handle ? '@' + user.handle : '@' + username.toLowerCase();
    let booksByUser = [];
    try {
        const userBooks = await api('/api/users/' + (user.id || username) + '/books');
        booksByUser = userBooks.map(normalizeBook);
    } catch(e) { booksByUser = getAllBooks().filter(b => b.author === username); }
    const communities = await getMyCommunities(username);
    const friendsCount = getFriendsCount(username);
    app.innerHTML = `
        <div class="container">
            <div class="profile-page">
                <div class="profile-card">
                    <div class="profile-banner"></div>
                    <div class="profile-main">
                        <div class="profile-avatar-wrap">
                            <div class="profile-avatar">
                                ${user.avatar ? `<img src="${escapeAttr(user.avatar)}" alt="">` : (user.displayName || user.username).charAt(0).toUpperCase()}
                                <span class="status-dot ${online ? '' : 'off'}"></span>
                            </div>
                            <div class="profile-actions">
                                ${isMe ? `<button class="btn" id="editProfileBtn">Редактировать профиль</button>` : ''}
                                ${me && !isMe && friendStatus === 'none' ? `<button class="btn btn-primary" id="addFriendBtn">+ В друзья</button>` : ''}
                                ${me && !isMe && friendStatus === 'friends' ? `<button class="btn btn-danger" id="unfriendBtn">Удалить из друзей</button>` : ''}
                                ${me && !isMe && friendStatus === 'outgoing' ? `<button class="btn btn-ghost" id="cancelOutgoingBtn">Отменить заявку</button>` : ''}
                                ${me && !isMe && friendStatus === 'incoming' ? `<button class="btn btn-success" id="acceptFriendBtn">Принять заявку</button>` : ''}
                                ${me && !isMe ? `<button class="btn" id="writeBtn">Написать</button>` : ''}
                            </div>
                        </div>
                        <div class="profile-name">${escapeHtml(displayName(user))}</div>
                        <div class="profile-username">${escapeHtml(handle)}</div>
                        <div class="profile-status ${online ? 'online' : ''}">${online ? '● в сети' : '○ не в сети'}</div>
                        ${user.bio ? `<div class="profile-bio">${escapeHtml(user.bio)}</div>` : ''}
                        <div class="profile-stats">
                            <div class="profile-stat"><div class="profile-stat-num">${booksByUser.length}</div><div class="profile-stat-label">${plural(booksByUser.length, 'Книга', 'Книги', 'Книг')}</div></div>
                            <div class="profile-stat"><div class="profile-stat-num">${friendsCount}</div><div class="profile-stat-label">${plural(friendsCount, 'Друг', 'Друга', 'Друзей')}</div></div>
                            <div class="profile-stat"><div class="profile-stat-num">${communities.length}</div><div class="profile-stat-label">${plural(communities.length, 'Сообщество', 'Сообщества', 'Сообществ')}</div></div>
                        </div>
                    </div>
                </div>
                ${booksByUser.length ? `
                    <div class="section-head"><div class="section-title">Книги автора</div></div>
                    <div class="profile-grid">${booksByUser.map(bookCardHTML).join('')}</div>
                ` : ''}
                ${communities.length ? `
                    <div class="section-head" style="margin-top:40px"><div class="section-title">Сообщества</div></div>
                    <div class="communities-grid">${communities.map(communityCardHTML).join('')}</div>
                ` : ''}
            </div>
        </div>
    `;
    const editBtn = document.getElementById('editProfileBtn');
    if (editBtn) editBtn.addEventListener('click', openEditProfile);
    const addBtn = document.getElementById('addFriendBtn');
    if (addBtn) addBtn.addEventListener('click', async () => {
        try {
            await apiSendFriendRequest(user.id || username);
            showToast('Заявка отправлена', 'success');
            await loadFriendsData();
            render();
        } catch(e) { showToast('Ошибка: ' + e.message, 'error'); }
    });
    const unfriendBtn = document.getElementById('unfriendBtn');
    if (unfriendBtn) unfriendBtn.addEventListener('click', async () => {
        if (!confirm('Удалить из друзей?')) return;
        try {
            await apiRemoveFriend(user.id || username);
            showToast('Удалён из друзей', 'success');
            await loadFriendsData();
            render();
        } catch(e) { showToast('Ошибка: ' + e.message, 'error'); }
    });
    const cancelOutgoingBtn = document.getElementById('cancelOutgoingBtn');
    if (cancelOutgoingBtn) cancelOutgoingBtn.addEventListener('click', async () => {
        try {
            await apiRemoveFriend(user.id || username);
            showToast('Заявка отозвана', 'success');
            await loadFriendsData();
            render();
        } catch(e) { showToast('Ошибка: ' + e.message, 'error'); }
    });
    const acceptFriendBtn = document.getElementById('acceptFriendBtn');
    if (acceptFriendBtn) acceptFriendBtn.addEventListener('click', async () => {
        try {
            await apiAcceptFriend(user.id || username);
            showToast('Заявка принята', 'success');
            await loadFriendsData();
            renderTopbarUser();
            render();
        } catch(e) { showToast('Ошибка: ' + e.message, 'error'); }
    });
    const writeBtn = document.getElementById('writeBtn');
    if (writeBtn) writeBtn.addEventListener('click', async () => {
        const chat = await getOrCreateDM(me.username, username);
        currentChatId = chat.id;
        navigate('messages', { chatId: chat.id });
    });
    attachBookClickHandlers();
    attachCommunityHandlers();
}

function communityCardHTML(c) {
    const me = getCurrentUser();
    const isMember = c.members && me && c.members.includes(me.username);
    const count = c.membersCount || (c.members ? c.members.length : 0);
    return `
        <div class="community-card" data-comm-id="${escapeAttr(c.id)}">
            <div class="community-head">
                <div class="community-avatar">${c.avatar ? `<img src="${escapeAttr(c.avatar)}" alt="">` : '#'}</div>
                <div style="flex:1;min-width:0">
                    <div class="community-title">${escapeHtml(c.title)}</div>
                    <div class="community-meta">@${escapeHtml(c.username)}</div>
                </div>
            </div>
            <div class="community-desc">${escapeHtml(c.desc)}</div>
            <div class="community-footer">
                <span class="community-member-badge">${count} ${plural(count, 'участник', 'участника', 'участников')}</span>
                ${isMember ? `<span class="community-member-badge" style="color:var(--online);border-color:var(--online)">вы участник</span>` : ''}
                <span style="margin-left:auto;color:var(--accent);font-family:var(--font-head);font-size:.72rem;letter-spacing:1px">Открыть →</span>
            </div>
        </div>
    `;
}

function attachCommunityHandlers() {
    document.querySelectorAll('.community-card').forEach(card => {
        card.addEventListener('click', () => {
            currentCommunityId = card.dataset.commId;
            navigate('community', { communityId: currentCommunityId });
        });
    });
}

/* ---------- СООБЩЕСТВА ---------- */
async function renderCommunitiesPage() {
    const user = getCurrentUser();
    if (_communitiesCache.length === 0) await loadCommunitiesCache();
    const communities = _communitiesCache.slice().sort((a,b) => b.createdAt - a.createdAt);
    app.innerHTML = `
        <div class="container">
            <section class="section" style="padding-top:60px">
                <div class="section-head">
                    <div class="section-title">Сообщества</div>
                    ${user ? `<button class="btn btn-primary" id="newCommunityBtn">+ Создать сообщество</button>` : ''}
                </div>
                ${communities.length ? `<div class="communities-grid">${communities.map(communityCardHTML).join('')}</div>` : `<div class="empty">Пока нет сообществ. Создайте первое!</div>`}
            </section>
        </div>
    `;
    if (user) {
        document.getElementById('newCommunityBtn').addEventListener('click', () => {
            document.getElementById('newCommunityOverlay').classList.add('active');
        });
    }
    attachCommunityHandlers();
}

async function renderCommunityPage() {
    const id = navData.communityId || currentCommunityId;
    let comm;
    try { comm = await apiGetCommunity(id); }
    catch(e) { showToast('Сообщество не найдено', 'error'); navigate('communities'); return; }
    if (!comm) { navigate('communities'); return; }
    const me = getCurrentUser();
    const isMember = await apiIsJoinedCommunity(id);
    const isOwner = me && comm.owner === (me.id || me.username);
    const members = await apiGetCommunityMembers(id);
    const memberUsernames = members.map(u => u.username);
    const cached = _communitiesCache.find(c => c.id === id);
    if (cached) { cached.members = memberUsernames; cached.membersCount = members.length; }
    app.innerHTML = `
        <div class="container">
            <div class="community-page">
                <button class="btn btn-ghost btn-sm" onclick="navigate('communities')" style="margin-bottom:24px">← К сообществам</button>
                <div class="community-page-head">
                    <div class="community-page-avatar">${comm.avatar ? `<img src="${escapeAttr(comm.avatar)}" alt="">` : '#'}</div>
                    <div class="community-page-info">
                        <div class="community-page-title">${escapeHtml(comm.title)}</div>
                        <div class="community-page-username">@${escapeHtml(comm.username)} · ${members.length} ${plural(members.length, 'участник', 'участника', 'участников')}</div>
                        <div class="community-page-desc">${escapeHtml(comm.desc)}</div>
                        <div style="display:flex;gap:8px;flex-wrap:wrap">
                            ${me && !isMember ? `<button class="btn btn-primary" id="joinBtn">Вступить</button>` : ''}
                            ${isMember && !isOwner ? `<button class="btn btn-danger" id="leaveBtn">Покинуть</button>` : ''}
                            ${isMember ? `<button class="btn" id="openChatBtn">Открыть чат</button>` : ''}
                            ${isOwner ? `<span class="community-member-badge" style="color:var(--accent);border-color:var(--accent)">вы владелец</span>` : ''}
                        </div>
                    </div>
                </div>
                <div class="community-tabs">
                    <button class="community-tab ${currentCommunityTab === 'chat' ? 'active' : ''}" data-ctab="chat">Чат</button>
                    <button class="community-tab ${currentCommunityTab === 'members' ? 'active' : ''}" data-ctab="members">Участники</button>
                    <button class="community-tab ${currentCommunityTab === 'about' ? 'active' : ''}" data-ctab="about">О сообществе</button>
                </div>
                <div id="communityContent"></div>
            </div>
        </div>
    `;
    const joinBtn = document.getElementById('joinBtn');
    if (joinBtn) joinBtn.addEventListener('click', async () => {
        try {
            await apiJoinCommunity(id);
            await loadCommunitiesCache();
            showToast('Вы вступили в сообщество', 'success');
            render();
        } catch(e) { showToast('Ошибка: ' + e.message, 'error'); }
    });
    const leaveBtn = document.getElementById('leaveBtn');
    if (leaveBtn) leaveBtn.addEventListener('click', async () => {
        if (!confirm('Покинуть сообщество?')) return;
        try {
            await apiLeaveCommunity(id);
            await loadCommunitiesCache();
            showToast('Вы покинули сообщество');
            render();
        } catch(e) { showToast('Ошибка: ' + e.message, 'error'); }
    });
    const openChatBtn = document.getElementById('openChatBtn');
    if (openChatBtn) openChatBtn.addEventListener('click', () => {
        const chat = getOrCreateCommunityChat(id);
        currentChatId = chat.id;
        chatTab = 'communities';
        navigate('messages', { chatId: chat.id });
    });
    document.querySelectorAll('.community-tab').forEach(t => {
        t.addEventListener('click', () => { currentCommunityTab = t.dataset.ctab; render(); });
    });
    const content = document.getElementById('communityContent');
    if (currentCommunityTab === 'chat') {
        if (!isMember) {
            content.innerHTML = `<div class="empty">Чат доступен только участникам. Вступите в сообщество!</div>`;
        } else {
            const chat = getOrCreateCommunityChat(id);
            const msgs = getMessages(chat.id);
            content.innerHTML = `
                <div class="card">
                    <div id="communityChat" style="max-height:500px;overflow-y:auto;display:flex;flex-direction:column;gap:10px;margin-bottom:16px">
                        ${msgs.length ? msgs.map(m => {
                            const isMine = me && m.from === me.username;
                            return `<div class="msg ${isMine ? 'msg-out' : 'msg-in'}">
                                ${!isMine ? `<div class="msg-author">${escapeHtml(displayName(m.from))}</div>` : ''}
                                ${escapeHtml(m.text)}
                                <div class="msg-time">${formatTime(m.at)}</div>
                            </div>`;
                        }).join('') : '<div style="text-align:center;color:var(--text3);font-style:italic;padding:20px">Пока нет сообщений. Начните первым!</div>'}
                    </div>
                    <div style="display:flex;gap:10px">
                        <textarea id="commInput" placeholder="Написать..." rows="1" style="flex:1;padding:10px 14px;background:var(--card);color:var(--text);border:1px solid var(--border);border-radius:8px;font-family:var(--font-body);font-size:.95rem;resize:none;outline:none;max-height:100px"></textarea>
                        <button class="send-btn" id="commSendBtn">Отправить</button>
                    </div>
                </div>
            `;
            const input = document.getElementById('commInput');
            const btn = document.getElementById('commSendBtn');
            function send() {
                const text = input.value.trim();
                if (!text) return;
                sendMessage(chat.id, me.username, text);
                touchLastSeen(me.username);
                input.value = '';
                render();
                setTimeout(() => {
                    const box = document.getElementById('communityChat');
                    if (box) box.scrollTop = box.scrollHeight;
                }, 30);
            }
            btn.addEventListener('click', send);
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
            });
            setTimeout(() => {
                const box = document.getElementById('communityChat');
                if (box) box.scrollTop = box.scrollHeight;
            }, 30);
        }
    } else if (currentCommunityTab === 'members') {
        content.innerHTML = `
            <div style="display:grid;gap:8px">
                ${members.map(u => {
                    const online = isUserOnline(u.username);
                    return `
                        <div class="user-card" data-user="${escapeAttr(u.username)}">
                            ${avatarHTML(u, 'md')}
                            <div class="user-card-info">
                                <div class="user-card-name">${escapeHtml(u.displayName || u.username)} ${comm.owner === u.username || comm.owner === u.id ? '<span style="font-size:.65rem;color:var(--accent)">— владелец</span>' : ''}</div>
                                <div class="user-card-username">@${escapeHtml(u.handle || u.username)}</div>
                                <div class="user-card-status ${online ? 'online' : ''}">${online ? 'в сети' : 'не в сети'}</div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
        content.querySelectorAll('.user-card').forEach(c => {
            c.addEventListener('click', () => {
                currentProfileUser = c.dataset.user;
                navigate('profile');
            });
        });
    } else {
        content.innerHTML = `
            <div class="card" style="line-height:1.8">
                <p style="margin-bottom:14px"><strong style="color:var(--accent);font-family:var(--font-head);letter-spacing:1px">Описание</strong></p>
                <p style="white-space:pre-wrap;color:var(--text2)">${escapeHtml(comm.desc)}</p>
                <p style="margin-top:20px;color:var(--text3);font-size:.85rem;font-style:italic">Создано ${formatDate(comm.createdAt)}</p>
            </div>
        `;
    }
}

/* ====================== ВСПОМОГАТЕЛЬНОЕ ====================== */
function escapeHtml(s) {
    if (s == null) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function escapeAttr(s) { return escapeHtml(s); }
function truncate(s, n) { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; }
function formatDate(ts) {
    const d = new Date(ts);
    const m = ['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек'];
    return `${d.getDate()} ${m[d.getMonth()]} ${d.getFullYear()}`;
}
function formatTime(ts) {
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

/* ====================== ИНИЦИАЛИЗАЦИЯ ====================== */
function initGlobalListeners() {
    document.querySelectorAll('.nav-link').forEach(l => {
        l.addEventListener('click', () => navigate(l.dataset.page));
    });
    const brandBtn = document.getElementById('brandBtn');
    if (brandBtn) brandBtn.addEventListener('click', () => navigate('home'));

    document.getElementById('usersPanelClose').addEventListener('click', closeAllPanels);
    document.getElementById('friendsPanelClose').addEventListener('click', closeAllPanels);
    document.getElementById('usersBackdrop').addEventListener('click', closeAllPanels);
    document.getElementById('friendsBackdrop').addEventListener('click', closeAllPanels);

    document.querySelectorAll('.side-panel-tab[data-ftab]').forEach(t => {
        t.addEventListener('click', () => {
            friendsTab = t.dataset.ftab;
            document.querySelectorAll('.side-panel-tab[data-ftab]').forEach(x => x.classList.toggle('active', x === t));
            renderFriendsPanel();
        });
    });

    const usersSearchEl = document.getElementById('usersSearch');
    if (usersSearchEl) usersSearchEl.addEventListener('input', renderUsersPanel);
    const friendsSearchEl = document.getElementById('friendsSearch');
    if (friendsSearchEl) friendsSearchEl.addEventListener('input', renderFriendsPanel);

    document.querySelectorAll('.tab').forEach(t => {
        t.addEventListener('click', () => switchTab(t.dataset.tab));
    });
    document.querySelectorAll('[data-close]').forEach(b => {
        b.addEventListener('click', () => document.getElementById(b.dataset.close).classList.remove('active'));
    });
    ['authOverlay', 'googleOverlay', 'rulesOverlay', 'editProfileOverlay', 'newCommunityOverlay', 'logoutOverlay', 'deleteAccountOverlay'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('click', e => { if (e.target.id === id) e.currentTarget.classList.remove('active'); });
    });

    document.getElementById('logoutConfirmBtn').addEventListener('click', async () => {
        await apiLogout();
        document.getElementById('logoutOverlay').classList.remove('active');
        showToast('Вы вышли из аккаунта');
        currentChatId = null;
        currentProfileUser = null;
        renderTopbarUser();
        updateUnreadBadge();
        if (document.getElementById('friendsPanel').classList.contains('open')) renderFriendsPanel();
        navigate('home');
    });

    document.getElementById('registerForm').addEventListener('submit', async e => {
        e.preventDefault();
        const name = document.getElementById('regUser').value.trim();
        const handle = document.getElementById('regUsername').value.trim();
        const email = document.getElementById('regEmail').value.trim();
        const p1 = document.getElementById('regPass').value;
        const p2 = document.getElementById('regPass2').value;
        const err = document.getElementById('regError');
        err.textContent = '';
        if (name.length < 2) { err.textContent = 'Имя не короче 2 символов'; return; }
        if (!isValidUsername(handle)) { err.textContent = '@юзернейм: 2-20 символов, латиница, цифры, _'; return; }
        if (!isValidEmail(email)) { err.textContent = 'Введите корректный email'; return; }
        if (p1.length < 4) { err.textContent = 'Пароль не короче 4 символов'; return; }
        if (p1 !== p2) { err.textContent = 'Пароли не совпадают'; return; }
        try {
            await apiRegister({ username: handle.toLowerCase(), email, password: p1, displayName: name });
            await loadUsersCache();
            await loadFriendsData();
            closeAuth();
            showToast('Аккаунт создан! Добро пожаловать, ' + name + '!', 'success');
            renderTopbarUser();
            updateUnreadBadge();
            navigate('profile', { username: getCurrentUser().username });
        } catch(ex) { err.textContent = ex.message || 'Ошибка регистрации'; }
    });

    document.getElementById('loginForm').addEventListener('submit', async e => {
        e.preventDefault();
        const login = document.getElementById('loginUser').value.trim();
        const pass = document.getElementById('loginPass').value;
        const err = document.getElementById('loginError');
        err.textContent = '';
        if (!login) { err.textContent = 'Введите логин'; return; }
        if (!pass) { err.textContent = 'Введите пароль'; return; }
        try {
            await apiLogin({ login, password: pass });
            closeAuth();
            showToast('С возвращением, ' + displayName(getCurrentUser()) + '!', 'success');
            renderTopbarUser();
            updateUnreadBadge();
            navigate('home');
        } catch(ex) { err.textContent = ex.message || 'Неверный логин или пароль'; }
    });

    document.getElementById('googleBtn').addEventListener('click', () => {
        closeAuth();
        document.getElementById('googleOverlay').classList.add('active');
    });
    document.getElementById('googleForm').addEventListener('submit', e => {
        e.preventDefault();
        showToast('Вход через Google пока не подключён', 'error');
        document.getElementById('googleOverlay').classList.remove('active');
    });

    document.getElementById('avatarChooseBtn').addEventListener('click', () => {
        document.getElementById('avatarInput').click();
    });
    document.getElementById('avatarInput').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) { showToast('Файл слишком большой (макс 2 МБ)', 'error'); return; }
        const reader = new FileReader();
        reader.onload = (ev) => { editProfileAvatarData = ev.target.result; renderAvatarPreview(); };
        reader.readAsDataURL(file);
    });
    document.getElementById('avatarRemoveBtn').addEventListener('click', () => {
        editProfileAvatarData = null;
        renderAvatarPreview();
    });
    document.getElementById('editBio').addEventListener('input', (e) => {
        document.getElementById('bioCount').textContent = e.target.value.length;
    });
    document.getElementById('editProfileForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        showToast('Редактирование профиля — в следующем этапе', 'error');
        document.getElementById('editProfileOverlay').classList.remove('active');
    });
    document.getElementById('deleteAccountBtn').addEventListener('click', () => {
        showToast('Удаление аккаунта — в следующем этапе', 'error');
    });

    document.getElementById('communityAvatarChooseBtn').addEventListener('click', () => {
        document.getElementById('communityAvatarInput').click();
    });
    document.getElementById('communityAvatarInput').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) { showToast('Файл слишком большой (макс 2 МБ)', 'error'); return; }
        const reader = new FileReader();
        reader.onload = (ev) => {
            communityAvatarData = ev.target.result;
            const preview = document.getElementById('communityAvatarPreview');
            preview.innerHTML = `<img src="${escapeAttr(communityAvatarData)}" alt="">`;
        };
        reader.readAsDataURL(file);
    });
    document.getElementById('communityAvatarRemoveBtn').addEventListener('click', () => {
        communityAvatarData = null;
        document.getElementById('communityAvatarPreview').textContent = '#';
    });
    document.getElementById('communityDesc').addEventListener('input', (e) => {
        document.getElementById('communityDescCount').textContent = e.target.value.length;
    });
    document.getElementById('newCommunityForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const me = getCurrentUser();
        if (!me) { openAuth('login'); return; }
        const title = document.getElementById('communityTitle').value.trim();
        const username = document.getElementById('communityUsername').value.trim();
        const desc = document.getElementById('communityDesc').value.trim();
        const err = document.getElementById('newCommunityError');
        err.textContent = '';
        if (title.length < 3) { err.textContent = 'Название не короче 3 символов'; return; }
        if (!isValidCommunityUsername(username)) { err.textContent = '@юзернейм: 3-24 символа, латиница, цифры, _'; return; }
        if (isCommunityUsernameTaken(username)) { err.textContent = 'Такой @юзернейм сообщества уже занят'; return; }
        if (desc.length < 20) { err.textContent = 'Описание не короче 20 символов'; return; }
        let avatarUrl = null;
        if (communityAvatarData && communityAvatarData.startsWith('data:')) {
            try {
                const blob = await (await fetch(communityAvatarData)).blob();
                const file = new File([blob], 'avatar.jpg', { type: blob.type });
                const up = await apiUploadImage(file);
                avatarUrl = up.url;
            } catch (ex) { err.textContent = 'Ошибка загрузки аватара: ' + ex.message; return; }
        }
        try {
            const comm = await apiCreateCommunity({ title, username: username.toLowerCase(), description: desc, avatarUrl });
            await loadCommunitiesCache();
            document.getElementById('newCommunityOverlay').classList.remove('active');
            document.getElementById('newCommunityForm').reset();
            document.getElementById('communityAvatarPreview').textContent = '#';
            communityAvatarData = null;
            showToast('Сообщество создано!', 'success');
            currentCommunityId = comm.id;
            navigate('community', { communityId: comm.id });
        } catch(ex) { err.textContent = ex.message || 'Ошибка создания'; }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            ['authOverlay','googleOverlay','rulesOverlay','editProfileOverlay','newCommunityOverlay','logoutOverlay','deleteAccountOverlay'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.classList.remove('active');
            });
        }
    });

    initGlobalSearch();

setInterval(async () => {
    const user = getCurrentUser();
    if (user) {
        // Пингуем сервер — обновляем last_seen и подтягиваем свежие данные
        try {
            await api('/api/users/heartbeat', { method: 'POST' });
            await loadUsersCache();
        } catch(e) {}
    }
    renderTopbarUser();
    if (document.getElementById('usersPanel').classList.contains('open')) renderUsersPanel();
    if (document.getElementById('friendsPanel').classList.contains('open')) renderFriendsPanel();
    if (getCurrentUser()) updateUnreadBadge();
}, 30000);
}

/* ====================== СТАРТ ====================== */
(async function start() {
    await loadCurrentUser();
    if (_currentUser) {
        await Promise.all([
            loadBooks(),
            loadUsersCache(),
            loadFriendsData(),
        ]);
    }
    initGlobalListeners();
    await render();
    updateUnreadBadge();
    updateBookCounter();
})();
