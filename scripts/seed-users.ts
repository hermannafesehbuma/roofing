// One-time script to seed test users via Supabase Admin Auth API
// Run with: npx tsx scripts/seed-users.ts

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

const testUsers = [
  {
    email: 'admin@peakroofing.com',
    password: 'password123',
    first_name: 'John',
    last_name: 'Doe',
    role: 'admin',
  },
  {
    email: 'manager@peakroofing.com',
    password: 'password123',
    first_name: 'Karen',
    last_name: 'Brooks',
    role: 'manager',
  },
  {
    email: 'crew@peakroofing.com',
    password: 'password123',
    first_name: 'Troy',
    last_name: 'Shaw',
    role: 'technician',
  },
  {
    email: 'client@peakroofing.com',
    password: 'password123',
    first_name: 'Johnson',
    last_name: 'Family',
    role: 'client',
  },
]

async function seedUsers() {
  console.log('🔧 Seeding test users...\n')

  for (const user of testUsers) {
    // 1. Create user in auth.users via Admin API
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: {
        first_name: user.first_name,
        last_name: user.last_name,
      },
    })

    if (authError) {
      if (authError.message.includes('already been registered')) {
        console.log(`⚠️  ${user.email} already exists in auth, skipping auth creation.`)
        
        // Still try to ensure public.users row exists
        const { data: existingAuth } = await supabase.auth.admin.listUsers()
        const existingUser = existingAuth?.users?.find((u: any) => u.email === user.email)
        
        if (existingUser) {
          const { error: publicError } = await supabase
            .from('users')
            .upsert({
              supabase_id: existingUser.id,
              email: user.email,
              first_name: user.first_name,
              last_name: user.last_name,
              role: user.role,
              status: 'active',
            }, { onConflict: 'supabase_id' })

          if (publicError) {
            console.log(`   ❌ Failed to upsert public.users: ${publicError.message}`)
          } else {
            console.log(`   ✅ public.users row ensured for ${user.email} (role: ${user.role})`)
          }
        }
        continue
      }

      console.log(`❌ Failed to create ${user.email}: ${authError.message}`)
      continue
    }

    console.log(`✅ Created auth user: ${user.email} (id: ${authData.user.id})`)

    // 2. Insert into public.users table with role
    const { error: publicError } = await supabase
      .from('users')
      .upsert({
        supabase_id: authData.user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        status: 'active',
      }, { onConflict: 'supabase_id' })

    if (publicError) {
      console.log(`   ❌ Failed to insert public.users: ${publicError.message}`)
    } else {
      console.log(`   ✅ public.users row created (role: ${user.role})`)
    }
  }

  console.log('\n🎉 Done! Test accounts:')
  console.log('   admin@peakroofing.com   / password123  (admin)')
  console.log('   manager@peakroofing.com / password123  (manager)')
  console.log('   crew@peakroofing.com    / password123  (crew/staff)')
  console.log('   client@peakroofing.com  / password123  (client)')
}

seedUsers().catch(console.error)
