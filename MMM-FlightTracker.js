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

            // Determine icon and status text
            var icon = "fa-plane";
            var statusText = flight.status || "Scheduled"; // 'status' from node_helper is the text description

            if (statusText === "Upcoming") {
                icon = "fa-calendar";
            } else if (statusText.includes("Landed")) {
                icon = "fa-plane-arrival";
            } else if (statusText.includes("Departed")) {
                icon = "fa-plane-departure";
            } else if (statusText.includes("Cancelled")) {
                icon = "fa-ban";
            } else if (statusText.includes("Estimated") || statusText.includes("Delayed")) {
                icon = "fa-clock";
            }

            // Route
            var home = this.config.homeAirport;
            var remote = flight.airport || "???";
            var routeStr = "";

            if (statusText === "Upcoming") {
                routeStr = ""; // No route info for future flights usually, or we could show just the flight number if not shown elsewhere
            } else if (flight.arr_dep === 'A') {
                routeStr = `${remote} <i class="fa fa-long-arrow-right"></i> ${home}`;
            } else if (flight.arr_dep === 'D') {
                routeStr = `${home} <i class="fa fa-long-arrow-right"></i> ${remote}`;
            } else {
                routeStr = `${remote} <-> ${home}`;
            }

            // Time Formatting
            const formatTime = (isoString) => {
                if (!isoString) return "";
                return new Date(isoString).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            };

            var timeDisplay = "";

            if (statusText === "Upcoming") {
                // For upcoming flights, display the date
                timeDisplay = flight.date;
            } else {
                var scheduleTimeFormatted = formatTime(flight.schedule_time);

                // Check for new time in xmlStatus
                if (flight.xmlStatus && flight.xmlStatus.time) {
                    var newTimeFormatted = formatTime(flight.xmlStatus.time);

                    // If times differ, show old (strikethrough) and new
                    if (newTimeFormatted !== scheduleTimeFormatted) {
                        timeDisplay = `<span style="text-decoration: line-through; opacity: 0.6;">${scheduleTimeFormatted}</span> ${newTimeFormatted}`;
                    } else {
                        timeDisplay = newTimeFormatted;
                    }
                } else {
                    timeDisplay = scheduleTimeFormatted;
                }
            }

            // Construct HTML
            item.innerHTML = `
        <div class="flight-main">
          <span class="flight-label bright">${flight.label}</span>
          <span class="flight-id xsmall dimmed">${flight.flight_id}</span>
        </div>
        <div class="flight-details small">
          <span class="flight-status"><i class="fa ${icon}"></i> ${statusText} ${timeDisplay}</span>
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
