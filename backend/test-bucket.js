const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://eswtafixyuabadivaqms.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzd3RhZml4eXVhYmFkaXZhcW1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMjU1NTgsImV4cCI6MjA5NTkwMTU1OH0.Z_SeFAEcRfBkqp4N2EqT-_wwkXs5O9NrIureksYi_Ek'
);

async function checkBuckets() {
  const { data, error } = await supabase.storage.listBuckets();
  if (error) console.error('Error fetching buckets:', error.message);
  else {
      console.log('Buckets:', data.map(b => b.name));
      if (data.length === 0) {
          console.log("No buckets found. Creating 'easypg' bucket...");
          const res = await supabase.storage.createBucket('easypg', { public: true });
          console.log("Create result:", res.data || res.error);
      }
  }
}
checkBuckets();
