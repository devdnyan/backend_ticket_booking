async function fireConcurrentRequests() {
    const url = 'http://localhost:3000/api/hold-seat'; // Adjust route to match yours
    const payload = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seatId: '0be3044f-5238-4493-9857-8d1afa777834' })
    };

    const requests = Array.from({length: 10}, () => 
        fetch(url, payload).then(async(res) => {
            const data = await res.json();
            console.log(`Status: ${res.status} | Response:`, data);
        }));

    console.log("Firing 10 simultaneous requests...");
    await Promise.all(requests);
}

fireConcurrentRequests();