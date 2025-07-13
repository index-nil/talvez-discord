const apiUrl = 'https://73ce15c8fd22.ngrok-free.app'

const loginModal = document.getElementById('loginModal')
const chatContainer = document.getElementById('chatContainer')
const submitBtn = document.getElementById('submitBtn')
const usernameInput = document.getElementById('username')
const passwordInput = document.getElementById('password')
const repeatPasswordInput = document.getElementById('repeatPassword')
const colorInput = document.getElementById('color')
const messageP = document.getElementById('message')
const tabLogin = document.getElementById('tabLogin')
const tabSignup = document.getElementById('tabSignup')

let mode = 'login'

tabLogin.onclick = () => {
  mode = 'login'
  tabLogin.classList.add('active')
  tabSignup.classList.remove('active')
  submitBtn.textContent = 'Login'
  colorInput.style.display = 'none'
  repeatPasswordInput.style.display = 'none'
  messageP.textContent = ''
}

tabSignup.onclick = () => {
  mode = 'signup'
  tabSignup.classList.add('active')
  tabLogin.classList.remove('active')
  submitBtn.textContent = 'Signup'
  colorInput.style.display = 'block'
  repeatPasswordInput.style.display = 'block'
  messageP.textContent = ''
}

submitBtn.onclick = async () => {
  const username = usernameInput.value.trim()
  const password = passwordInput.value.trim()
  const repeatPassword = repeatPasswordInput.value.trim()
  const color = colorInput.value || '#000000'

  if (!username || !password) {
    messageP.textContent = 'Fill both username and password'
    return
  }

  if (mode === 'signup' && password !== repeatPassword) {
    messageP.textContent = "Passwords don't match"
    return
  }

  try {
    const res = await fetch(`${apiUrl}/${mode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, color })
    })
    const data = await res.json()
    if (data.success) {
      loginModal.classList.add('hidden')
      chatContainer.style.display = 'flex'
      startChat(username, data.color || color)
    } else {
      messageP.textContent = data.message || 'Error'
    }
  } catch {
    messageP.textContent = 'Network error'
  }
}

function startChat(username, userColor) {
  const messages = document.getElementById('messages')
  const input = document.getElementById('msgInput')

  const wsProtocol = apiUrl.startsWith('https') ? 'wss://' : 'ws://'
  const wsHost = apiUrl.replace(/^https?:\/\//, '')

  const socket = new WebSocket(wsProtocol + wsHost)

  socket.onmessage = e => {
    if (e.data instanceof Blob) {
      const reader = new FileReader()
      reader.onload = () => showMessage(reader.result)
      reader.readAsText(e.data)
    } else {
      showMessage(e.data)
    }
  }

  socket.onopen = () => {
    console.log('Connected to WebSocket server')
  }

  function showMessage(data) {
    let parsed
    try {
      parsed = JSON.parse(data)
    } catch {
      parsed = null
    }

    const msg = document.createElement('div')
    msg.classList.add('message')
    if (parsed && parsed.username && parsed.text) {
      msg.innerHTML = `<strong style="color:${parsed.color || '#00f'}">${escapeHtml(parsed.username)}:</strong> ${escapeHtml(parsed.text)}`
    } else {
      msg.textContent = data
    }
    messages.appendChild(msg)
    messages.scrollTop = messages.scrollHeight
  }

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && input.value.trim()) {
      const messageObj = { username, text: input.value.trim(), color: userColor }
      socket.send(JSON.stringify(messageObj))
      input.value = ''
    }
  })
}

function escapeHtml(text) {
  return text.replace(/[&<>"']/g, m => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[m])
}
