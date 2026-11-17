const {
    isOfficer,
    isHiCOM
} = require("./permissions");


async function processEvent(hostedUsers, supervisedUsers, attendeeUsers, guild) {

    const hostedEvents = new Set();
    const attendedEvents = new Set();


    // Hosted by
    for (const userId of hostedUsers) {
        hostedEvents.add(userId);
    }


    // Supervised by
    for (const userId of supervisedUsers) {
        hostedEvents.add(userId);
    }


    // Attendees
    for (const userId of attendeeUsers) {

        // Wenn bereits Host/Supervisor → nicht doppelt zählen
        if (hostedEvents.has(userId)) {
            continue;
        }


        // Benutzer aus dem Server holen
        const member = await guild.members.fetch(userId)
            .catch(() => null);


        if (!member) {
            continue;
        }


        const isManagedOfficer =
            isOfficer(userId) || isHiCOM(userId);


        if (isManagedOfficer) {
            hostedEvents.add(userId);
        } else {
            attendedEvents.add(userId);
        }
    }


    return {
        hostedEvents: [...hostedEvents],
        attendedEvents: [...attendedEvents]
    };
}


module.exports = {
    processEvent
};
