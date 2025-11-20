# MMM-FlightTracker

A MagicMirror2 module to track flights using the Avinor Flight Data API.

This module allows you to track specific flights arriving at or departing from a configured "home airport". It is designed to track friends and family visiting you, or your own trips.

This module was vibe coded.

## Features

*   **Multiple Flight Tracking**: Track multiple flights simultaneously.
*   **Date-Aware**: Flights only appear when they are active on the specified date.
*   **Future Flight Preview**: Displays upcoming flights with date and label.
*   **Smart Status Updates**: Shows real-time status with specific icons (Landed, Departed, Delayed, Cancelled).
*   **Schedule Changes**: Visually indicates time changes with strikethrough on the original time.
*   **Route Display**: Clearly shows if a flight is arriving (Remote -> Home) or departing (Home -> Remote).
*   **Custom Labels**: Assign friendly names like "Mom" or "Dad" to flights.
*   **Free API**: Uses the open Avinor Flight Data API (no API key required).

## Installation

1.  Navigate to your MagicMirror `modules` directory:
    ```bash
    cd ~/MagicMirror/modules
    ```
2.  Clone this repository:
    ```bash
    git clone https://github.com/marviks/MMM-FlightTracker.git
    ```
3.  Navigate to the module directory:
    ```bash
    cd MMM-FlightTracker
    ```
4.  Install dependencies:
    ```bash
    npm install
    ```

## Configuration

Add the module to your `config/config.js` file:

```javascript
{
    module: "MMM-FlightTracker",
    position: "top_right",
    config: {
        homeAirport: "OSL", // Your local airport IATA code (Required)
        updateInterval: 180000, // Update every 3 minutes (Optional, default: 180000)
        flights: [
            {
                flightNumber: "SK4167",
                date: "2023-10-27", // Date of the flight (YYYY-MM-DD)
                label: "Mom Visiting" // Optional label
            },
            {
                flightNumber: "DY612",
                date: "2023-11-05",
                label: "Trip to Bergen"
            }
        ]
    }
}
```

### Configuration Options

| Option | Type | Default | Description |
|---|---|---|---|
| `homeAirport` | String | `"OSL"` | The IATA code of your local airport (e.g., "LHR", "JFK", "OSL"). The module tracks flights to/from this airport. |
| `updateInterval` | Integer | `180000` | How often to fetch data from the API in milliseconds (3 minutes recommended). |
| `flights` | Array | `[]` | List of flight objects to track. |

### Flight Object

| Option | Type | Description |
|---|---|---|
| `flightNumber` | String | The flight number (e.g., "SK123"). |
| `date` | String | The date of the flight in `YYYY-MM-DD` format. The flight will only be shown on this date. |
| `label` | String | (Optional) A friendly name to display instead of the flight number. |

## API Note

This module uses the [Avinor Flight Data API](https://partner.avinor.no/en/services/flight-data/). It is free to use but requires responsible polling (cached, not too frequent). The default update interval respects these guidelines.
