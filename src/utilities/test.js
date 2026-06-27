const TARGET_URL = 'http://localhost:3000/api/v1/bookings';
const PATIENT_ID = '77eafe1c-565e-4feb-8096-ed39fd742177'; 

// ⚠️ PASTE A FRESH, AVAILABLE SLOT ID FROM POSTMAN HERE TO RESET THE TEST!
const ACTIVE_SLOT_ID = '1e96ba53-716f-4075-8166-6483f557ef5a'; 

async function runHighConcurrencyStressTest() {
  console.log('============= STARTING HIGH-CONCURRENCY RACE CONDITION TEST =============');
  console.log(`Firing 10 simultaneous booking requests for Slot ID: ${ACTIVE_SLOT_ID}...\n`);

  const requests = Array.from({ length: 10 }).map((_, index) => {
    return fetch(TARGET_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slotId: ACTIVE_SLOT_ID,
        patientId: PATIENT_ID
      })
    })
    .then(async (res) => {
      const data = await res.json();
      return { status: res.status, message: data.message };
    })
    .catch((err) => ({ status: 'FAILED', message: err.message }));
  });

  const results = await Promise.all(requests);

  let successCount = 0;
  let conflictCount = 0;
  let otherCount = 0;

  results.forEach((res, i) => {
    console.log(`Request #${i + 1}: HTTP Status [${res.status}] | Response: ${res.message}`);
    if (res.status === 201) successCount++;
    else if (res.status === 409) conflictCount++;
    else otherCount++;
  });

  console.log('\n============= TEST EXECUTION SUMMARY =============');
  console.log(`✅ Successful Bookings (201 Created): ${successCount}`);
  console.log(`🛡️ Safely Blocked Conflicts (409 Conflict): ${conflictCount}`);
  console.log(`⚠️ Other Mismatches: ${otherCount}`);
  
  if (successCount === 1 && conflictCount === 9) {
    console.log('\n🏆 SUCCESS: Row-level locking validated! Exactly one user won the slot, and race conditions were totally eliminated.');
  } else if (successCount === 0 && conflictCount === 10) {
    console.log('\nℹ️ NOTE: This slot was already booked in a previous run. Get a fresh slot ID from Postman to watch the 1-to-9 split happen live!');
  } else {
    console.error('\n❌ FAILURE: Concurrency breach or unhandled response states.');
  }
}

runHighConcurrencyStressTest();