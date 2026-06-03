const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function check() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, nickname, real_name, role, can_view_admin, can_edit_admin');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Profiles in DB:', data.length);
  data.forEach(p => {
    console.log(`- ${p.nickname} (Real: ${p.real_name}): Role=${p.role}, can_view=${p.can_view_admin}, can_edit=${p.can_edit_admin}`);
  });
}

check();
