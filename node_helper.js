const NodeHelper = require("node_helper");
const axios = require("axios");
const { XMLParser } = require("fast-xml-parser");

module.exports = NodeHelper.create({
    start: function () {
        console.log("MMM-FlightTracker helper started...");
        this.parser = new XMLParser();
    },

    socketNotificationReceived: function (notification, payload) {
        if (notification === "CONFIG") {
            this.config = payload;
            this.fetchFlightData();
            setInterval(() => {
                this.fetchFlightData();
            }, this.config.updateInterval);
        }
    },

    fetchFlightData: async function () {
        if (!this.config) return;

        const { homeAirport, flights } = this.config;
        // Avinor API parameters
        // TimeFrom=1 (1 hour back), TimeTo=24 (24 hours forward) - adjust as needed
        // We need to cover enough time to catch flights for the current day.
        // The user wants to track flights "active" on the given date.
        // Let's grab a wider window to be safe, e.g., -4 to +24 hours.
        const url = "https://asrv.avinor.no/XmlFeed/v1.0";
        const params = {
            airport: homeAirport,
            TimeFrom: 4,
            TimeTo: 24
        };

        try {
            const response = await axios.get(url, { params });
            const xmlData = response.data;

            // Parse XML
            const parsed = this.parser.parse(xmlData);

            if (!parsed.airport || !parsed.airport.flights || !parsed.airport.flights.flight) {
                console.log("No flights found in API response");
                this.sendSocketNotification("FLIGHT_DATA", []);
                return;
            }

            let allFlights = parsed.airport.flights.flight;
            // Ensure it's an array (fast-xml-parser might return object for single item)
            if (!Array.isArray(allFlights)) {
                allFlights = [allFlights];
            }

            // Filter flights
            const trackedFlights = [];
            const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

            flights.forEach(configFlight => {
                // Check if flight is active today
                if (configFlight.date && configFlight.date !== today) {
                    return;
                }

                // Find matching flight in API data
                // API flightId usually looks like "SK4167"
                // We match against configFlight.flightNumber
                const match = allFlights.find(f => f.flight_id === configFlight.flightNumber);

                if (match) {
                    // Enrich with label from config
                    trackedFlights.push({
                        ...match,
                        label: configFlight.label || match.flight_id,
                        // Normalize status
                        status: this.determineStatus(match),
                        // Ensure arr_dep is passed explicitly if needed, though ...match covers it
                    });
                }
            });

            console.log(`Found ${trackedFlights.length} tracked flights.`);
            this.sendSocketNotification("FLIGHT_DATA", trackedFlights);

        } catch (error) {
            console.error("Error fetching flight data:", error.message);
        }
    },

    determineStatus: function (flight) {
        // Avinor XML:
        // <status code="A" time="2023-..." /> OR just empty <status />
        // fast-xml-parser: if attributes, it's an object. If empty, it's "".

        let statusText = "";

        // Check for delayed
        if (flight.delayed === "Y") {
            statusText = "Delayed ";
        }

        if (flight.status && typeof flight.status === 'object') {
            const code = flight.status.code;
            const time = flight.status.time;
            const timeStr = time ? '@ ' + time.substring(11, 16) : '';

            if (code === 'A') statusText += `Landed ${timeStr}`;
            else if (code === 'D') statusText += `Departed ${timeStr}`;
            else if (code === 'C') statusText = "Cancelled"; // Override delayed if cancelled
            else if (code === 'E') statusText += `Estimated ${timeStr}`;
            else statusText += `Status: ${code}`;
        } else {
            // No status update, show schedule
            // If delayed but no new time?
            if (!statusText) {
                statusText = `Scheduled ${flight.schedule_time ? flight.schedule_time.substring(11, 16) : ''}`;
            }
        }

        return statusText;
    }
});
