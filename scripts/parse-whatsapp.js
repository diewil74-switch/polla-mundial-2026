const fs = require('fs')
const path = require('path')

const chatPath = '/Users/diegowilches/Downloads/_chat.txt'
const outPath = path.join(__dirname, '../lib/whatsapp-stats.json')

const raw = fs.readFileSync(chatPath, 'utf8')

// Clean zero-width and RTL/LTR marks
const clean = raw.replace(/[‎‏‪-‮⁦-⁩﻿]/g, '').replace(/\r/g, '')

const lines = clean.split('\n')

// Parse: [DD/MM/YY, H:MM:SS PM] Name: message
const MSG_RE = /^\[(\d{1,2}\/\d{1,2}\/\d{2,4}), (\d{1,2}:\d{2}:\d{2})\s*(AM|PM|am|pm)?\] ([^:]+): ([\s\S]*)/

const SYSTEM_SENDERS = new Set(['Polla Mundial 2026'])
const SKIP_CONTENT = ['omitted', 'created group', 'added you', 'left', 'added ', 'changed the', 'You\'re now', 'end-to-end']

const messages = []
let currentMsg = null

for (const line of lines) {
  const m = MSG_RE.exec(line)
  if (m) {
    if (currentMsg) messages.push(currentMsg)
    const [, date, time, ampm, sender, content] = m
    const hour12 = parseInt(time.split(':')[0])
    const min = parseInt(time.split(':')[1])
    let hour24 = hour12
    if (ampm) {
      if (ampm.toUpperCase() === 'PM' && hour12 !== 12) hour24 = hour12 + 12
      if (ampm.toUpperCase() === 'AM' && hour12 === 12) hour24 = 0
    }
    currentMsg = { date, time, hour: hour24, minute: min, sender: sender.trim(), content: content.trim(), ampm: ampm ?? '' }
  } else if (currentMsg) {
    currentMsg.content += '\n' + line
  }
}
if (currentMsg) messages.push(currentMsg)

// Filter real messages (not system, not omitted-only)
const realMessages = messages.filter(msg => {
  if (SYSTEM_SENDERS.has(msg.sender)) return false
  const c = msg.content.toLowerCase()
  if (c.includes('image omitted') || c.includes('sticker omitted') ||
      c.includes('video omitted') || c.includes('gif omitted') ||
      c.includes('audio omitted') || c.includes('document omitted') ||
      c.includes('contact card omitted')) return false
  if (SKIP_CONTENT.some(s => c.includes(s.toLowerCase()))) return false
  return true
})

const allSenders = [...new Set(messages.filter(m => !SYSTEM_SENDERS.has(m.sender)).map(m => m.sender))]

// ─── Stats per user ───────────────────────────────────────────────
const userStats = {}
for (const sender of allSenders) {
  userStats[sender] = {
    total: 0, textMessages: 0, images: 0, stickers: 0, gifs: 0, videos: 0, audios: 0,
    totalWords: 0, longestMsg: 0, daysActive: new Set(), firstOfDay: 0,
  }
}

// Track media separately
for (const msg of messages) {
  if (SYSTEM_SENDERS.has(msg.sender)) continue
  const u = userStats[msg.sender]
  if (!u) continue
  u.total++
  const c = msg.content.toLowerCase()
  if (c.includes('image omitted')) u.images++
  else if (c.includes('sticker omitted')) u.stickers++
  else if (c.includes('gif omitted')) u.gifs++
  else if (c.includes('video omitted')) u.videos++
  else if (c.includes('audio omitted')) u.audios++
  else {
    u.textMessages++
    const wordCount = msg.content.replace(/<This message was edited>/g, '').trim().split(/\s+/).filter(Boolean).length
    u.totalWords += wordCount
    if (wordCount > u.longestMsg) u.longestMsg = wordCount
  }
  u.daysActive.add(msg.date)
}

// Who sends first each day
const byDate = {}
for (const msg of messages) {
  if (SYSTEM_SENDERS.has(msg.sender)) continue
  if (!byDate[msg.date]) byDate[msg.date] = []
  byDate[msg.date].push(msg)
}
for (const [, dayMsgs] of Object.entries(byDate)) {
  const first = dayMsgs[0]
  if (userStats[first.sender]) userStats[first.sender].firstOfDay++
}

// ─── Messages by date ─────────────────────────────────────────────
const msgsByDate = {}
for (const [date, dayMsgs] of Object.entries(byDate)) {
  msgsByDate[date] = dayMsgs.filter(m => !SYSTEM_SENDERS.has(m.sender)).length
}
const sortedDates = Object.keys(msgsByDate).sort((a, b) => {
  const [da, ma, ya] = a.split('/').map(Number)
  const [db, mb, yb] = b.split('/').map(Number)
  return (ya * 10000 + ma * 100 + da) - (yb * 10000 + mb * 100 + db)
})

// ─── Messages by hour ─────────────────────────────────────────────
const msgsByHour = new Array(24).fill(0)
for (const msg of messages) {
  if (SYSTEM_SENDERS.has(msg.sender)) continue
  msgsByHour[msg.hour]++
}

// ─── Top words ────────────────────────────────────────────────────
const STOP_WORDS = new Set(['que', 'de', 'la', 'el', 'en', 'y', 'a', 'los', 'se', 'del', 'las', 'un', 'una', 'con', 'no', 'es', 'lo', 'por', 'para', 'como', 'me', 'si', 'pero', 'su', 'al', 'le', 'más', 'mas', 'ya', 'o', 'e', 'muy', 'ha', 'mi', 'https', 'http', 'this', 'message', 'was', 'edited', 'yo', 'te', 'ese', 'eso', 'esa', 'fue', 'hay', 'ni', 'ti', 'todo', 'toda', 'todos', 'are', 'the', 'que', 'bien', 'este', 'esta', 'van', 'son', 'tiene', 'han', 'le', 'ahi', 'ahí', 'tan', 'tu', 'tú', 'tu', 'he', 'i', 'to', 'and'])
const wordCount = {}
for (const msg of realMessages) {
  const words = msg.content.toLowerCase().replace(/[^a-záéíóúüñ\s]/gi, ' ').split(/\s+/).filter(w => w.length > 3 && !STOP_WORDS.has(w))
  for (const w of words) {
    wordCount[w] = (wordCount[w] || 0) + 1
  }
}
const topWords = Object.entries(wordCount).sort(([, a], [, b]) => b - a).slice(0, 20).map(([word, count]) => ({ word, count }))

// ─── Finalize ─────────────────────────────────────────────────────
const finalUsers = Object.entries(userStats)
  .filter(([, u]) => u.total > 0)
  .map(([sender, u]) => ({
    sender,
    total: u.total,
    textMessages: u.textMessages,
    images: u.images,
    stickers: u.stickers,
    gifs: u.gifs,
    videos: u.videos,
    audios: u.audios,
    totalWords: u.totalWords,
    avgWordsPerMsg: u.textMessages > 0 ? Math.round(u.totalWords / u.textMessages) : 0,
    longestMsg: u.longestMsg,
    daysActive: u.daysActive.size,
    firstOfDay: u.firstOfDay,
  }))
  .sort((a, b) => b.total - a.total)

const totalDays = sortedDates.length
const totalMessages = finalUsers.reduce((s, u) => s + u.total, 0)
const mostActiveDays = [...sortedDates]
  .sort((a, b) => msgsByDate[b] - msgsByDate[a])
  .slice(0, 5)
  .map(d => ({ date: d, count: msgsByDate[d] }))

const stats = {
  totalMessages,
  totalDays,
  dateRange: { start: sortedDates[0], end: sortedDates[sortedDates.length - 1] },
  users: finalUsers,
  msgsByDate: sortedDates.map(d => ({ date: d, count: msgsByDate[d] })),
  msgsByHour: msgsByHour.map((count, hour) => ({ hour, count })),
  mostActiveDays,
  topWords,
}

fs.writeFileSync(outPath, JSON.stringify(stats, null, 2))
console.log(`✅ Stats generados: ${totalMessages} mensajes, ${finalUsers.length} usuarios, ${totalDays} días`)
console.log('Top users:')
finalUsers.slice(0, 5).forEach(u => console.log(`  ${u.sender}: ${u.total} msgs`))
