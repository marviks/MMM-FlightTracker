const NodeHelper = require("node_helper");
const axios = require("axios");
const { XMLParser } = require("fast-xml-parser");

module.exports = NodeHelper.create({
    start: function () {
        console.log("MMM-FlightTracker helper started...");
        this.parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });
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
                if (!configFlight.date) return;

                // Simple string comparison works for YYYY-MM-DD
                if (configFlight.date < today) {
                    // Past flight, ignore
                    return;
                } else if (configFlight.date > today) {
                    // Future flight
                    trackedFlights.push({
                        flight_id: configFlight.flightNumber,
                        label: configFlight.label || configFlight.flightNumber,
                        status: "Upcoming",
                        schedule_time: null, // No time yet
                        arr_dep: null, // Unknown or irrelevant for now
                        airport: null,
                        date: configFlight.date
                    });
                    return;
                }

                // Today's flight: Find matching flight in API data
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
                        // Pass raw XML status object to access time/code on frontend
                        xmlStatus: match.status,
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

    formatTime: function (isoString) {
        if (!isoString) return "";
        const date = new Date(isoString);
        // Format to HH:mm in local time
        return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    },

    determineStatus: function (flight) {
        // Return only the status description, not the time.
        // Time will be formatted on the client side.

        let statusText = "";

        // Check for delayed
        if (flight.delayed === "Y") {
            statusText = "Delayed ";
        }

        if (flight.status && typeof flight.status === 'object') {
            const code = flight.status.code;

            if (code === 'A') statusText += "Landed";
            else if (code === 'D') statusText += "Departed";
            else if (code === 'C') statusText = "Cancelled";
            else if (code === 'E') statusText += "Estimated";
            else statusText += `Status: ${code}`;
        } else {
            if (!statusText) {
                statusText = "Scheduled";
            }
        }

        return statusText;
    }
});
