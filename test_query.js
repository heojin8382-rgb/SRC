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

async function test() {
  console.log('Testing if merge_preseeded_profile RPC exists...');
  const { data, error } = await supabase
    .rpc('merge_preseeded_profile', { 
      new_user_id: 'd1000000-0000-0000-0000-000000000000', 
      user_nickname: 'Test' 
    });

  if (error) {
    console.error('RPC Error:', error);
  } else {
    console.log('RPC Success! Return value:', data);
  }
}

test();

