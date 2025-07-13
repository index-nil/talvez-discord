const http = require('http')
const fs = require('fs')
const path = require('path')
const WebSocket = require('ws')

const users = {}
const userColors = {}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    return res.end()
  }

  if (req.method === 'POST' && (req.url === '/login' || req.url === '/signup')) {
    let body = ''
    req.on('data', chunk => body += chunk)
    req.on('end', () => {
      try {
        const { username, password, color } = JSON.parse(body)
        console.log(`[${new Date().toISOString()}] ${req.url.toUpperCase()} attempt - username: ${username}`)

        if (!username || !password) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          console.log('-> Missing username or password')
          return res.end(JSON.stringify({ success: false, message: 'Missing username or password' }))
        }

        if (req.url === '/signup') {
          if (users[username]) {
            res.writeHead(409, { 'Content-Type': 'application/json' })
            console.log('-> Username already exists')
            return res.end(JSON.stringify({ success: false, message: 'Username already exists' }))
          }
          users[username] = password
          userColors[username] = color || '#000000'
          console.log('-> Signup success')
          res.writeHead(200, { 'Content-Type': 'application/json' })
          return res.end(JSON.stringify({ success: true }))
        }

        if (req.url === '/login') {
          if (users[username] !== password) {
            res.writeHead(401, { 'Content-Type': 'application/json' })
            console.log('-> Invalid username or password')
            return res.end(JSON.stringify({ success: false, message: 'Invalid username or password' }))
          }
          const userColor = userColors[username] || '#000000'
          console.log('-> Login success')
          res.writeHead(200, { 'Content-Type': 'application/json' })
          return res.end(JSON.stringify({ success: true, color: userColor }))
        }
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        console.log('-> Invalid JSON:', err.message)
        res.end(JSON.stringify({ success: false, message: 'Invalid JSON' }))
      }
    })
    return
  }

  const filePath = path.join(__dirname, 'public', req.url === '/' ? 'index.html' : req.url)
  const ext = path.extname(filePath)
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css'
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404)
      console.log(`[${new Date().toISOString()}] 404 Not found: ${req.url}`)
      return res.end('Not found')
    }
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' })
    res.end(data)
  })
})

const wss = new WebSocket.Server({ server })

wss.on('connection', socket => {
  console.log(`[${new Date().toISOString()}] WebSocket client connected`)

  socket.on('message', msg => {
    console.log(`[${new Date().toISOString()}] WebSocket message: ${msg}`)

    try {
      const { username, text, color } = JSON.parse(msg)
      const messageData = JSON.stringify({ username, text, color })

      for (const client of wss.clients) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(messageData)
        }
      }
    } catch {
      for (const client of wss.clients) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(msg)
        }
      }
    }
  })

  socket.on('close', () => {
    console.log(`[${new Date().toISOString()}] WebSocket client disconnected`)
  })
})

server.listen(3000, () => console.log('Server running at http://localhost:3000'))
