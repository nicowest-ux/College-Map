# Campus Navigator v5 Wayfinding Build

This build replaces the earlier prototype routing model with a floor-zone model based on the actual 2560×1527 campus map.

## Key changes
- Uses the real source image dimensions: 2560×1527.
- Catalogues 200+ visible room identifiers across Ribble, Calder, Medlock, Alt, Brock, Holland, Wyre and Sports Hall.
- Never displays an unverified room pin as if it were accurate. Unverified rooms zoom to the correct building/floor diagram.
- Includes verified seed positions on Brock Ground Floor (including B007 Tech Support and B014 Exams) and a number of Ribble Second Floor positions.
- Built-in Map Studio lets staff calibrate any room by selecting it and tapping its exact location on the floor plan.
- Calibration data can be exported/imported as JSON, allowing one verified calibration file to be distributed to every device.
- Navigation Assistant understands commands such as “I’m at B007” and “take me to B014”.
- B007 → B014 has hand-authored directions based on the confirmed staff/student route through the quad, lockers and Refill/print room.
- Assisted Follow Me mode uses device orientation and motion after the user calibrates their starting location. It is intentionally labelled assisted tracking because consumer phone GPS cannot provide trustworthy room-level indoor positioning without additional building infrastructure.
- Route display no longer pretends the presentation sheet is one continuous physical space.

## Important positioning note
True automatic indoor blue-dot positioning normally requires infrastructure such as BLE beacons, Wi-Fi RTT/fingerprinting, UWB, QR/NFC checkpoints, or another surveyed indoor-positioning service. This build provides the strongest zero-infrastructure web approach: known-point calibration + heading/motion dead reckoning + confidence decay + fast re-calibration.
