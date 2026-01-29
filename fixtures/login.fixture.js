const { loginToSite } = require('../helpers/devlogin.auth');

const loginFixtures = {
  loggedInPage: async ({ page }, use) => {
    await loginToSite(page);
    await use(page);
  },
};

module.exports = { loginFixtures };

