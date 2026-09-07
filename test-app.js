async function fireConcurrentRequests() {
    const url = 'http://localhost:3000/api/hold-seat'; // Adjust route to match yours
    const payload = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seatId: '38472a4b-4411-4989-9eae-b6be7354991b' })
    };

    const requests = Array.from({length: 10}, () => fetch(url, payload));

    console.log("Firing 10 simultaneous requests...");
    const responses = await Promise.all(requests);
    
    for (const res of responses) {
        const data = await res.json();
        console.log(`Status: ${res.status} | Response:`, data);
    }

}

fireConcurrentRequests();