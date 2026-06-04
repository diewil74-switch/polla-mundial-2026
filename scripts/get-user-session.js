// Script temporal para obtener un link de acceso directo
// Ejecutar con: node scripts/get-user-session.js

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load .env.local manually
const envPath = path.join(__dirname, '..', '.env.local')
const envContent = fs.readFileSync(envPath, 'utf-8')
const env = {}
envContent.split('\n').forEach(line => {
  const [key, ...values] = line.split('=')
  if (key && values.length) {
    env[key.trim()] = values.join('=').trim()
  }
})

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function getUserEmail(username) {
  const { data, error } = await supabase
    .from('profiles')
    .select('email')
    .eq('display_name', username)
    .single()

  if (error) {
    console.error('Error:', error.message)
    return null
  }

  return data.email
}

async function generateMagicLink(email) {
  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: email,
    options: {
      redirectTo: 'http://localhost:3000/dev-login'
    }
  })

  if (error) {
    console.error('Error generando magic link:', error.message)
    return
  }

  const link = data.properties?.action_link
  console.log('\n✅ Link de acceso directo (ábrelo en el navegador):')
  console.log('\n' + link + '\n')
}

async function main() {
  const username = process.argv[2] || 'chatas1'

  console.log(`\nBuscando email para usuario: ${username}...\n`)

  const email = await getUserEmail(username)

  if (!email) {
    console.log('❌ Usuario no encontrado\n')
    return
  }

  console.log(`Email encontrado: ${email}`)

  await generateMagicLink(email)
}

main()
