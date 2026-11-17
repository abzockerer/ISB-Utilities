const {
    isOfficer,
    isHiCOM
} = require("./officerManagement");

const SUPERUSER_ID = "1221391460860035093";

function isSuperuser(userId) {
    return userId === SUPERUSER_ID;
}

function hasOfficerPermission(userId) {
    return isSuperuser(userId) || isOfficer(userId) || isHiCOM(userId);
}

function hasHiCOMPermission(userId) {
    return isSuperuser(userId) || isHiCOM(userId);
}

function hasManagementPermission(userId) {
    return hasHiCOMPermission(userId);
}

module.exports = {
    SUPERUSER_ID,
    isSuperuser,
    isOfficer,
    isHiCOM,
    hasOfficerPermission,
    hasHiCOMPermission,
    hasManagementPermission
};
