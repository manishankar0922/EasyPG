const axios = require('axios');
axios.post('http://localhost:4000/api/superadmin/organisations', {
  "orgName": "Test Org",
  "ownerName": "Test Owner",
  "ownerPhone": "9999999999",
  "ownerEmail": "test@example.com",
  "ownerAddress": "Test Address",
  "branches": [
    {
      "name": "Branch 1",
      "address": "Branch Address",
      "floors": [
        {
          "floorNumber": 1,
          "rooms": [
            {
              "roomName": "101",
              "bedCount": 3,
              "rentPerBed": 5000
            }
          ]
        }
      ]
    }
  ]
}).then(res => console.log("SUCCESS:", res.data))
  .catch(err => console.log("ERROR:", err.response ? err.response.data : err.message));
