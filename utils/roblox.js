const noblox = require("noblox.js");
const axios = require("axios");

const {
    ROBLOX_GROUP_ID
} = require("../config/config");



async function loginRoblox() {

    await noblox.setCookie(process.env.ROBLOSECURITY);

    const user = await noblox.getAuthenticatedUser();

    console.log(
        `✅ Roblox eingeloggt als: ${user.name}`
    );

}



async function getRobloxUserId(username) {

    try {

        const userId = await noblox.getIdFromUsername(username);

        return userId;

    } catch {

        return null;

    }

}



async function isInGroup(userId) {

    try {

        const groups =
            await noblox.getGroups(userId);


        return groups.some(
            group =>
                group.Id === ROBLOX_GROUP_ID
        );


    } catch {

        return false;

    }

}



async function getJoinRequest(userId) {

    try {

        const response =
            await noblox.getJoinRequests(
                ROBLOX_GROUP_ID
            );


        const requests =
            response.data || response;


        return requests.find(
            request =>
                request.requester.userId === userId
        );


    } catch (error) {

        console.error(
            "Join request error:",
            error.message
        );

        return null;

    }

}



async function acceptJoinRequest(request) {

    await noblox.handleJoinRequest(
        ROBLOX_GROUP_ID,
        request.requester.userId,
        true
    );

}

async function getAccountAge(userId) {

    try {

        const info =
            await noblox.getPlayerInfo(userId);


        const created =
            new Date(info.joinDate);


        const age =
            Math.floor(
                (Date.now() - created.getTime())
                /
                (1000 * 60 * 60 * 24)
            );


        return age;


    } catch (error) {

        console.error(
            "Account age error:",
            error.message
        );

        return null;

    }

}


async function getAccountAge(userId) {

    try {

        const created =
            await noblox.getPlayerInfo(userId);


        const createdDate =
            new Date(created.joinDate);


        const age =
            Math.floor(
                (Date.now() - createdDate)
                /
                (1000 * 60 * 60 * 24)
            );


        return age;


    } catch {

        return null;

    }

}

async function getPresence(userId) {

    try {

        const response = await axios.post(
            "https://presence.roblox.com/v1/presence/users",
            {
                userIds: [userId]
            }
        );

        return response.data.userPresences[0];

    } catch (err) {

        console.error("Presence Error:", err.message);

        return null;

    }

}

module.exports = {

    loginRoblox,
    getRobloxUserId,
    getJoinRequest,
    acceptJoinRequest,
    getAccountAge,
    getPresence

};