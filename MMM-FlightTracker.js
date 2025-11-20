Module.register("MMM-FlightTracker", {
    defaults: {
        updateInterval: 3 * 60 * 1000, // 3 minutes
        homeAirport: "OSL",
        flights: []
    },

    start: function () {
        Log.info("Starting module: " + this.name);
        this.flights = [];
        this.sendSocketNotification("CONFIG", this.config);
    },

    getStyles: function () {
        return ["MMM-FlightTracker.css"];
    },

    getHeader: function () {
        return "Flight Tracker";
    },

    getDom: function () {
        var wrapper = document.createElement("div");
        wrapper.className = "flight-tracker-wrapper";

        if (this.flights.length === 0) {
            wrapper.innerHTML = "No active flights tracked.";
            wrapper.className += " dimmed light small";
            return wrapper;
        }

        var list = document.createElement("ul");
        list.className = "flight-list";

        this.flights.forEach(flight => {
            var item = document.createElement("li");
            item.className = "flight-item";

            // Determine icon based on status
            var icon = "fa-plane";
            if (flight.statusText && flight.statusText.includes("Landed")) icon = "fa-plane-arrival";
            if (flight.statusText && flight.statusText.includes("Departed")) icon = "fa-plane-departure";

            // Route:
            // flight.arr_dep: 'A' = Arrival (to homeAirport), 'D' = Departure (from homeAirport)
            // flight.airport: The remote airport code.
            var home = this.config.homeAirport;
            var remote = flight.airport || "???";
            var routeStr = "";

            if (flight.arr_dep === 'A') {
                routeStr = `${remote} <i class="fa fa-long-arrow-right"></i> ${home}`;
                if (!icon.includes("arrival")) icon = "fa-plane-arrival"; // Ensure icon matches
            } else if (flight.arr_dep === 'D') {
                routeStr = `${home} <i class="fa fa-long-arrow-right"></i> ${remote}`;
                if (!icon.includes("departure")) icon = "fa-plane-departure";
            } else {
                routeStr = `${remote} <-> ${home}`;
            }

            // Time Formatting (Client-side for correct timezone)
            var timeStr = "";
            var rawTime = null;

            // Check if we have a status time (actual event time)
            if (flight.status && flight.status.time) {
                rawTime = flight.status.time;
            } else {
                // Fallback to schedule time
                rawTime = flight.schedule_time;
            }

            if (rawTime) {
                var date = new Date(rawTime);
                timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            }

            var statusDisplay = flight.statusText || "Scheduled";
            if (timeStr) {
                statusDisplay += ` @ ${timeStr}`;
            }

            // Display
            item.innerHTML = `
        <div class="flight-main">
          <span class="flight-label bright">${flight.label}</span>
          <span class="flight-id xsmall dimmed">${flight.flight_id}</span>
        </div>
        <div class="flight-details small">
          <span class="flight-status"><i class="fa ${icon}"></i> ${statusDisplay}</span>
          <span class="flight-route dimmed">${routeStr}</span>
        </div>
      `;
            list.appendChild(item);
        });

        wrapper.appendChild(list);
        return wrapper;
    },

    socketNotificationReceived: function (notification, payload) {
        if (notification === "FLIGHT_DATA") {
            this.flights = payload;
            this.updateDom();
        }
    }
});
